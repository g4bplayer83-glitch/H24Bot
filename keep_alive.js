const express = require('express');
const app = express();

function keepAlive(client) {
    // 1. L'interface Web (Ce que tu verras sur Render)
    app.get('/', (req, res) => {
        // On crée une page HTML simple avec des boutons
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dashboard du Bot</title>
                <meta charset="utf-8">
                <style>
                    body { background: #2c2f33; color: white; font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .btn { background: #5865F2; color: white; border: none; padding: 15px 32px; font-size: 18px; margin: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; }
                    .btn:hover { background: #4752C4; }
                    .box { background: #23272a; padding: 20px; border-radius: 10px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>🎛️ Tableau de bord du Bot</h1>
                    <p>Statut : 🟢 En ligne</p>
                    
                    <h3>Soundboard Vocal</h3>
                    <!-- Ces boutons appellent la route /play/nom_du_son -->
                    <button class="btn" onclick="playSound('corne')">📢 Corne de brume</button>
                    <button class="btn" onclick="playSound('bruh')">🤦‍♂️ Bruh</button>
                </div>

                <script>
                    function playSound(soundName) {
                        fetch('/play/' + soundName)
                            .then(response => console.log('Son demandé : ' + soundName))
                            .catch(error => console.error('Erreur:', error));
                    }
                </script>
            </body>
            </html>
        `);
    });

    // 2. La route API pour dire au bot de jouer le son
    app.get('/play/:sound', (req, res) => {
        const son = req.params.sound;
        if(client) {
            // On envoie un signal au bot
            client.emit('playDashboardSound', son);
        }
        res.send('Son joué');
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`🌐 Dashboard web prêt sur le port ${port}`);
    });
}

module.exports = keepAlive;
