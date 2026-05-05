const { Client, GatewayIntentBits } = require('discord.js');
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

const GUILD_ID = 'ID_DE_TON_SERVEUR'; // Remets ton ID
const VOICE_CHANNEL_ID = 'ID_DE_TON_SALON_VOCAL'; // Remets ton ID

// Variable pour activer/désactiver les réponses auto en direct
let autoResponsesEnabled = true;

// Système anti-crash
process.on('unhandledRejection', (reason, p) => console.log(' [Anti-Crash] Erreur ignorée : ', reason));
process.on('uncaughtException', (err, origin) => console.log(' [Anti-Crash] Exception ignorée : ', err));

const reponsesAuto = {
    "salut": "Salut à toi l'aventurier !",
    "bonjour": "Bonjour ! J'espère que tu passes une bonne journée.",
    "coucou": "Coucou ! 👋",
    "ping": "Pong ! 🏓"
    // (Ajoute tes autres réponses "safe" ici)
};

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    
    // Si l'option a été désactivée depuis le dashboard, on ne répond pas
    if (!autoResponsesEnabled) return;

    const texte = message.content.toLowerCase();
    if (reponsesAuto[texte]) {
        message.reply(reponsesAuto[texte]);
    }
});

client.on('ready', () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);
    rejoindreVocal(); // Appelle la fonction pour rejoindre au démarrage
});

function rejoindreVocal() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        joinVoiceChannel({
            channelId: VOICE_CHANNEL_ID,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
        console.log('🎧 Vocal rejoint !');
    }
}

// ==========================================
// 🌐 SERVEUR WEB & API (DASHBOARD)
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

// Permet de lire le JSON envoyé par le dashboard
app.use(express.json());

// Sert le dossier "public" qui contient ton index.html
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTES API POUR LE DASHBOARD ---

// 1. Rejoindre le vocal
app.get('/api/voice/join', (req, res) => {
    rejoindreVocal();
    res.json({ message: "Le bot a rejoint le vocal ! 🎧" });
});

// 2. Quitter le vocal
app.get('/api/voice/leave', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) {
        connection.destroy();
        res.json({ message: "Le bot a quitté le vocal ! 👋" });
    } else {
        res.json({ message: "Le bot n'est pas dans le vocal." });
    }
});

// 3. Activer/Désactiver les réponses automatiques
app.get('/api/auto/toggle', (req, res) => {
    autoResponsesEnabled = !autoResponsesEnabled;
    const etat = autoResponsesEnabled ? "Activées" : "Désactivées";
    res.json({ message: `Réponses auto : ${etat} 🤖` });
});

// 4. Envoyer un message personnalisé
app.post('/api/send', (req, res) => {
    const texte = req.body.message;
    const guild = client.guilds.cache.get(GUILD_ID);
    
    if (guild && texte) {
        // Cherche le premier salon textuel disponible pour parler
        const channel = guild.channels.cache.find(c => c.isTextBased());
        if (channel) {
            channel.send(texte);
            return res.json({ message: "Message envoyé avec succès ! 💬" });
        }
    }
    res.json({ message: "Erreur lors de l'envoi du message." });
});

app.listen(port, () => {
    console.log(`🌐 API Web prête sur le port ${port}`);
});

client.login(process.env.TOKEN);
