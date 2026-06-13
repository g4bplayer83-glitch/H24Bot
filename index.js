const { Client, GatewayIntentBits, Events, REST, Routes, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

// (Plus besoin de googleTTS capricieux, on le fait à la main !)

if (!fs.existsSync('./sounds')) { fs.mkdirSync('./sounds'); }

const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates ]
});

const GUILD_ID = '1407482110268149820'; 
const VOICE_CHANNEL_ID = '1439682653895917588';

let autoResponsesEnabled = true;
let audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

// ==========================================
// 🛡️ SYSTÈME ANTI-INTRUSION (ADMIN) & SSE
// ==========================================
const bannedIPs = new Set();
const activeUsers = new Map();
let sseClients = []; 

// ==========================================
// 🎧 MOTEUR VOCAL & ANTI-KICK
// ==========================================
async function rejoindreVocal() {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        if (!channel) return console.log("❌ Salon vocal introuvable.");

        const connection = joinVoiceChannel({ channelId: channel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, selfDeaf: false, selfMute: false });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log("⚠️ Kick ou Déconnexion détectée !");
            try {
                await Promise.race([ entersState(connection, VoiceConnectionStatus.Signalling, 1500), entersState(connection, VoiceConnectionStatus.Connecting, 1500) ]);
            } catch (error) {
                console.log("🔄 Retour forcé dans le salon vocal en cours...");
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) { try { connection.destroy(); } catch(e) {} }
                setTimeout(rejoindreVocal, 1000); 
            }
        });
        console.log("🎧 Installé dans le vocal (Protection Anti-Kick activée) !");
    } catch(e) { setTimeout(rejoindreVocal, 5000); }
}

// ==========================================
// 🎭 BASE DE DONNÉES FUN & COMMANDES
// ==========================================
const blagues = [
    "Que fait une fraise sur un cheval ? ... Tagada tagada ! 🍓",
    "C'est l'histoire d'un pingouin qui respire par les fesses. Un jour il s'assoit et il meurt. 🐧",
    "Que fait une vache avec une radio ? De la meuh-sique ! 🐄",
    "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau. 🤿",
    "Que dit un oignon quand il se cogne ? Aïe ! 🧅"
];

const slashCommands = [
    { name: 'ping', description: 'Répond avec Pong !' },
    { name: 'say', description: 'Fait parler le bot', options: [{ name: 'texte', type: 3, description: 'Texte', required: true }] },
    { name: 'avatar', description: 'Affiche l\'avatar', options: [{ name: 'membre', type: 6, description: 'Personne', required: false }] },
    { name: 'serveur', description: 'Infos du serveur' },
    { name: 'pileouface', description: 'Joue à pile ou face' },
    { name: 'des', description: 'Lance un dé (1-6)' },
    { name: 'blague', description: 'Blague au hasard' },
    { name: 'clear', description: 'Supprime des messages', options: [{ name: 'nombre', type: 4, description: 'Combien ?', required: true }] },
    { name: '8ball', description: 'Pose une question', options: [{ name: 'question', type: 3, description: 'Ta question', required: true }] },
    { name: 'shifumi', description: 'Pierre, Papier, Ciseaux', options: [{ name: 'choix', type: 3, description: 'Choix', required: true, choices: [{name: 'Pierre', value: 'pierre'}, {name: 'Papier', value: 'papier'}, {name: 'Ciseaux', value: 'ciseaux'}] }] }
];

client.once(Events.ClientReady, async () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);
    try { await client.application.commands.set(slashCommands, GUILD_ID); } catch (e) {}
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
        if (cmd === 'shifumi') {
            const choixBot = ['pierre', 'papier', 'ciseaux'][Math.floor(Math.random() * 3)];
            const choixUser = interaction.options.getString('choix');
            let res = "Égalité !";
            if ((choixUser==='pierre'&&choixBot==='ciseaux') || (choixUser==='papier'&&choixBot==='pierre') || (choixUser==='ciseaux'&&choixBot==='papier')) res = "Tu as gagné ! 🎉";
            else if (choixUser !== choixBot) res = "J'ai gagné ! 🤖";
            await interaction.reply(`Moi : **${choixBot}** | Toi : **${choixUser}**\n👉 ${res}`);
        }
    } catch (err) {}
});

const reponsesAuto = { "salut": "Salut à toi !", "bonjour": "Bonjour !", "ping": "Pong ! 🏓", "quoi": "Feur ! 💇‍♂️", "hein": "Deux ! ✌️" };

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
    if (bannedIPs.has(ip)) return res.status(403).send("<body style='background:#111214; color:white; display:flex; justify-content:center; align-items:center; height:100vh;'><h1>🛑 Accès Refusé</h1></body>");
    activeUsers.set(ip, Date.now()); 
    next();
});

app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive');
    sseClients.push(res); req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
});

app.post('/api/notify-login', (req, res) => {
    const { role } = req.body; const date = new Date().toLocaleTimeString('fr-FR');
    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ message: `Nouvelle connexion (${role}) à ${date}` })}\n\n`));
    res.sendStatus(200);
});

const storage = multer.diskStorage({ destination: './sounds/', filename: (req, file, cb) => cb(null, file.originalname.replace(/ /g, '_')) });
const upload = multer({ storage: storage });

app.get('/api/admin/users', (req, res) => {
    const now = Date.now(); activeUsers.forEach((time, ip) => { if (now - time > 10 * 60 * 1000) activeUsers.delete(ip); });
    res.json(Array.from(activeUsers.keys()));
});
app.post('/api/admin/ban', (req, res) => { const { ip } = req.body; if (ip) { bannedIPs.add(ip); activeUsers.delete(ip); res.json({ message: `IP BANNIE ! 🔨` }); } });
app.post('/api/admin/kick', (req, res) => { const { ip } = req.body; if (ip) { activeUsers.delete(ip); res.json({ message: `IP KICKÉE ! 👢` }); } });

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

app.get('/api/messages/:channelId', async (req, res) => {
    try {
        const channel = await client.channels.fetch(req.params.channelId);
        if (!channel || !channel.isTextBased()) return res.json([]);
        const msgs = await channel.messages.fetch({ limit: 50 });
        const formatted = msgs.map(m => ({
            author: m.author.username, avatar: m.author.displayAvatarURL({ dynamic: true, size: 64 }),
            content: m.content || "[Média/Fichier]", bot: m.author.bot, time: m.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        })).reverse(); 
        res.json(formatted);
    } catch (e) { res.json([]); }
});

app.get('/api/voice/members', async (req, res) => {
    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        if (!channel || !channel.isVoiceBased()) return res.json([]);
        const members = channel.members.map(m => ({ name: m.user.username, avatar: m.user.displayAvatarURL({ dynamic: true, size: 64 }), bot: m.user.bot }));
        res.json(members);
    } catch (e) { res.json([]); }
});

// --- API TTS : RÉPARÉE À LA MAIN 🛠️ ---
app.post('/api/tts', async (req, res) => {
    const { text, lang } = req.body;
    const connection = getVoiceConnection(GUILD_ID);
    if (!connection) return res.status(400).json({ message: "Bot pas en vocal ! ❌" });
    if (!text) return res.status(400).json({ message: "Texte vide ❌" });
    
    try {
        // Sécurité maximale de 200 caractères
        const safeText = text.substring(0, 199); 
        
        // La technique secrète : on appelle directement Google Translate
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${lang || 'fr'}&client=tw-ob`;
        
        const resource = createAudioResource(url, { inlineVolume: true });
        resource.volume.setVolume(1);
        audioPlayer.play(resource);
        connection.subscribe(audioPlayer);
        
        res.json({ message: `🗣️ Je dis : "${safeText}"` });
    } catch (e) {
        console.error("Erreur TTS:", e);
        res.status(500).json({ message: "Erreur serveur ❌" });
    }
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
app.get('/api/voice/join', (req, res) => { rejoindreVocal(); res.json({ message: "Connexion ! 🎧" }); });
app.get('/api/voice/leave', (req, res) => { const conn = getVoiceConnection(GUILD_ID); if (conn) { conn.removeAllListeners(); conn.destroy(); res.json({ message: "Vocal quitté ! 👋" }); } else { res.json({ message: "Pas en vocal." }); } });
app.get('/api/voice/mute', (req, res) => { const conn = getVoiceConnection(GUILD_ID); if(conn) { conn.joinConfig.selfMute = true; conn.rejoin(); res.json({ message: "Bot Muet 🤫" }); }});
app.get('/api/voice/unmute', (req, res) => { const conn = getVoiceConnection(GUILD_ID); if(conn) { conn.joinConfig.selfMute = false; conn.rejoin(); res.json({ message: "Micro allumé 🎤" }); }});
app.get('/api/auto/toggle', (req, res) => { autoResponsesEnabled = !autoResponsesEnabled; res.json({ message: `Réponses auto : ${autoResponsesEnabled ? "ACTIVÉES ✅" : "DÉSACTIVÉES ❌"}` }); });

// --- GESTION DES IMAGES DANS LES MESSAGES ---
app.post('/api/send-message', async (req, res) => {
    const { channelId, style, title, description, color, imageUrl } = req.body;
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = guild.channels.cache.get(channelId);
        
        if(channel && channel.isTextBased()) {
            if (style === 'texte') { 
                const contenuFinal = imageUrl ? description + `\n${imageUrl}` : description;
                await channel.send(contenuFinal); 
            } 
            else {
                const embed = new EmbedBuilder().setDescription(description).setTimestamp();
                if (imageUrl) embed.setImage(imageUrl); 
                
                if (style === 'succes') { embed.setTitle("✅ " + (title || "Succès")).setColor("#23a559"); } 
                else if (style === 'alerte') { embed.setTitle("⚠️ " + (title || "Alerte")).setColor("#da373c"); } 
                else { embed.setTitle(title || "Annonce").setColor(color || "#5865F2"); }
                
                await channel.send({ embeds: [embed] });
            }
            res.json({ message: `Message envoyé ! ✨` });
        } else res.status(400).json({ message: "Salon introuvable." });
    } catch (e) { res.status(500).json({ message: "Erreur d'envoi." }); }
});

app.listen(port, () => console.log(`🌐 API Web prête sur le port ${port}`));
client.login(process.env.TOKEN);