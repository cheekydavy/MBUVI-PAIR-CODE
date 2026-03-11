const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { makeid } = require('./id');
const {
    default: Mbuvi_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    fetchLatestWaWebVersion
} = require('@whiskeysockets/baileys');
const router = express.Router();
const sessionDir = path.join(__dirname, "temp");

function removeFile(path) {
    if (fs.existsSync(path)) fs.rmSync(path, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    const num = (req.query.number || '').replace(/[^0-9]/g, '');
    if (!num) {
        return res.json({ code: "Please provide a phone number" });
    }
    const tempDir = path.join(sessionDir, id);
    let responseSent = false;

    async function connectSocket() {
        return new Promise(async (resolve) => {
            let timeoutId = setTimeout(() => {
                console.log("Connection attempt timed out");
                removeFile(tempDir);
                resolve('fail');
            }, 60000); // 60s timeout per attempt

            try {
                const { version } = await fetchLatestWaWebVersion();
                const { state, saveCreds } = await useMultiFileAuthState(tempDir);
                const sock = Mbuvi_Tech({
                    version,
                    logger: pino({ level: "silent" }),
                    printQRInTerminal: false,
                    auth: {
                        creds: state.creds,
                        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
                    },
                    browser: ["Ubuntu", "Chrome", "20.0.04"],
                    markOnlineOnConnect: true
                });

                sock.ev.on('creds.update', saveCreds);

                const isInitialPairing = !sock.authState.creds.registered;

                sock.ev.on("connection.update", async (update) => {
                    const { connection, lastDisconnect, qr } = update;
                    if (connection === "connecting" && isInitialPairing && !!qr === false) {  // Only request if not QR and initial
                        try {
                            await delay(5000);  // Increased delay for reliability
                            const code = await sock.requestPairingCode(num);
                            console.log(`Pairing code generated: ${code}`);
                            const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
                            if (!responseSent && !res.headersSent) {
                                res.json({ code: formatted });
                                responseSent = true;
                            }
                        } catch (pairErr) {
                            console.error("Error requesting pairing code:", pairErr);
                            resolve('fail');
                        }
                    }

                    if (connection === "open") {
                        console.log("WhatsApp connected");

                        try {
                            await sock.sendMessage(sock.user.id, { text: "Generating your session ID..." });
                        } catch (sendErr) {
                            console.error("Error sending generating message:", sendErr);
                        }

                        await delay(5000); // Short delay
                        await saveCreds(); // Force sync before export

                        const session = Buffer.from(
                              JSON.stringify(sock.authState.creds)
                        ).toString("base64")
                        
                        try {
                            const sentSession = await sock.sendMessage(sock.user.id, { text: session });
                            const info = `
╔════════════════════◇
║ SESSION CONNECTED
║ MBUVI-MD
╚════════════════════╝
Copy the session above and set:
SESSION_ID=<your session>
in your bot environment.
`;
                            await sock.sendMessage(sock.user.id, { text: info }, { quoted: sentSession });
                            console.log("Session sent successfully");
                        } catch (sendErr) {
                            console.error("Error sending session/info:", sendErr);
                        }

                        await delay(5000);
                        sock.ws.close();
                        clearTimeout(timeoutId);
                        removeFile(tempDir);
                        resolve('success');
                    } else if (connection === "close") {
                        const statusCode = lastDisconnect?.error?.output?.statusCode;
                        clearTimeout(timeoutId);
                        if (statusCode !== 401) { // 401 = logged out
                            console.log("Connection closed - reconnecting...");
                            await delay(5000);
                            resolve('reconnect');
                        } else {
                            console.log("Connection closed permanently (logged out)");
                            removeFile(tempDir);
                            resolve('fail');
                        }
                    }
                });
            } catch (err) {
                clearTimeout(timeoutId);
                console.error("Pairing error:", err);
                removeFile(tempDir);
                if (!responseSent && !res.headersSent) {
                    res.json({ code: "Service Unavailable" });
                }
                resolve('fail');
            }
        });
    }

    async function startPairing() {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`Starting connection attempt ${attempts}`);
            const result = await connectSocket();
            if (result !== 'reconnect') {
                console.log(`Pairing complete with result: ${result}`);
                return;
            }
        }
        console.log("Max reconnect attempts reached");
        removeFile(tempDir);
    }

    startPairing();
});

module.exports = router;
