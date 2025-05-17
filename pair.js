const express = require('express');
const { default: makeWASocket, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Utility to generate a random ID
function makeid() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Utility to remove temporary files
function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let phoneNumber = req.query.number;

    async function pairWithCode() {
        // Create temporary directory for session
        const tempDir = path.join(__dirname, 'temp', id);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Initialize in-memory credentials with minimal structure
        let creds = {
            noiseKey: { private: null, public: null },
            signedIdentityKey: { private: null, public: null },
            signedPreKey: { keyId: null, keyPair: { private: null, public: null }, signature: null },
            registrationId: null,
            advSecretKey: null,
            nextPreKeyId: null,
            firstUnuploadedPreKeyId: null,
            serverHasPreKeys: false,
            account: null,
            me: null,
            signalIdentities: [],
            lastAccountSyncTimestamp: null,
            myAppStateKeyId: null,
        };

        // Track whether credentials need saving
        let saveCreds = async () => {
            try {
                fs.writeFileSync(path.join(tempDir, 'creds.json'), JSON.stringify(creds));
            } catch (err) {
                console.error(`Failed to save creds: ${err}`);
            }
        };

        try {
            // Initialize socket
            const sock = makeWASocket({
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                browser: Browsers.macOS('Chrome'),
                auth: {
                    creds,
                    keys: {}, // Baileys will populate keys during connection
                },
                markOnlineOnConnect: false,
            });

            // Update creds when they change
            sock.ev.on('creds.update', async (updatedCreds) => {
                creds = { ...creds, ...updatedCreds };
                await saveCreds();
            });

            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (connection === 'connecting' || qr) {
                    if (!sock.authState.creds.registered) {
                        // Clean and format phone number (E.164 without +)
                        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
                        try {
                            const code = await sock.requestPairingCode(phoneNumber);
                            if (!res.headersSent) {
                                res.send({ code });
                            }
                        } catch (err) {
                            console.error(`Failed to request pairing code: ${err}`);
                            if (!res.headersSent) {
                                res.send({ code: 'Failed to generate pairing code' });
                            }
                            await sock.ws.close();
                            removeFile(tempDir);
                        }
                    } else {
                        if (!res.headersSent) {
                            res.send({ code: 'Already paired' });
                        }
                        await sock.ws.close();
                        removeFile(tempDir);
                    }
                } else if (connection === 'open') {
                    // Save session data
                    const sessionData = Buffer.from(JSON.stringify(creds)).toString('base64');
                    const session = await sock.sendMessage(sock.user.id, { text: sessionData });

                    const messageText = `
╔════════════════════◇
║『 SESSION CONNECTED』
║ ✨MBUVI-MD🔷
║ ✨Mbuvi Tech🔷
╚════════════════════╝

---

╔════════════════════◇
║『 YOU'VE CHOSEN MBUVI MD 』
║ -Set the session ID in Heroku:
║ - SESSION_ID: mbuvi~${sessionData}
╚════════════════════╝
╔════════════════════◇
║ 『••• _Visit For Help •••』
║❍ 𝐘𝐨𝐮𝐭𝐮𝐛𝐞: youtube.com/@Rhodvick
║❍ 𝐎𝐰𝐧𝐞𝐫: https://wa.me/254746440595
║❍ 𝐑𝐞𝐩𝐨: https://github.com/cheekydavy/mbuvi-md
║❍ 𝐖𝐚𝐆𝗿𝐨𝐮𝐩: https://chat.whatsapp.com/JZxR4t6JcMv66OEiRRCB2P
║❍ 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐥: https://whatsapp.com/channel/0029VaPZWbY1iUxVVRIIOm0D
║❍ 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦: https://www.instagram.com/mbuvi
║ ☬ ☬ ☬ ☬
╚═════════════════════╝
𒂀 MBUVI MD

---

Don't Forget To Give Star⭐ To My Repo
______________________________`;

                    await sock.sendMessage(sock.user.id, { text: messageText }, { quoted: session });

                    // Close connection and clean up
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await sock.ws.close();
                    removeFile(tempDir);
                } else if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode === DisconnectReason.restartRequired) {
                        // Restart connection
                        pairWithCode();
                    } else if (statusCode !== 401) {
                        // Handle other errors
                        console.error(`Disconnected with status ${statusCode}`);
                        removeFile(tempDir);
                        if (!res.headersSent) {
                            res.send({ code: 'Connection failed' });
                        }
                    }
                }
            });

        } catch (err) {
            console.error(`Service error: ${err}`);
            removeFile(tempDir);
            if (!res.headersSent) {
                res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }

    return await pairWithCode();
});

module.exports = router;
