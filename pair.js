const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require('pino');
const { default: Mbuvi_Tech, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const randomId = makeid();
  let num = req.query.number;
  let messageSent = false;
  let retryAttempts = 0;
  const sessionFolder = `./temp/${randomId}`;
  console.log(`[Pair] Starting pairing for number: ${num}, session ID: mbuvi~${randomId}`);

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`[Pair Error] Pairing timed out for mbuvi~${randomId}`);
      res.status(503).send({ code: 'Pairing timed out, try again later, you fuck!' });
      removeFile(sessionFolder);
    }
  }, 60000); // Increased timeout to 60 seconds

  async function MBUVI_MD_PAIR_CODE() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      let Pair_Code_By_Mbuvi_Tech = Mbuvi_Tech({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
        browser: Browsers.windows('Firefox'), // More realistic browser fingerprint
        defaultQueryTimeoutMs: 60000, // Increased timeout
        keepAliveIntervalMs: 30000, // Keep the connection alive
      });

      if (!Pair_Code_By_Mbuvi_Tech.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, '');
        console.log(`[Pair] Requesting pairing code for ${num}`);
        const code = await Pair_Code_By_Mbuvi_Tech.requestPairingCode(num);
        if (!res.headersSent) {
          console.log(`[Pair] Pairing code generated: ${code}`);
          res.send({ code });
        }
      }

      Pair_Code_By_Mbuvi_Tech.ev.on('creds.update', async () => {
        console.log(`[Pair] Credentials updated for mbuvi~${randomId}`);
        await saveCreds();
      });

      Pair_Code_By_Mbuvi_Tech.ev.on('connection.update', async (s) => {
        console.log(`[Pair] Connection update: ${JSON.stringify(s, null, 2)}, ID: mbuvi~${randomId}`);
        const { connection, lastDisconnect } = s;

        if (connection === 'open' && !messageSent) {
          // Send a test message to validate the session
          try {
            await delay(1000);
            await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: 'TEST_MESSAGE' }, { timeout: 15000 });
            console.log(`[Pair] Test message sent successfully for mbuvi~${randomId}`);
          } catch (e) {
            console.error(`[Pair Error] Failed to send test message for mbuvi~${randomId}: ${e.message}`);
            await Pair_Code_By_Mbuvi_Tech.ws.close();
            removeFile(sessionFolder);
            if (!res.headersSent) {
              res.status(503).send({ code: 'Failed to validate session, try again!' });
            }
            return;
          }

          messageSent = true;
          clearTimeout(timeout);
          console.log(`[Pair] Connection opened, sending messages for mbuvi~${randomId}`);
          await delay(1000);

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
║『 SESSION CONNECTED』
║ ✨MBUVI-MD🔷
║ ✨Mbuvi Tech🔷
╚════════════════════╝
________________________
╔════════════════════◇
║『 YOU'VE CHOSEN MBUVI MD 』
║ -Set the session ID in Heroku:
║ - SESSION_ID: mbuvi~<data>
╚════════════════════╝
╔════════════════════◇
║ 『••• _V𝗶𝘀𝗶𝘁 𝗙𝗼𝗿_H𝗲𝗹𝗽 •••』
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

Don't Forget To Give Star⭐ To My Repo
______________________________`;

          let msgAttempts = 0;
          const maxMsgAttempts = 3;
          let messagesSentSuccessfully = false;
          while (msgAttempts < maxMsgAttempts && !messagesSentSuccessfully) {
            try {
              await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: sessionId }, { timeout: 15000 });
              await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: MBUVI_MD_TEXT }, { timeout: 15000 });
              console.log(`[Pair] Messages successfully sent for mbuvi~${randomId}`);
              messagesSentSuccessfully = true;
            } catch (e) {
              msgAttempts++;
              console.error(`[Pair Error] Message send attempt ${msgAttempts} failed: ${e.message}`);
              if (msgAttempts < maxMsgAttempts) await delay(2000);
            }
          }
          if (!messagesSentSuccessfully) {
            console.error(`[Pair Error] Failed to send messages after ${maxMsgAttempts} attempts`);
          }
          try {
            await Pair_Code_By_Mbuvi_Tech.ws.close();
            console.log(`[Pair] WebSocket closed for mbuvi~${randomId}`);
          } catch (e) {
            console.error(`[Pair Error] Failed to close WebSocket: ${e.message}`);
          }
          removeFile(sessionFolder);
        } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
          console.log(`[Pair] Connection closed, retrying for mbuvi~${randomId}`);
          await delay(5000);
          if (!messageSent && retryAttempts < 2) {
            retryAttempts++;
            removeFile(sessionFolder); // Clear session folder before retry
            try {
              await MBUVI_MD_PAIR_CODE();
            } catch (e) {
              console.error(`[Pair Error] Retry ${retryAttempts} failed: ${e.message}`);
            }
          } else {
            console.log(`[Pair] Max retries reached for mbuvi~${randomId}`);
          }
        }
      });
    } catch (err) {
      console.error(`[Pair Error] Service failed for mbuvi~${randomId}: ${err.message}`);
      clearTimeout(timeout);
      await removeFile(sessionFolder);
      if (!res.headersSent) {
        res.status(503).send({ code: 'Service Currently Unavailable, you dumb fuck!' });
      }
    }
  }
  try {
    await MBUVI_MD_PAIR_CODE();
  } catch (e) {
    console.error(`[Pair Error] Top-level failure for mbuvi~${randomId}: ${e.message}`);
  }
});
module.exports = router;
