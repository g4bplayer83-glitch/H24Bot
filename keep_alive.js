const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Mon bot est en ligne et écoute !');
});

function keepAlive() {
    // Render utilise la variable process.env.PORT, il faut lui dire de l'écouter
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Serveur web prêt sur le port ${port}`);
    });
}

module.exports = keepAlive;
