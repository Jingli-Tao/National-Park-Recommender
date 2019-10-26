# Starting the Web Server

* Download the latest [Node LTS (12.x.x)](https://nodejs.org/en/download/)
* Installing dependencies
```bash
npm install
```
* Starting the server
```bash
npm start
```

This will start the server on port *8080*

If you wish to change the port, update the port environment variable
```bash
port=3000 npm start
```

To allow the server to restart on change:
```bash
npm run dev
```
Any time changes are made to the javascript source code, the server will auto-restart itself.
