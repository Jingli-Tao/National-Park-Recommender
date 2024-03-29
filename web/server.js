
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

const port = process.env.PORT || 8080; 

// File path to the database files (csv, tsv)
const dataFilesPath = path.join(__dirname, '../data');

(async () => {
    const app = express();
    app.use(bodyParser.json());
    /**
     * This tells the web server that static content lives in the /public directory
     */
    app.use(express.static(path.join(__dirname, 'public')));
    // Database files

    app.get('/datafiles', wrapExpress(async (req, res) => {
        const fileName = req.query.filename;
        const filePath = path.join(dataFilesPath, fileName);
        console.log('Fetching ', filePath);
        if (!await fileExists(filePath)) {
            return res.sendStatus(404);
        }
        const fileData = await fsPromises.readFile(filePath);
        
        switch (path.extname(fileName)) {
            case '.csv': {
                res.header('Content-Type', 'text/csv');
                break;
            }
            case '.tsv': {
                res.header('Content-Type', 'text/tab-separated-values');
                break;
            }
        }
        return res.status(200).send(fileData).end();
    }));

    app.listen(port, () => console.log(`Server listening on ${port}...`));
})().catch(console.error);

/**
 * Express doesn't natively support async methods as its handlers. 
 * This simply wraps in a try/catch to properly surface errors
 */
function wrapExpress(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res)
        } catch (e) {
            return next(e);
        }
    }
}

async function fileExists(filePath) {
    return new Promise((resolve) => fs.exists(filePath, exists => resolve(exists)));
}