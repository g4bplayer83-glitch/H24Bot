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

const GUILD_ID = 'TON_VRAI_ID_DE_SERVEUR'; // ⚠️ Remplacer ici
const VOICE_CHANNEL_ID = 'TON_VRAI_ID_DE_SALON_VOCAL'; // ⚠️ Remplacer ici

let autoResponsesEnabled = true;

// Système anti-crash
process.on('unhandledRejection', (reason, p) => console.log(' [Anti-Crash] Erreur ignorée : ', reason));
process.on('uncaughtException', (err, origin) => console.log(' [Anti-Crash] Exception ignorée : ', err));

const reponsesAuto = {
    "salut": "Salut à toi l'aventurier !",
    "bonjour": "Bonjour ! J'espère que tu passes une bonne journée.",
    "coucou": "Coucou ! 👋",
    "ping": "Pong ! 🏓"
    // Ajoute tes autres réponses ici
};

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if (!autoResponsesEnabled) return;

    const texte = message.content.toLowerCase();
    if (reponsesAuto[texte]) {
        message.reply(reponsesAuto[texte]);
    }
});

// Correction de l'événement de démarrage
client.once(Events.ClientReady, async () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);
    await rejoindreVocal(); 
});

// Fonction asynchrone pour être sûr de trouver le serveur
async function rejoindreVocal() {
    try {
        // On force le bot à chercher le serveur au lieu d'utiliser le cache
        const guild = await client.guilds.fetch(GUILD_ID);
        if (guild) {
            joinVoiceChannel({
                channelId: VOICE_CHANNEL_ID,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false
            });
            console.log('🎧 Vocal rejoint avec succès !');
        }
    } catch (error) {
        console.log("❌ Impossible de rejoindre le vocal. Les IDs sont-ils corrects ?");
    }
}

// ==========================================
// 🌐 SERVEUR WEB & API (DASHBOARD)
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Dit à express où chercher le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route de secours si le dossier public n'est pas trouvé
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            res.status(404).send("<h2>Erreur d'affichage</h2><p>Le fichier n'a pas été trouvé. As-tu bien créé un dossier nommé exactement <b>public</b> sur ton GitHub, et as-tu mis <b>index.html</b> dedans ?</p>");
        }
    });
});

app.get('/api/voice/join', (req, res) => {
    rejoindreVocal();
    res.json({ message: "Le bot a rejoint le vocal ! 🎧" });
});

app.get('/api/voice/leave', (req, res) => {
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) {
        connection.destroy();
        res.json({ message: "Le bot a quitté le vocal ! 👋" });
    } else {
        res.json({ message: "Le bot n'est pas dans le vocal." });
    }
});

app.get('/api/auto/toggle', (req, res) => {
    autoResponsesEnabled = !autoResponsesEnabled;
    const etat = autoResponsesEnabled ? "Activées" : "Désactivées";
    res.json({ message: `Réponses auto : ${etat} 🤖` });
});

app.post('/api/send', (req, res) => {
    const texte = req.body.message;
    const guild = client.guilds.cache.get(GUILD_ID);
    
    if (guild && texte) {
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
