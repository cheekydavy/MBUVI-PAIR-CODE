const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const {
    default: makeWASocket,
    delay,
    Browsers
} = require('gifted-baileys');
const { makeid } = require('./id');

const router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function MBUVI_MD_PAIR_CODE() {
        const tempDir = path.join(__dirname, 'temp', id);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        try {
            let sock = makeWASocket({
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers ? ["Chrome (Ubuntu)", "Chrome (Linux)", "Chrome (MacOs)"] : ["Chrome", "120.0.0.0", "Ubuntu"]
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            } else {
                if (!res.headersSent) {
                    await res.send({ code: 'Already paired' });
                }
            }

            sock.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === 'open') {
                    await delay(5000);
                    const credsPath = path.join(tempDir, 'creds.json');
                    if (!fs.existsSync(credsPath)) {
                        console.log(`Creds file not found at ${credsPath}, skipping session send`);
                        await sock.ws.close();
                        await removeFile(tempDir);
                        return;
                    }

                    let data;
                    try {
                        data = fs.readFileSync(credsPath);
                    } catch (err) {
                        console.log(`Failed to read creds.json: ${err}`);
                        await sock.ws.close();
                        await removeFile(tempDir);
                        return;
                    }

                    await delay(800);
                    let b64data = Buffer.from(data).toString('base64');
                    let session = await sock.sendMessage(sock.user.id, { text: '' + b64data });

                    let MBUVI_MD_TEXT = `
╔════════════════════◇
║『 SESSION CONNECTED』
║ ✨MBUVI-MD🔷
║ ✨Mbuvi Tech🔷
╚════════════════════╝

---

╔════════════════════◇
║『 YOU'VE CHOSEN MBUVI MD 』
║ -Set the session ID in Heroku:
║ - SESSION_ID: mbuvi~<data>
╚════════════════════╝
╔════════════════════◇
║ 『••• _V𝗶𝘀𝗶𝘁 𝗙𝗼𝗿_H𝗲𝗹𝗽 •••』
║❍ 𝐘𝐨𝐮𝐭𝐮𝐛𝐞: youtube.com/@Rhodvick
║❍ 𝐎𝐰𝐧𝐞𝐫: https://wa.me/254746440595
║❍ 𝐑𝐞𝐩𝐨: https://github.com/cheekydavy/mbuvi-md
║❍ 𝐖𝐚𝐆𝗿𝐨𝐮𝐩: https://chat.whatsapp.com/JZxR4t6JcMv66OEiRRCB2P
║❍ 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐥: https://whatsapp.com/channel/0029VaPZWbY1iUxVVRIIOm0D
║❍ 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦: _https://www.instagram.com/mbuvi
║ ☬ ☬ ☬ ☬
╚═════════════════════╝
𒂀 MBUVI MD

---

Don't Forget To Give Star⭐ To My Repo
______________________________`;

                    await sock.sendMessage(sock.user.id, { text: MBUVI_MD_TEXT }, { quoted: session });

                    await delay(100);
                    sock.authState.creds.registered = true;
                    await sock.ws.close();
                    await removeFile(tempDir);
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    MBUVI_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log(`Service error: ${err}`);
            await removeFile(tempDir);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }

    return await MBUVI_MD_PAIR_CODE();
});

module.exports = router;