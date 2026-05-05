const express = require('express');
const app = express();

app.all('/', (req, res) => {
    res.send('Mon bot est en ligne et écoute !');
});

function keepAlive() {
    // Le port 3000 est un standard pour les hébergeurs
    app.listen(3000, () => {
        console.log("Serveur web prêt pour le 24/7.");
    });
}

module.exports = keepAlive;