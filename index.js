const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

// Sécurité : on crée le dossier sounds s'il n'existe pas pour éviter les crashs d'upload
if (!fs.existsSync('./sounds')) {
    fs.mkdirSync('./sounds');
}

const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates ]
});

const GUILD_ID = '1407482110268149820'; 
const VOICE_CHANNEL_ID = '1439682653895917588';

let autoResponsesEnabled = true;
let audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

// ==========================================
// 🚀 10 COMMANDES SLASH
// ==========================================
const slashCommands = [
    { name: 'ping', description: 'Répond avec Pong et la latence !' },
    { name: 'say', description: 'Fait parler le bot', options: [{ name: 'texte', type: 3, description: 'Ce que le bot doit dire', required: true }] },
    { name: 'avatar', description: 'Affiche ton avatar ou celui de quelqu\'un', options: [{ name: 'membre', type: 6, description: 'La personne', required: false }] },
    { name: 'serveur', description: 'Affiche les infos du serveur' },
    { name: 'pileouface', description: 'Joue à pile ou face' },
    { name: 'des', description: 'Lance un dé (1-6)' },
    { name: 'blague', description: 'Raconte une blague très nulle' },
    { name: 'help', description: 'Affiche l\'aide du bot' },
    { name: 'clear', description: 'Supprime des messages (Admin)', options: [{ name: 'nombre', type: 4, description: 'Nombre de messages', required: true }] },
    { name: 'botinfo', description: 'Affiche les infos du bot' }
];

client.once(Events.ClientReady, async () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);
    try {
        await client.application.commands.set(slashCommands, GUILD_ID);
        console.log('✅ Les 10 commandes Slash sont prêtes !');
    } catch (e) { console.error("Erreur commandes Slash :", e); }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    try {
        if (interaction.commandName === 'ping') await interaction.reply(`🏓 Pong! Latence: ${client.ws.ping}ms`);
        if (interaction.commandName === 'say') await interaction.reply(interaction.options.getString('texte'));
        if (interaction.commandName === 'pileouface') await interaction.reply(Math.random() < 0.5 ? '🪙 Pile !' : '🪙 Face !');
        if (interaction.commandName === 'des') await interaction.reply(`🎲 Tu as fait un ${Math.floor(Math.random() * 6) + 1} !`);
        if (interaction.commandName === 'blague') await interaction.reply("Que fait une fraise sur un cheval ? ... Tagada tagada ! 🍓");
        if (interaction.commandName === 'serveur') await interaction.reply(`Serveur: **${interaction.guild.name}**\nMembres: ${interaction.guild.memberCount}`);
        if (interaction.commandName === 'botinfo') await interaction.reply("Je suis un bot d'élite contrôlé par une interface web ultra pro ! 😎");
        if (interaction.commandName === 'help') await interaction.reply("Voici mes commandes : /ping, /say, /avatar, /serveur, /pileouface, /des, /blague, /clear, /botinfo");
        if (interaction.commandName === 'avatar') {
            const user = interaction.options.getUser('membre') || interaction.user;
            await interaction.reply(user.displayAvatarURL({ dynamic: true, size: 512 }));
        }
        if (interaction.commandName === 'clear') {
            if (!interaction.member.permissions.has('ManageMessages')) return interaction.reply({content: "Tu n'as pas la permission !", ephemeral: true});
            const nb = interaction.options.getInteger('nombre');
            await interaction.channel.bulkDelete(nb, true);
            await interaction.reply({ content: `${nb} messages supprimés ! 🧹`, ephemeral: true });
        }
    } catch (err) {
        console.error("Erreur lors de la commande :", err);
    }
});

// ==========================================
// 🤖 RÉPONSES AUTOMATIQUES
// ==========================================
const reponsesAuto = {
    "salut": "Salut à toi l'aventurier !",
    "bonjour": "Bonjour ! J'espère que tu passes une bonne journée.",
    "coucou": "Coucou ! 👋",
    "yo": "Yo tout le monde !",
    "wesh": "Wesh bien ou quoi ?",
    "cc": "Cc, tu vas bien ?",
    "hey": "Hey ! Quoi de neuf ?",
    "ça va": "Moi je suis un bot, donc je pète la forme 24/7 ! Et toi ?",
    "cava": "Toujours au top ! 🚀",
    "bot": "Tu parles de moi ? Je suis là !",
    "merci": "De rien, c'est normal ! 😎",
    "mdr": "Haha, c'est drôle ! 😂",
    "lol": "Je rigole mais intérieurement car je n'ai pas de poumons.",
    "ptdr": "On rigole bien ici ! 🤣",
    "gg": "Bien joué ! Beau travail.",
    "nuit": "Bonne nuit, fais de beaux rêves ! 🌙",
    "ping": "Pong ! 🏓",
    "discord": "Discord c'est bien, mais ce serveur c'est mieux.",
    "shane": " respecter le goat, enfin pas trop non plus "
};

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !autoResponsesEnabled) return; 

    const texte = message.content.toLowerCase().trim();
    if (reponsesAuto[texte]) {
        await message.reply(reponsesAuto[texte]);
    }
});

// ==========================================
// 🌐 SERVEUR WEB, UPLOAD & MEDIA PLAYER
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: './sounds/',
    filename: (req, file, cb) => cb(null, file.originalname.replace(/ /g, '_'))
});
const upload = multer({ storage: storage });

app.post('/api/upload-sound', upload.single('soundFile'), (req, res) => {
    res.json({ message: "Son uploadé et sauvegardé ! 🎵" });
});

app.get('/api/sounds', (req, res) => {
    const files = fs.readdirSync('./sounds').filter(f => f.match(/\.(mp3|wav|ogg)$/));
    res.json(files);
});

// -- COMMANDES MEDIA PLAYER --
app.post('/api/play-sound', async (req, res) => {
    const { soundName, volume } = req.body;
    const connection = getVoiceConnection(GUILD_ID);
    
    if (connection) {
        const resource = createAudioResource(`./sounds/${soundName}`, { inlineVolume: true });
        resource.volume.setVolume(volume / 100); 
        audioPlayer.play(resource);
        connection.subscribe(audioPlayer);
        res.json({ message: `Lecture en cours : ${soundName} 🔊` });
    } else {
        res.status(400).json({ message: "Le bot n'est pas dans le vocal ! ❌" });
    }
});

app.get('/api/sound/pause', (req, res) => { audioPlayer.pause(); res.json({message: "Audio en pause ⏸️"}); });
app.get('/api/sound/resume', (req, res) => { audioPlayer.unpause(); res.json({message: "Audio repris ▶️"}); });
app.get('/api/sound/stop', (req, res) => { audioPlayer.stop(); res.json({message: "Audio arrêté ⏹️"}); });

// -- CONTRÔLE VOCAL --
app.get('/api/voice/join', async (req, res) => {
    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator, selfDeaf: false, selfMute: false });
        res.json({ message: "Vocal rejoint ! 🎧" });
    } catch(e) { res.status(500).json({ message: "Erreur de connexion vocale." }); }
});

app.get('/api/voice/leave', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) { connection.destroy(); res.json({ message: "Vocal quitté ! 👋" }); } 
    else { res.json({ message: "Le bot n'est pas dans le vocal." }); }
});

app.get('/api/voice/mute', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if(connection) {
        connection.joinConfig.selfMute = true;
        connection.rejoin();
        res.json({ message: "Bot rendu Muet 🤫" });
    } else res.json({ message: "Pas dans le vocal !" });
});

app.get('/api/voice/unmute', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if(connection) {
        connection.joinConfig.selfMute = false;
        connection.rejoin();
        res.json({ message: "Le bot peut reparler 🎤" });
    } else res.json({ message: "Pas dans le vocal !" });
});

// -- SYSTÈME --
app.get('/api/auto/toggle', (req, res) => {
    autoResponsesEnabled = !autoResponsesEnabled;
    res.json({ message: `Réponses auto : ${autoResponsesEnabled ? "ACTIVÉES ✅" : "DÉSACTIVÉES ❌"}` });
});

app.listen(port, () => console.log(`🌐 API Web prête sur le port ${port}`));
client.login(process.env.TOKEN);
