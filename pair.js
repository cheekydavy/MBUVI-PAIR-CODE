const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const path = require('path');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("baileys-elite");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function MBUVI_MD_PAIR_CODE() {
        const tempDir = path.join(__dirname, 'temp', id);
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(tempDir);
        const { version } = await fetchLatestBaileysVersion();

        try {
            const sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
                },
                logger: pino({ level: "fatal" }),
                browser: ["Chrome (Ubuntu)", "Chrome", "20.0"]
            });

            sock.ev.on('creds.update', saveCreds);

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);

                if (!res.headersSent) {
                    await res.send({ code });
                }
            } else {
                if (!res.headersSent) {
                    await res.send({ code: "Already paired" });
                }
            }

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000);
                    const credsPath = path.join(tempDir, 'creds.json');

                    if (!fs.existsSync(credsPath)) {
                        console.log(`Creds file not found, skipping session send`);
                        await sock.ws.close();
                        removeFile(tempDir);
                        return;
                    }

                    let data;
                    try {
                        data = fs.readFileSync(credsPath);
                    } catch (err) {
                        console.log(`Failed to read creds.json: ${err}`);
                        await sock.ws.close();
                        removeFile(tempDir);
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
║❍ 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐬𝐥: _https://whatsapp.com/channel/0029VaPZWbY1iUxVVRIIOm0D_
║❍ 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦: _https://www.instagram.com/_mbuvi_
║ ☬ ☬ ☬ ☬
╚═════════════════════╝ 
 𒂀 MBUVI MD
______________________________

Don't Forget To Give Star⭐ To My Repo
______________________________`;

                    await sock.sendMessage(sock.user.id, { text: MBUVI_MD_TEXT }, { quoted: session });

                    await delay(100);
                    sock.authState.creds.registered = true;
                    await saveCreds();
                    await sock.ws.close();
                    removeFile(tempDir);
                } else if (
                    connection === "close" &&
                    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
                ) {
                    await delay(10000);
                    MBUVI_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log(`Service error: ${err}`);
            removeFile(tempDir);
            if (!res.headersSent) {
                await res.send({ code: "Service Currently Unavailable" });
            }
        }
    }

    return await MBUVI_MD_PAIR_CODE();
});

module.exports = router;
