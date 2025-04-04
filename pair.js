const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require('pino');
const { default: Mbuvi_Tech, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const id = makeid(); // e.g., mbuvi~ew23r56fyt54eds
  let num = req.query.number;
  async function MBUVI_MD_PAIR_CODE() {
    const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
    try {
      let Pair_Code_By_Mbuvi_Tech = Mbuvi_Tech({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
        browser: ['Chrome (Ubuntu)', 'Chrome', '20.0'],
      });

      if (!Pair_Code_By_Mbuvi_Tech.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, '');
        const code = await Pair_Code_By_Mbuvi_Tech.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      Pair_Code_By_Mbuvi_Tech.ev.on('creds.update', saveCreds);
      Pair_Code_By_Mbuvi_Tech.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === 'open') {
          await delay(5000);
          let MBUVI_MD_TEXT = `
*SESSION CONNECTED*
*SAVAGE MD LOGGED 👌*
*By MBUVI TECH 🤖_*
______________________________
Session ID: ${id}
______________________________
╔════◇
║『 YOU'VE CHOSEN MBUVI MD 』
║ Save this Session ID to login later!
╚══════════════╝
╔═════◇
║ 『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❍ 𝐑𝐞𝐩𝐨: _https://github.com/cheekydavy/mbuvi-md_
║❍ 𝐎𝐰𝐧𝐞𝐫: _https://wa.me/254746440595_
╚══════════════╝ 
 𒂀 MBUVI MD
______________________________

Don't Forget To Give Star⭐ To My Repo`;

          await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: MBUVI_MD_TEXT });
          await delay(100);
          await Pair_Code_By_Mbuvi_Tech.ws.close();
          // Don’t remove the temp folder yet; we need it for login
        } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
          await delay(10000);
          MBUVI_MD_PAIR_CODE();
        }
      });
    } catch (err) {
      console.log('Service fucked up:', err);
      await removeFile(`./temp/${id}`);
      if (!res.headersSent) {
        await res.send({ code: 'Service Currently Unavailable' });
      }
    }
  }
  return await MBUVI_MD_PAIR_CODE();
});
module.exports = router;