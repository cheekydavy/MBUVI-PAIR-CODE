const express = require('express')
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const { makeid } = require('./id')

const {
    default: Mbuvi_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    fetchLatestWaWebVersion
} = require('@whiskeysockets/baileys')

const router = express.Router()
const sessionDir = path.join(__dirname, "temp")

function removeFile(p) {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
}

router.get('/', async (req, res) => {
    const id = makeid()
    const tempDir = path.join(sessionDir, id)
    let num = (req.query.number || '').replace(/[^0-9]/g, '')
    let responseSent = false
    let sessionCleanedUp = false

    async function cleanUpSession() {
        if (!sessionCleanedUp) {
            try { removeFile(tempDir) } catch {}
            sessionCleanedUp = true
        }
    }

    async function startPairing() {
        try {
            const { version } = await fetchLatestWaWebVersion()
            const { state, saveCreds } = await useMultiFileAuthState(tempDir)

            const sock = Mbuvi_Tech({
                version,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
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
                    delayBetweenTriesMs: 3000
                },
                retryRequestDelayMs: 10000
            })

            if (!sock.authState.creds.registered) {
                await delay(2000)
                const code = await sock.requestPairingCode(num)
                if (!responseSent && !res.headersSent) {
                    res.json({ code })
                    responseSent = true
                }
            }

            sock.ev.on('creds.update', saveCreds)

            sock.ev.on('connection.update', async update => {
                const { connection, lastDisconnect } = update

                if (connection === 'open') {

                    sock.ev.removeAllListeners('connection.update')
                    sock.ws.removeAllListeners()

                    try {
                        await sock.sendMessage(sock.user.id, { text: `Connected to Mbuvi-MD. Please wait...` })
                    } catch {}

                    await delay(5000)

                    const credsPath = path.join(tempDir, "creds.json")
                    let sessionData = null
                    let attempts = 0
                    const maxAttempts = 10

                    while (attempts < maxAttempts && !sessionData) {
                        try {
                            if (fs.existsSync(credsPath)) {
                                const data = fs.readFileSync(credsPath)
                                if (data && data.length > 50) {
                                    sessionData = data
                                    break
                                }
                            }
                            await delay(4000)
                            attempts++
                        } catch {
                            await delay(2000)
                            attempts++
                        }
                    }

                    if (!sessionData) {
                        try { await sock.sendMessage(sock.user.id, { text: "Failed to generate session." }) } catch {}
                        await cleanUpSession()
                        sock.ws.close()
                        return
                    }

                    const base64 = Buffer.from(sessionData).toString('base64')

                    try {
                        const sent = await sock.sendMessage(sock.user.id, { text: base64 })

                        const info = `

        
╔════════════════════◇
║『 SESSION CONNECTED』
║ ✨MBUVI-MD🔷
║ ✨Mbuvi Tech🔷
╚════════════════════╝


---

╔════════════════════◇
║『 YOU'VE CHOSEN MBUVI MD 』
║ -Set the session ID in Heroku:
║ - SESSION_ID: 
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
______________________________
`

                        await sock.sendMessage(sock.user.id, { text: info }, { quoted: sent })

                        await delay(2000)
                        sock.ws.close()
                        await cleanUpSession()

                    } catch {
                        await cleanUpSession()
                        sock.ws.close()
                    }

                } else if (connection === 'close') {
                    if (lastDisconnect?.error?.output?.statusCode !== 401) {
                        await delay(10000)
                        startPairing()
                    } else {
                        await cleanUpSession()
                    }
                }
            })

        } catch (err) {
            await cleanUpSession()
            if (!responseSent && !res.headersSent) {
                res.status(500).json({ code: 'Service Unavailable' })
                responseSent = true
            }
        }
    }

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Pairing timeout")), 180000)
    })

    try {
        await Promise.race([startPairing(), timeoutPromise])
    } catch {
        await cleanUpSession()
        if (!responseSent && !res.headersSent) {
            res.status(500).json({ code: "Service Error - Timeout" })
        }
    }
})

module.exports = router
