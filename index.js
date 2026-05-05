const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const GUILD_ID = 'ID_DE_TON_SERVEUR'; // N'oublie pas de remettre tes IDs !
const VOICE_CHANNEL_ID = 'ID_DE_TON_SALON_VOCAL';

// ==========================================
// 🛡️ SYSTÈME ANTI-CRASH (Évite le "!" jaune)
// ==========================================
process.on('unhandledRejection', (reason, p) => {
    console.log(' [Anti-Crash] Erreur ignorée : ', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.log(' [Anti-Crash] Exception ignorée : ', err);
});

// ==========================================
// 🤖 50 RÉPONSES AUTOMATIQUES
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
    "indie": " c'est lui, mais qui, c'est lui "
};

client.on('messageCreate', (message) => {
    if (message.author.bot) return; // Ignore les autres bots

    // Vérifie si le message correspond EXACTEMENT à un mot de la liste (en minuscules)
    const texte = message.content.toLowerCase();
    if (reponsesAuto[texte]) {
        message.reply(reponsesAuto[texte]);
    }
});

client.on('ready', () => {
    console.log(`🚀 Connecté en tant que ${client.user.tag}!`);

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

// ==========================================
// 🌐 INTERFACE WEB (DASHBOARD SUR RENDER)
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

// La page d'accueil de ton Dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Dashboard de mon Bot</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #2c2f33; color: white; text-align: center; padding: 50px; }
                .btn { background-color: #5865F2; color: white; padding: 15px 32px; text-decoration: none; display: inline-block; font-size: 16px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                .btn:hover { background-color: #4752C4; }
                .container { background-color: #23272a; padding: 20px; border-radius: 10px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎛️ Panneau de Contrôle du Bot</h1>
                <p>Le bot est actuellement <strong>En Ligne</strong> et écoute le salon !</p>
                
                <hr style="border-color: #5865F2; margin: 20px 0;">
                
                <h2>Soundboard & Actions</h2>
                <form action="/action/dire-bonjour" method="GET">
                    <button class="btn" type="submit">👋 Dire Bonjour dans le chat</button>
                </form>
                <form action="/action/bruit-test" method="GET">
                    <button class="btn" type="submit">🔊 Jouer un son (A venir)</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// Les actions des boutons de ton Dashboard
app.get('/action/dire-bonjour', (req, res) => {
    // Le bot envoie un message dans le premier salon textuel qu'il trouve
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        const channel = guild.channels.cache.find(c => c.isTextBased());
        if (channel) channel.send("Salut tout le monde ! J'ai été déclenché depuis mon interface web ! 🌐");
    }
    // Redirige vers l'accueil après l'action
    res.redirect('/');
});

app.get('/action/bruit-test', (req, res) => {
    console.log("Le bouton Soundboard a été cliqué ! (Code audio à ajouter ici)");
    // Pour l'instant, on se contente de rediriger pour ne pas faire d'erreur
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`🌐 Dashboard web accessible sur le port ${port}`);
});

client.login(process.env.TOKEN);
