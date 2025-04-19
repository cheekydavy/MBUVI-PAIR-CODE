const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require('pino');
const { default: Mbuvi_Tech, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require('maher-zubair-baileys');

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const id = makeid(); // e.g., mbuvi~ew23r56fyt54eds
  let num = req.query.number;
  let messageSent = false; // Flag to prevent multiple messages

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
        browser: ['Chrome (Ubuntu)', 'Chrome (Linux)', 'Chrome (MacOs)'],
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
        if (connection === 'open' && !messageSent) {
          messageSent = true; // Set flag to prevent resending
          await delay(5000);

          // Read the session data from temp/<id> and Base64-encode it
          const sessionPath = `./temp/${id}`;
          const sessionData = {};
          if (fs.existsSync(sessionPath)) {
            const files = fs.readdirSync(sessionPath);
            for (const file of files) {
              const filePath = `${sessionPath}/${file}`;
              sessionData[file] = fs.readFileSync(filePath, 'utf-8');
            }
          }
          const sessionDataJson = JSON.stringify(sessionData);
          const sessionDataEncoded = Buffer.from(sessionDataJson).toString('base64');

          let MBUVI_MD_TEXT = `
╔════════════════════◇
║『 *SESSION CONNECTED*』
║ ✨*MBUVI-MD*🔷
║ ✨*Mbuvi Tech*🔷
╚════════════════════╝
________________________
╔════════════════════◇
║『 *YOU'VE CHOSEN MBUVI MD* 』
║ -You'll need both session id and data.
║ -Set them in Heroku config vars:
║ - SESSION_ID: ${id}
║ - SESSION_DATA:The second text.
╚════════════════════╝
╔════════════════════◇
║ 『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❍ 𝐘𝐨𝐮𝐭𝐮𝐛𝐞: _youtube.com/@Rhodvick_
║❍ 𝐎𝐰𝐧𝐞𝐫: _https://wa.me/254746440595_
║❍ 𝐑𝐞𝐩𝐨: _https://github.com/cheekydavy/mbuvi-md_
║❍ 𝐖𝐚𝐆𝐫𝐨𝐮𝐩: _https://chat.whatsapp.com/JZxR4t6JcMv66OEiRRCB2P_
║❍ 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐥: _https://whatsapp.com/channel/0029VaPZWbY1iUxVVRIIOm0D_
║❍ 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦: _https://www.instagram.com/_mbuvi_
║ ☬ ☬ ☬ ☬
╚═════════════════════╝ 
 𒂀 MBUVI MD
______________________________

Don't Forget To Give Star⭐ To My Repo`;

          await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: MBUVI_MD_TEXT });
          // Send second message with just the session ID for easy copying
          await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: id });
          // Send third message with just the session data for easy copying
          await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: sessionDataEncoded });
          await delay(100);
          await Pair_Code_By_Mbuvi_Tech.ws.close();
        } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
          await delay(10000);
          if (!messageSent) MBUVI_MD_PAIR_CODE(); // Only retry if message hasn’t been sent
        }
      });
    } catch (err) {
      console.log('Service fucked up:', err);
      await removeFile(`./temp/${id}`);
      if (!res.headersSent) {
        await res.send({ code: 'Service Currently Unavailable, you dumb fuck!' });
      }
    }
  }
  return await MBUVI_MD_PAIR_CODE();
});
module.exports = router;
