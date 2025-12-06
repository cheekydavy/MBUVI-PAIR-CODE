const express = require('express');
const app = express();
__path = process.cwd()
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let server = require('./qr'),
    code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;
app.use('/qr', server);
app.use('/code', code);
app.use('/pair',async (req, res, next) => {
res.sendFile(__path + '/pair.html')
})
app.use('/',async (req, res, next) => {
res.sendFile(__path + '/main.html')
})
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(PORT, () => {
    console.log(`
Don't for get to give a star

 Server running on http://localhost:` + PORT)
})

// --- brief process lifecycle logging for debugging container exits ---
process.on('beforeExit', (code) => console.log('process beforeExit', { code }));
process.on('exit', (code) => console.log('process exit', { code }));
process.on('uncaughtException', (err) => console.error('uncaughtException', err && err.stack ? err.stack : err));
process.on('unhandledRejection', (reason) => console.error('unhandledRejection', reason));
process.on('SIGTERM', () => { console.log('SIGTERM received'); process.exit(0); });

module.exports = app