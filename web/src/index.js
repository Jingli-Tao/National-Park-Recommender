
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const port = process.env.port || 8080;

(async () => {
    const app = express();
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, 'public')));
    app.listen(port, () => console.log(`Server listening on ${port}...`));
})().catch(console.error);
