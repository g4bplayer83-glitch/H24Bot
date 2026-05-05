const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const keepAlive = require('./keep_alive.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Obligatoire pour le vocal
    ]
});

// Remplace ces IDs par ceux de ton serveur
// (Sur Discord : Paramètres > Avancés > Mode Développeur activé, puis clic droit sur le salon/serveur pour copier l'ID)
const GUILD_ID = 'ID_DE_TON_SERVEUR';
const VOICE_CHANNEL_ID = 'ID_DE_TON_SALON_VOCAL';

client.on('ready', () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);

    // Le bot rejoint le vocal dès qu'il s'allume
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        joinVoiceChannel({
            channelId: VOICE_CHANNEL_ID,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
        console.log('🎧 Connecté au salon vocal avec succès !');
    }
});

// --- FONCTIONNALITÉS BONUS ---
client.on('messageCreate', (message) => {
    // On ignore les autres bots
    if (message.author.bot) return;

    // Commande 1 : Un ping basique
    if (message.content === '!ping') {
        message.reply('Pong ! 🏓 Je suis bien là dans le vocal.');
    }

    // Commande 2 : Une petite blague ou interaction
    if (message.content === '!café') {
        message.channel.send(`Tiens, un bon café pour toi ${message.author} ☕`);
    }
});

// Lance le serveur web anti-veille
keepAlive();

// Connecte le bot à Discord
client.login(process.env.TOKEN);