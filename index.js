const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates ]
});

const GUILD_ID = 'TON_VRAI_ID_DE_SERVEUR'; 
const VOICE_CHANNEL_ID = 'TON_VRAI_ID_DE_SALON_VOCAL';

let autoResponsesEnabled = true;
let sseClients = [];
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
    // Création des commandes Slash
    try {
        await client.application.commands.set(slashCommands, GUILD_ID);
        console.log('✅ Les 10 commandes Slash ont été créées !');
    } catch (e) { console.error("Erreur commandes Slash :", e); }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') await interaction.reply(`🏓 Pong! Latence: ${client.ws.ping}ms`);
    if (interaction.commandName === 'say') await interaction.reply(interaction.options.getString('texte'));
    if (interaction.commandName === 'pileouface') await interaction.reply(Math.random() < 0.5 ? '🪙 Pile !' : '🪙 Face !');
    if (interaction.commandName === 'des') await interaction.reply(`🎲 Tu as fait un ${Math.floor(Math.random() * 6) + 1} !`);
    if (interaction.commandName === 'blague') await interaction.reply("Que fait une fraise sur un cheval ? ... Tagada tagada ! 🍓");
    if (interaction.commandName === 'serveur') await interaction.reply(`Serveur: **${interaction.guild.name}**\nMembres: ${interaction.guild.memberCount}`);
    if (interaction.commandName === 'botinfo') await interaction.reply("Je suis un bot contrôlé par une interface web ultra pro ! 😎");
    if (interaction.commandName === 'help') await interaction.reply("Voici mes commandes : /ping, /say, /avatar, /serveur, /pileouface, /des, /blague, /clear, /botinfo");
    if (interaction.commandName === 'avatar') {
        const user = interaction.options.getUser('membre') || interaction.user;
        await interaction.reply(user.displayAvatarURL({ dynamic: true, size: 512 }));
    }
    if (interaction.commandName === 'clear') {
        if (!interaction.member.permissions.has('ManageMessages')) return interaction.reply("Tu n'as pas la permission !");
        const nb = interaction.options.getInteger('nombre');
        await interaction.channel.bulkDelete(nb, true);
        await interaction.reply({ content: `${nb} messages supprimés ! 🧹`, ephemeral: true });
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
    "xptdr": "Attention à ne pas t'étouffer !",
    "gg": "Bien joué ! Beau travail.",
    "brb": "Reviens vite !",
    "afk": "Bonne pause, on garde ta place au chaud.",
    "re": "Re-bonjour ! De retour parmi nous ?",
    "nuit": "Bonne nuit, fais de beaux rêves ! 🌙",
    "dodo": "Allez, file au lit ! 🛏️",
    "a+": "À plus tard dans le bus !",
    "bye": "Bye bye ! 👋",
    "au revoir": "À la prochaine !",
    "adieu": "Oh non, dis plutôt au revoir ! 😢",
    "oui": "C'est un grand oui !",
    "non": "C'est ton choix, je respecte.",
    "peut etre": "Le suspense est insoutenable...",
    "ok": "D'accord, c'est noté. 📝",
    "dac": "Ça marche pour moi.",
    "test": "Test reçu 5/5, je fonctionne parfaitement ! 📡",
    "ping": "Pong ! 🏓",
    "pong": "Ping ! (C'est dans ce sens qu'on joue, non ?)",
    "aide": "Si tu as besoin d'aide, appelle un admin !",
    "help": "Mayday, mayday ! On a besoin d'aide ici ! 🆘",
    "wtf": "Je n'ai pas les mots non plus... 😶",
    "omg": "Oh My God comme ils disent !",
    "chaud": "Il fait chaud ici, ou c'est juste mon processeur ?",
    "froid": "Mets un pull, on n'est pas sur la plage !",
    "faim": "On se fait une pizza virtuelle ? 🍕",
    "soif": "Un petit café ? ☕",
    "manger": "Bon appétit ! 🍔",
    "boire": "Santé ! 🍻",
    "jouer": "Qui est chaud pour une petite game ?",
    "game": "Tryhard activé. 🎮",
    "serveur": "C'est le meilleur serveur ici, pas de débat.",
    "discord": "Discord c'est bien, mais ce serveur c'est mieux.",
    "musique": "On met un peu de son ? 🎵",
    "son": "Monte le volume !",
    "admin": "Chut, l'admin nous écoute peut-être... 👑",
    "nigger": " va te faire enculer sale raciste à la merde ",
    "safone": " c'est qui cette merde déjà, ah oui c'est le suceur de vs altered ",
    "indie": " c'est lui, mais qui, c'est lui ",
    "shane": " respecter le goat, enfin pas trop non plus "
    // Ajoute tes autres mots ici, avec une virgule à la fin de chaque ligne (sauf la dernière)
};

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return; // Ignore les autres bots
    if (!autoResponsesEnabled) return; // Vérifie si le bouton du site web a désactivé l'option

    const texte = message.content.toLowerCase();
    if (reponsesAuto[texte]) {
        await message.reply(reponsesAuto[texte]);
    }
});

// ==========================================
// 🌐 SERVEUR WEB, UPLOAD & SOUNDBOARD
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration pour recevoir les MP3
const storage = multer.diskStorage({
    destination: './sounds/',
    filename: (req, file, cb) => cb(null, file.originalname.replace(/ /g, '_'))
});
const upload = multer({ storage: storage });

app.post('/api/upload-sound', upload.single('soundFile'), (req, res) => {
    res.json({ message: "Son ajouté avec succès ! 🎵" });
});

app.get('/api/sounds', (req, res) => {
    if (!fs.existsSync('./sounds')) fs.mkdirSync('./sounds');
    const files = fs.readdirSync('./sounds').filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'));
    res.json(files);
});

app.post('/api/play-sound', async (req, res) => {
    const { soundName, volume } = req.body;
    const connection = getVoiceConnection(GUILD_ID);
    
    if (connection) {
        const resource = createAudioResource(`./sounds/${soundName}`, { inlineVolume: true });
        resource.volume.setVolume(volume / 100); // Règle le volume
        
        audioPlayer.play(resource);
        connection.subscribe(audioPlayer);
        res.json({ message: `Lecture de ${soundName} (Vol: ${volume}%) 🔊` });
    } else {
        res.status(400).json({ message: "Le bot n'est pas dans le vocal !" });
    }
});

app.get('/api/voice/join', async (req, res) => {
    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
        res.json({ message: "Vocal rejoint ! 🎧" });
    } catch(e) { res.status(500).json({ message: "Erreur connexion vocale." }); }
});

app.get('/api/voice/leave', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) { connection.destroy(); res.json({ message: "Vocal quitté ! 👋" }); } 
    else { res.json({ message: "Le bot n'est pas dans le vocal." }); }
});

// -- API Système (Pour activer/désactiver les réponses auto) --
app.get('/api/auto/toggle', (req, res) => {
    autoResponsesEnabled = !autoResponsesEnabled;
    res.json({ message: `Réponses auto : ${autoResponsesEnabled ? "Activées" : "Désactivées"} 🤖` });
});

app.listen(port, () => console.log(`🌐 API Web prête sur le port ${port}`));
client.login(process.env.TOKEN);
