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
    Browsers,
} = require('@whiskeysockets/baileys');

const router = express.Router();
const sessionDir = path.join(__dirname, 'temp');

function removeFile(targetPath) {
    if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    const num = (req.query.number || '').replace(/[^0-9]/g, '');

    if (!num) {
        return res.status(400).json({ code: 'Please provide a phone number' });
    }

    const tempDir = path.join(sessionDir, id);
    let responseSent = false;
    let sessionCleanedUp = false;

    async function cleanUpSession() {
        if (!sessionCleanedUp) {
            try {
                removeFile(tempDir);
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
            sessionCleanedUp = true;
        }
    }

    async function startPairing() {
        try {
            const version = (
                await (
                    await fetch(
                        'https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json'
                    )
                ).json()
            ).version;

            const { state, saveCreds } = await useMultiFileAuthState(tempDir);

            const sock = Mbuvi_Tech({
                version,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino().child({ level: 'silent', stream: 'store' })
                    ),
                },
                browser: Browsers.macOS('Chrome'),
                syncFullHistory: false,
                generateHighQualityLinkPreview: true,
                shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
                getMessage: async () => undefined,
                markOnlineOnConnect: true,
                connectTimeoutMs: 120000,
                keepAliveIntervalMs: 30000,
                emitOwnEvents: true,
                fireInitQueries: true,
                defaultQueryTimeoutMs: 60000,
                transactionOpts: {
                    maxCommitRetries: 10,
                    delayBetweenTriesMs: 3000,
                },
                retryRequestDelayMs: 10000,
            });

            if (!sock.authState.creds.registered) {
                await delay(3000);
                const code = await sock.requestPairingCode(num);
                if (!responseSent && !res.headersSent) {
                    res.json({ code });
                    responseSent = true;
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async update => {
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    console.log('✅ MBUVI-MD successfully connected to WhatsApp.');
                    console.log('⏳ Waiting for session to sync and stabilize...');

                    try {
                        await sock.sendMessage(sock.user.id, {
                            text: `
◈━━━━━━━━━━━◈
│❒ Hello! 👋 You're now connected to MBUVI-MD.

│❒ Please wait a moment while we generate your session ID. It will be sent shortly... 🙂
◈━━━━━━━━━━━◈
`,
                        });
                    } catch (msgError) {
                        console.log('Welcome message skipped, continuing...');
                    }

                    await delay(25000);
                    console.log('⏳ Reading session data...');

                    const credsPath = path.join(tempDir, 'creds.json');

                    let sessionData = null;
                    let attempts = 0;
                    const maxAttempts = 15;

                    while (attempts < maxAttempts && !sessionData) {
                        try {
                            if (fs.existsSync(credsPath)) {
                                const data = fs.readFileSync(credsPath);

                                if (data && data.length > 100) {
                                    sessionData = data;
                                    console.log(
                                        `✅ Session data found (${data.length} bytes) on attempt ${
                                            attempts + 1
                                        }`
                                    );
                                    break;
                                } else {
                                    console.log(
                                        `⚠️ Session file exists but size is small: ${
                                            data?.length || 0
                                        } bytes`
                                    );
                                }
                            } else {
                                console.log(
                                    `⚠️ Session file not found yet, attempt ${
                                        attempts + 1
                                    }/${maxAttempts}`
                                );
                            }

                            await delay(6000);
                            attempts++;
                        } catch (readError) {
                            console.error('Read attempt error:', readError);
                            await delay(3000);
                            attempts++;
                        }
                    }

                    if (!sessionData) {
                        console.error('Failed to read session data after all attempts');
                        try {
                            await sock.sendMessage(sock.user.id, {
                                text: 'Failed to generate session. Please try again.',
                            });
                        } catch {}
                        await cleanUpSession();
                        sock.ws.close();
                        return;
                    }

                    const base64 = Buffer.from(sessionData).toString('base64');
                    console.log('✅ Session data encoded to base64');

                    try {
                        console.log('📤 Sending session data to user...');
                        const sentSession = await sock.sendMessage(sock.user.id, {
                            text: base64,
                        });

                        await delay(3000);

                        const infoMessage = `  
◈━━━━━━━━━━━◈  
SESSION CONNECTED

│❒ The long code above is your Session ID. Please copy and store it safely, as you'll need it to deploy your MBUVI-MD bot! 🔐

│❒ Need help? Reach out to us:

> Repo:
https://github.com/cheekydavy/MBUVI-PAIR-CODE

│❒ Don't forget to give a ⭐ to our repo and fork it to stay updated! :)
◈━━━━━━━━━━━◈`;

                        console.log('📤 Sending information message...');
                        await sock.sendMessage(
                            sock.user.id,
                            { text: infoMessage },
                            { quoted: sentSession }
                        );

                        console.log('⏳ Finalizing session...');
                        await delay(5000);

                        console.log('✅ Session completed, closing connection...');
                        triggerIntentionalCrashAfterSessionComplete;
                        sock.ws.close();
                        await cleanUpSession();
                    } catch (sendError) {
                        console.error('Error sending session:', sendError);
                        await cleanUpSession();
                        sock.ws.close();
                    }
                } else if (connection === 'close') {
                    if (lastDisconnect?.error?.output?.statusCode !== 401) {
                        console.log('⚠️ Connection closed, attempting to reconnect...');
                        await delay(15000);
                        startPairing();
                    } else {
                        console.log('❌ Connection closed permanently');
                        await cleanUpSession();
                    }
                } else if (connection === 'connecting') {
                    console.log('⏳ Connecting to WhatsApp...');
                }
            });

            sock.ev.on('connection.update', update => {
                if (update.qr) {
                    console.log('QR code received');
                }
                if (update.connection === 'close') {
                    console.log('Connection closed event');
                }
            });
        } catch (err) {
            console.error('❌ Error during pairing:', err);
            await cleanUpSession();
            if (!responseSent && !res.headersSent) {
                res
                    .status(500)
                    .json({ code: 'Service Unavailable. Please try again.' });
                responseSent = true;
            }
        }
    }

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Pairing process timeout'));
        }, 300000);
    });

    try {
        await Promise.race([startPairing(), timeoutPromise]);
    } catch (finalError) {
        console.error('Final error:', finalError);
        await cleanUpSession();
        if (!responseSent && !res.headersSent) {
            res.status(500).json({ code: 'Service Error - Timeout' });
        }
    }
});

module.exports = router;