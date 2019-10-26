
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite = require('sqlite3');

const port = process.env.port || 8080;

// Sqlite API Doc https://github.com/mapbox/node-sqlite3/wiki/API

(async () => {
    const app = express();
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // todo: Update this once we have a real database
    const db = new sqlite.Database(':memory:');
    db.on('open', () => console.log('Database successfully opened.'));

    app.get('/db', (req, res) => {
        const data = {}; // todo: Call data from database with input query params.
        return res.status(200).json(data).end();
    });

    app.listen(port, () => console.log(`Server listening on ${port}...`));
})().catch(console.error);
