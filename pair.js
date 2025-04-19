const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id'); // Assuming this generates a random ID like mbuvi~ew23r56fyt54eds
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const { default: Mbuvi_Tech, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require('maher-zubair-baileys');

let router = express.Router();

// Function to remove temp files
function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
  console.log(`Cleaned up temp shit at ${FilePath}`);
}

// Retry logic for sending messages
async function sendMessageWithRetry(client, jid, message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await client.sendMessage(jid, message);
      console.log(`Message sent like a fucking boss: ${message.text.substring(0, 50)}... (ID: ${result.key.id})`);
      return true;
    } catch (err) {
      console.log(`Message send fucked up, retry ${i + 1}:`, err);
      await delay(1000);
    }
  }
  console.log('Gave up on sending that shitty message');
  return false;
}

router.get('/', async (req, res) => {
  const id = makeid(); // Generate unique session ID
  let num = req.query.number;
  let messageSent = false; // Prevent multiple sends

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

      // Handle pairing code
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
          messageSent = true;
          await delay(5000); // Wait for shit to stabilize

          // Wait for session files to be ready
          const sessionPath = `./temp/${id}`;
          let attempts = 0;
          while (attempts < 5) {
            if (fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0) {
              console.log('Session files are ready, let’s fucking go');
              break;
            }
            console.log('Waiting for session files, the lazy fucks...');
            await delay(1000);
            attempts++;
          }

          // Read and encode session data
          const sessionData = {};
          if (fs.existsSync(sessionPath)) {
            const files = fs.readdirSync(sessionPath);
            for (const file of files) {
              const filePath = `${sessionPath}/${file}`;
              sessionData[file] = fs.readFileSync(filePath, 'utf-8');
            }
          }
          const sessionDataJson = JSON.stringify(sessionData);
          if (!sessionDataJson || sessionDataJson === '{}') {
            console.log('Session data is fucked, empty or missing!');
            await Pair_Code_By_Mbuvi_Tech.ws.close();
            return;
          }
          const sessionDataEncoded = Buffer.from(sessionDataJson).toString('base64');
          console.log(`Encoded session data length: ${sessionDataEncoded.length}`);
          console.log(`Encoded session data preview: ${sessionDataEncoded.substring(0, 100)}...`);

          // Main message text with embedded id and sessionDataEncoded
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
║ - SESSION_ID: like mbuvi~
║ - SESSION_DATA: The second text.
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
Session ID: ${id}
______________________________
Session Data (Base64): 
${sessionDataEncoded}
______________________________`;

          // Send main message with embedded data
          await sendMessageWithRetry(Pair_Code_By_Mbuvi_Tech, Pair_Code_By_Mbuvi_Tech.user.id, { text: MBUVI_MD_TEXT });

          // Send session ID
          await sendMessageWithRetry(Pair_Code_By_Mbuvi_Tech, Pair_Code_By_Mbuvi_Tech.user.id, { text: id });

          // Send session data separately
          await sendMessageWithRetry(Pair_Code_By_Mbuvi_Tech, Pair_Code_By_Mbuvi_Tech.user.id, { text: sessionDataEncoded });

          await delay(10000); // Extra long delay to ensure all messages are sent
          await Pair_Code_By_Mbuvi_Tech.ws.close();
          console.log('Closed the fucking WebSocket, we’re done here');
        } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
          console.log('Connection closed, retrying this shit...');
          await delay(10000);
          if (!messageSent) MBUVI_MD_PAIR_CODE(); // Retry if message hasn’t been sent
        }
      });
    } catch (err) {
      console.log('Service fucked up hard:', err);
      await removeFile(`./temp/${id}`);
      if (!res.headersSent) {
        await res.send({ code: 'Service Currently Unavailable, you dumb fuck!' });
      }
    }
  }

  return await MBUVI_MD_PAIR_CODE();
});

module.exports = router;
