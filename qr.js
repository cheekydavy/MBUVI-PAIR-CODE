const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
let router = express.Router();
const pino = require('pino');
const { default: Mbuvi_Tech, useMultiFileAuthState, jidNormalizedUser, Browsers, delay, makeInMemoryStore } = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const randomId = makeid();
  let messageSent = false;
  const sessionFolder = `./temp/${randomId}`;
  console.log(`[QR] Starting QR code generation, session ID: ${randomId}`);

  // Set a timeout for QR code generation
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`[QR Error] QR generation timed out for ${randomId}`);
      res.status(503).send('QR generation timed out, try again later, you fuck!');
      removeFile(sessionFolder);
    }
  }, 25000);

  async function MBUVI_MD_QR_CODE() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      let Qr_Code_By_Mbuvi_Tech = Mbuvi_Tech({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
        defaultQueryTimeoutMs: 20000, // Reduce timeout
      });

      Qr_Code_By_Mbuvi_Tech.ev.on('creds.update', saveCreds);
      Qr_Code_By_Mbuvi_Tech.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect, qr } = s;
        console.log(`[QR] Connection update: ${connection}, ID: ${randomId}`);

        if (qr && !res.headersSent) {
          console.log(`[QR] QR code generated for ${randomId}`);
          res.end(await QRCode.toBuffer(qr));
        }
        if (connection === 'open' && !messageSent) {
          messageSent = true;
          clearTimeout(timeout);
          console.log(`[QR] Connection opened, sending messages for ${randomId}`);
          await delay(2000);

          // Read session data and encode it
          const sessionData = {};
          if (fs.existsSync(sessionFolder)) {
            const files = fs.readdirSync(sessionFolder);
            for (const file of files) {
              const filePath = `${sessionFolder}/${file}`;
              sessionData[file] = fs.readFileSync(filePath, 'utf-8');
            }
          }
          const sessionDataJson = JSON.stringify(sessionData);
          const sessionDataEncoded = Buffer.from(sessionDataJson).toString('base64');
          const sessionId = `mbuvi~${randomId}_${sessionDataEncoded}`;

          let MBUVI_MD_TEXT = `
╔════════════════════◇
║『 *SESSION CONNECTED*』
║ ✨*MBUVI-MD*🔷
║ ✨*Mbuvi Tech*🔷
╚════════════════════╝
________________________
╔════════════════════◇
║『 *YOU'VE CHOSEN MBUVI MD* 』
║ -Set the session ID in Heroku config vars:
║ - SESSION_ID: mbuvi~<data>
╚════════════════════╝
╔════════════════════◇
║ 『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 �_H𝗲𝗹𝗽 •••』
║❍ 𝐘𝐨𝐮𝐭𝐮𝐛𝐞: _youtube.com/@Rhodvick_
║❍ 𝐎𝐰𝐧𝐞𝐫: _https://wa.me/254746440595_
║❍ 𝐑𝐞𝐩𝐨: _https://github.com/cheekydavy/mbuvi-md_
║❍ 𝐖𝐚𝐆𝐫𝐨𝐮𝐩: _https://chat.whatsapp.com/JZxR4t6JcMv66OEiRRCB2P_
║❍ 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐬𝐥: _https://whatsapp.com/channel/0029VaPZWbY1iUxVVRIIOm0D_
║❍ 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦: _https://www.instagram.com/_mbuvi_
║ ☬ ☬ ☬ ☬
╚═════════════════════╝ 
 𒂀 MBUVI MD
______________________________

Don't Forget To Give Star⭐ To My Repo
______________________________
Session ID: ${sessionId}
______________________________`;

          try {
            await Qr_Code_By_Mbuvi_Tech.sendMessage(Qr_Code_By_Mbuvi_Tech.user.id, { text: MBUVI_MD_TEXT });
            await Qr_Code_By_Mbuvi_Tech.sendMessage(Qr_Code_By_Mbuvi_Tech.user.id, { text: sessionId });
            console.log(`[QR] Messages sent for ${randomId}`);
          } catch (e) {
            console.error(`[QR Error] Failed to send messages: ${e.message}`);
          }
          await delay(100);
          await Qr_Code_By_Mbuvi_Tech.ws.close();
          removeFile(sessionFolder);
        } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
          console.log(`[QR] Connection closed, retrying for ${randomId}`);
          await delay(5000);
          if (!messageSent) MBUVI_MD_QR_CODE();
        }
      });
    } catch (err) {
      console.error(`[QR Error] Service failed for ${randomId}: ${err.message}`);
      clearTimeout(timeout);
      await removeFile(sessionFolder);
      if (!res.headersSent) {
        res.status(503).send('Service Currently Unavailable, you dumb fuck!');
      }
    }
  }
  return await MBUVI_MD_QR_CODE();
});
module.exports = router;
