const { Client, GatewayIntentBits, Events, REST, Routes, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

if (!fs.existsSync('./sounds')) { fs.mkdirSync('./sounds'); }

const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates ]
});

const GUILD_ID = '1407482110268149820'; 
const VOICE_CHANNEL_ID = '1439682653895917588';

let autoResponsesEnabled = true;
let audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

// ==========================================
// 🛡️ SYSTÈME ANTI-INTRUSION (ADMIN)
// ==========================================
const bannedIPs = new Set();
const activeUsers = new Map();

// ==========================================
// 🎧 MOTEUR VOCAL & ANTI-KICK H24
// ==========================================
async function rejoindreVocal() {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        
        if (!channel) return console.log("❌ Salon vocal introuvable.");

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        // 🛡️ DÉTECTEUR DE KICK / DÉCONNEXION
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log("⚠️ Le bot a été déconnecté ou kické !");
            try {
                // On attend 5s pour vérifier si c'est juste un petit bug réseau
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (error) {
                // Si ça échoue, c'est un KICK. On force la reconnexion !
                console.log("🔄 Retour forcé dans le salon vocal en cours...");
                connection.destroy(); 
                setTimeout(rejoindreVocal, 2000); 
            }
        });

        console.log("🎧 Installé dans le vocal (Protection Anti-Kick activée) !");
    } catch(e) {
        console.error("Erreur vocale. Nouvel essai dans 10 secondes...");
        setTimeout(rejoindreVocal, 10000);
    }
}

// ==========================================
// 🎭 BASE DE DONNÉES FUN
// ==========================================
const blagues = [
    "Que fait une fraise sur un cheval ? ... Tagada tagada ! 🍓",
    "C'est l'histoire d'un pingouin qui respire par les fesses. Un jour il s'assoit et il meurt. 🐧",
    "Que fait une vache avec une radio ? De la meuh-sique ! 🐄",
    "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau. 🤿",
    "Que dit un oignon quand il se cogne ? Aïe ! 🧅",
    "Comment appelle-t-on un chien qui fait de la magie ? Un labracadabrador. 🐕",
    "Quel est le comble pour un électricien ? De ne pas être au courant. ⚡"
];

// ==========================================
// 🚀 COMMANDES SLASH
// ==========================================
const slashCommands = [
    { name: 'ping', description: 'Répond avec Pong et la latence !' },
    { name: 'say', description: 'Fait parler le bot', options: [{ name: 'texte', type: 3, description: 'Texte à dire', required: true }] },
    { name: 'avatar', description: 'Affiche ton avatar', options: [{ name: 'membre', type: 6, description: 'Personne', required: false }] },
    { name: 'serveur', description: 'Affiche les infos du serveur' },
    { name: 'pileouface', description: 'Joue à pile ou face' },
    { name: 'des', description: 'Lance un dé (1-6)' },
    { name: 'blague', description: 'Raconte une blague au hasard' },
    { name: 'help', description: 'Affiche l\'aide du bot' },
    { name: 'clear', description: 'Supprime des messages', options: [{ name: 'nombre', type: 4, description: 'Combien ?', required: true }] },
    { name: 'botinfo', description: 'Affiche les infos du bot' },
    { name: '8ball', description: 'Pose une question', options: [{ name: 'question', type: 3, description: 'Ta question', required: true }] },
    { name: 'hug', description: 'Fais un câlin à quelqu\'un', options: [{ name: 'membre', type: 6, description: 'À qui ?', required: true }] },
    { name: 'calcul', description: 'Le bot calcule pour toi', options: [{ name: 'operation', type: 3, description: 'Ex: 5+5', required: true }] },
    { name: 'shifumi', description: 'Pierre, Papier, Ciseaux', options: [{ name: 'choix', type: 3, description: 'pierre, papier ou ciseaux', required: true, choices: [{name: 'Pierre', value: 'pierre'}, {name: 'Papier', value: 'papier'}, {name: 'Ciseaux', value: 'ciseaux'}] }] }
];

client.once(Events.ClientReady, async () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);
    try { await client.application.commands.set(slashCommands, GUILD_ID); } catch (e) { console.error(e); }
    
    // Le bot rejoint le vocal automatiquement au démarrage
    rejoindreVocal();
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    try {
        const cmd = interaction.commandName;
        if (cmd === 'ping') await interaction.reply(`🏓 Pong! Latence: ${client.ws.ping}ms`);
        if (cmd === 'say') await interaction.reply(interaction.options.getString('texte'));
        if (cmd === 'pileouface') await interaction.reply(Math.random() < 0.5 ? '🪙 Pile !' : '🪙 Face !');
        if (cmd === 'des') await interaction.reply(`🎲 Tu as fait un ${Math.floor(Math.random() * 6) + 1} !`);
        if (cmd === 'blague') await interaction.reply(blagues[Math.floor(Math.random() * blagues.length)]);
        if (cmd === 'serveur') await interaction.reply(`Serveur: **${interaction.guild.name}**\nMembres: ${interaction.guild.memberCount}`);
        if (cmd === 'botinfo') await interaction.reply("Je suis un bot surpuissant contrôlé par une interface web ultra pro ! 😎");
        if (cmd === 'help') await interaction.reply("Commandes: /ping, /say, /avatar, /serveur, /pileouface, /des, /blague, /clear, /botinfo, /8ball, /hug, /calcul, /shifumi");
        if (cmd === 'avatar') {
            const user = interaction.options.getUser('membre') || interaction.user;
            await interaction.reply(user.displayAvatarURL({ dynamic: true, size: 512 }));
        }
        if (cmd === 'clear') {
            if (!interaction.member.permissions.has('ManageMessages')) return interaction.reply({content: "Permission refusée !", ephemeral: true});
            const nb = interaction.options.getInteger('nombre');
            await interaction.channel.bulkDelete(nb, true);
            await interaction.reply({ content: `${nb} messages supprimés ! 🧹`, ephemeral: true });
        }
        if (cmd === '8ball') {
            const rep = ["Oui absolument.", "Non.", "Peut-être...", "C'est certain.", "Pas la peine d'y penser."];
            await interaction.reply(`🎱 **Question:** ${interaction.options.getString('question')}\n**Réponse:** ${rep[Math.floor(Math.random()*rep.length)]}`);
        }
        if (cmd === 'hug') await interaction.reply(`🤗 <@${interaction.user.id}> fait un gros câlin à <@${interaction.options.getUser('membre').id}> !`);
        if (cmd === 'calcul') {
            try { 
                const result = eval(interaction.options.getString('operation').replace(/[^0-9+\-*/.]/g, ''));
                await interaction.reply(`🧮 Résultat : ${result}`);
            } catch(e) { await interaction.reply("Calcul invalide !"); }
        }
        if (cmd === 'shifumi') {
            const choixBot = ['pierre', 'papier', 'ciseaux'][Math.floor(Math.random() * 3)];
            const choixUser = interaction.options.getString('choix');
            let resultat = "Égalité !";
            if ((choixUser === 'pierre' && choixBot === 'ciseaux') || (choixUser === 'papier' && choixBot === 'pierre') || (choixUser === 'ciseaux' && choixBot === 'papier')) resultat = "Tu as gagné ! 🎉";
            else if (choixUser !== choixBot) resultat = "J'ai gagné ! 🤖";
            await interaction.reply(`Moi : **${choixBot}** | Toi : **${choixUser}**\n👉 ${resultat}`);
        }
    } catch (err) { console.error("Erreur commande :", err); }
});

const reponsesAuto = {
    "salut": "Salut à toi !", "bonjour": "Bonjour !", "ping": "Pong ! 🏓", "bot": "Tu parles de moi ? Je suis là !",
    "mdr": "Haha 😂", "lol": "Je rigole intérieurement.", "ptdr": "🤣", "quoi": "Feur ! 💇‍♂️", "hein": "Deux ! ✌️",
    "shane": "Respecter le goat, enfin pas trop non plus"
};

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !autoResponsesEnabled) return; 
    const texte = message.content.toLowerCase().trim();
    if (reponsesAuto[texte]) await message.reply(reponsesAuto[texte]);
});

// ==========================================
// 🌐 SERVEUR WEB & API
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (bannedIPs.has(ip)) return res.status(403).send("<h1>🛑 Accès Refusé</h1><p>Votre adresse IP a été bannie.</p>");
    activeUsers.set(ip, Date.now()); 
    next();
});

const storage = multer.diskStorage({
    destination: './sounds/', filename: (req, file, cb) => cb(null, file.originalname.replace(/ /g, '_'))
});
const upload = multer({ storage: storage });

app.get('/api/admin/users', (req, res) => {
    const now = Date.now();
    activeUsers.forEach((time, ip) => { if (now - time > 10 * 60 * 1000) activeUsers.delete(ip); });
    res.json(Array.from(activeUsers.keys()));
});

app.post('/api/admin/ban', (req, res) => {
    const ipToBan = req.body.ip;
    if (ipToBan) { bannedIPs.add(ipToBan); activeUsers.delete(ipToBan); res.json({ message: `L'IP ${ipToBan} a été BANNIE ! 🔨` }); } 
    else { res.status(400).json({ message: "Erreur." }); }
});

app.post('/api/admin/kick', (req, res) => {
    const ipToKick = req.body.ip;
    if (ipToKick) { activeUsers.delete(ipToKick); res.json({ message: `L'IP ${ipToKick} a été KICKÉE ! 👢` }); } 
    else { res.status(400).json({ message: "Erreur." }); }
});

app.get('/api/stats', (req, res) => {
    const guild = client.guilds.cache.get(GUILD_ID);
    res.json({ ping: client.ws.ping, members: guild ? guild.memberCount : '?', status: client.user ? 'En ligne' : 'Déconnecté' });
});

app.get('/api/channels', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const textChannels = guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));
        res.json(textChannels);
    } catch (e) { res.json([]); }
});

app.post('/api/upload-sound', upload.single('soundFile'), (req, res) => res.json({ message: "Son uploadé ! 🎵" }));
app.get('/api/sounds', (req, res) => res.json(fs.readdirSync('./sounds').filter(f => f.match(/\.(mp3|wav|ogg)$/))));

app.post('/api/play-sound', async (req, res) => {
    const { soundName, volume } = req.body;
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) {
        const resource = createAudioResource(`./sounds/${soundName}`, { inlineVolume: true });
        resource.volume.setVolume(volume / 100); 
        audioPlayer.play(resource); connection.subscribe(audioPlayer);
        res.json({ message: `Lecture en cours : ${soundName} 🔊` });
    } else { res.status(400).json({ message: "Bot pas en vocal ! ❌" }); }
});

app.get('/api/sound/pause', (req, res) => { audioPlayer.pause(); res.json({message: "Pause ⏸️"}); });
app.get('/api/sound/resume', (req, res) => { audioPlayer.unpause(); res.json({message: "Reprise ▶️"}); });
app.get('/api/sound/stop', (req, res) => { audioPlayer.stop(); res.json({message: "Stop ⏹️"}); });

// --- CONTRÔLE VOCAL ADAPTÉ ---
app.get('/api/voice/join', (req, res) => {
    rejoindreVocal(); 
    res.json({ message: "Ordre de connexion envoyé ! 🎧" });
});

app.get('/api/voice/leave', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) {
        connection.removeAllListeners(); // IMPORTANT: Empêche l'anti-kick de se déclencher
        connection.destroy(); 
        res.json({ message: "Vocal quitté volontairement ! 👋" }); 
    } else { 
        res.json({ message: "Pas dans le vocal." }); 
    }
});

app.get('/api/voice/mute', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if(connection) { connection.joinConfig.selfMute = true; connection.rejoin(); res.json({ message: "Bot Muet 🤫" }); } else res.json({ message: "Pas dans le vocal !" });
});
app.get('/api/voice/unmute', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if(connection) { connection.joinConfig.selfMute = false; connection.rejoin(); res.json({ message: "Micro allumé 🎤" }); } else res.json({ message: "Pas dans le vocal !" });
});
app.get('/api/auto/toggle', (req, res) => {
    autoResponsesEnabled = !autoResponsesEnabled;
    res.json({ message: `Réponses auto : ${autoResponsesEnabled ? "ACTIVÉES ✅" : "DÉSACTIVÉES ❌"}` });
});

app.post('/api/send-message', async (req, res) => {
    const { channelId, style, title, description, color } = req.body;
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = guild.channels.cache.get(channelId);
        
        if(channel && channel.isTextBased()) {
            if (style === 'texte') {
                // Envoi d'un message texte brut normal
                await channel.send(description);
            } else {
                // Création d'un Embed selon le style
                const embed = new EmbedBuilder().setDescription(description).setTimestamp();
                
                if (style === 'succes') {
                    embed.setTitle("✅ " + (title || "Succès")).setColor("#23a559");
                } else if (style === 'alerte') {
                    embed.setTitle("⚠️ " + (title || "Alerte Importante")).setColor("#da373c");
                } else {
                    embed.setTitle(title || "Annonce").setColor(color || "#5865F2");
                }
                
                await channel.send({ embeds: [embed] });
            }
            res.json({ message: `Message envoyé dans #${channel.name} ! ✨` });
        } else res.status(400).json({ message: "Ce salon est introuvable." });
    } catch (e) { res.status(500).json({ message: "Erreur d'envoi." }); }
});

app.listen(port, () => console.log(`🌐 API Web prête sur le port ${port}`));
client.login(process.env.TOKEN);
