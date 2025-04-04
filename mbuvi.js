const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 5000;
const qr = require('./lib/qr');
const pair = require('./lib/pair');
const { loadCommands } = require('./commands');
const { autoview, instantview, alwaysonline } = require('./features');
const { default: Mbuvi_Tech, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');

__path = process.cwd();
app.use('/qr', qr);
app.use('/code', pair);
app.use('/pair', (req, res) => res.sendFile(path.join(__path, 'public/pair.html')));
app.use('/', (req, res) => res.sendFile(path.join(__path, 'public/main.html')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let waClient;
async function startBot(sessionId = null) {
  const authPath = sessionId ? `./temp/${sessionId}` : './temp/mbuvi-md';
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  waClient = Mbuvi_Tech({
    auth: state,
    printQRInTerminal: false,
    logger: require('pino')({ level: 'silent' }),
    browser: ['Chrome (Ubuntu)', 'Chrome', '20.0'],
  });

  waClient.ev.on('creds.update', saveCreds);
  waClient.ev.on('connection.update', async (s) => {
    const { connection, qr } = s;
    if (qr) console.log('QR Generated, hit /qr to see it, you fuck!');
    if (connection === 'open') {
      console.log('MBUVI MD is fucking online, mate!');
      alwaysonline(waClient);
    }
  });

  waClient.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    instantview(msg, waClient);
    if (!msg.message || !msg.message.conversation?.startsWith('.')) return;
    const [cmd, ...args] = msg.message.conversation.slice(1).split(' ');
    if (cmd === 'login' && args.length) {
      const newSessionId = args[0];
      if (fs.existsSync(`./temp/${newSessionId}`)) {
        await waClient.ws.close();
        startBot(newSessionId);
        waClient.sendMessage(msg.key.remoteJid, { text: `Logged in with ${newSessionId}, you slick fuck!` });
      } else {
        waClient.sendMessage(msg.key.remoteJid, { text: 'Invalid session ID, you dumb shit!' });
      }
    } else {
      const commands = loadCommands();
      if (commands[cmd]) commands[cmd](msg, args, waClient);
    }
  });

  waClient.ev.on('status.update', autoview);
  waClient.initialize();
}

startBot();
app.listen(PORT, () => console.log(`MBUVI MD running on http://localhost:${PORT}, you badass!`));
module.exports = app;