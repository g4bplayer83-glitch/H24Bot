const { Client, GatewayIntentBits, Events } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const GUILD_ID = '1407482110268149820'; // ⚠️ Remplacer ici
const VOICE_CHANNEL_ID = '1439682653895917588'; // ⚠️ Remplacer ici

let autoResponsesEnabled = true;
let sseClients = []; // Pour stocker les connexions de l'interface web (Live Chat)

// Système anti-crash
process.on('unhandledRejection', (reason, p) => console.log(' [Anti-Crash] Erreur ignorée : ', reason));
process.on('uncaughtException', (err, origin) => console.log(' [Anti-Crash] Exception : ', err));

const reponsesAuto = {
    "salut": "Salut à toi l'aventurier !",
    "ping": "Pong ! 🏓"
    // (Garde tes autres réponses ici)
};

// ==========================================
// 🤖 ÉVÉNEMENTS DISCORD
// ==========================================

client.once(Events.ClientReady, async () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);
    await rejoindreVocal(); 
});

client.on('messageCreate', (message) => {
    // 1. Envoyer le message au Dashboard (Live Chat)
    if (message.guild && message.guild.id === GUILD_ID) {
        const msgData = JSON.stringify({
            author: message.author.username,
            content: message.content,
            channel: message.channel.name,
            isBot: message.author.bot
        });
        // Envoie à tous les onglets web ouverts
        sseClients.forEach(clientWeb => clientWeb.write(`data: ${msgData}\n\n`));
    }

    // 2. Réponses automatiques
    if (message.author.bot || !autoResponsesEnabled) return;
    const texte = message.content.toLowerCase();
    if (reponsesAuto[texte]) message.reply(reponsesAuto[texte]);
});

async function rejoindreVocal() {
    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        if (!channel || !channel.isVoiceBased()) {
            console.log("❌ Erreur Vocal : Le salon n'existe pas ou n'est pas un salon vocal.");
            return;
        }
        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        console.log('🎧 Vocal rejoint avec succès !');
    } catch (error) {
        console.log("❌ Erreur lors de la connexion vocale. Le bot a-t-il les permissions de voir ce salon ?");
        console.error(error);
    }
}

// ==========================================
// 🌐 SERVEUR WEB & API (DASHBOARD)
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -- API Vocal --
app.get('/api/voice/join', (req, res) => { rejoindreVocal(); res.json({ message: "Tentative de connexion... 🎧" }); });
app.get('/api/voice/leave', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) { connection.destroy(); res.json({ message: "Vocal quitté ! 👋" }); } 
    else { res.json({ message: "Le bot n'est pas dans le vocal." }); }
});

// -- API Système --
app.get('/api/auto/toggle', (req, res) => {
    autoResponsesEnabled = !autoResponsesEnabled;
    res.json({ message: `Réponses auto : ${autoResponsesEnabled ? "Activées" : "Désactivées"} 🤖` });
});

// -- API Chat (Nouveautés) --
// 1. Récupérer la liste des salons texte
app.get('/api/channels', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const textChannels = guild.channels.cache
            .filter(c => c.isTextBased())
            .map(c => ({ id: c.id, name: c.name }));
        res.json(textChannels);
    } catch (e) {
        res.json([]);
    }
});

// 2. Envoyer un message dans un salon précis
app.post('/api/send', async (req, res) => {
    const { message, channelId } = req.body;
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
            await channel.send(message);
            res.json({ message: "Message envoyé ! 💬" });
        } else {
            res.status(400).json({ message: "Salon invalide." });
        }
    } catch (e) {
        res.status(500).json({ message: "Erreur d'envoi." });
    }
});

// 3. Le flux en direct (Live Chat) pour le site web
app.get('/api/chat-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    sseClients.push(res);
    req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res); // Retire le client s'il ferme la page
    });
});

app.listen(port, () => console.log(`🌐 API Web prête sur le port ${port}`));
client.login(process.env.TOKEN);
