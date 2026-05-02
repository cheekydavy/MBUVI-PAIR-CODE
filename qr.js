const { makeid } = require('./id');
  const QRCode = require('qrcode');
  const express = require('express');
  const path = require('path');
  const fs = require('fs');
  const pino = require('pino');

  const {
      default: Mbuvi_Tech,
      useMultiFileAuthState,
      Browsers,
      delay,
      makeCacheableSignalKeyStore,
      fetchLatestBaileysVersion
  } = require('@whiskeysockets/baileys');

  const router = express.Router();
  const tempRoot = path.join(__dirname, 'temp');

  if (!fs.existsSync(tempRoot)) {
      fs.mkdirSync(tempRoot, { recursive: true });
  }

  function removeFile(filePath) {
      try {
          if (fs.existsSync(filePath)) {
              fs.rmSync(filePath, { recursive: true, force: true });
          }
      } catch {}
  }

  router.get('/', async (req, res) => {
      const id = makeid();
      const sessionDir = path.join(tempRoot, id);

      let responseSent = false;
      let finished     = false;
      let reconnecting = false;
      let sock         = null;

      function cleanupSync() {
          try {
              if (sock?.ev) {
                  try { sock.ev.removeAllListeners(); } catch {}
              }
              if (sock?.ws) {
                  try { sock.ws.close(); } catch {}
              }
          } catch {}
          removeFile(sessionDir);
      }

      async function fail(message, status) {
          if (finished) return;
          finished = true;
          cleanupSync();
          if (!responseSent && !res.headersSent) {
              res.status(status || 500).json({ code: message });
              responseSent = true;
          }
      }

      async function startSocket() {
          if (finished) return;
          try {
              if (!fs.existsSync(sessionDir)) {
                  fs.mkdirSync(sessionDir, { recursive: true });
              }

              const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
              const { version } = await fetchLatestBaileysVersion();

              if (sock?.ev) {
                  try { sock.ev.removeAllListeners('connection.update'); } catch {}
                  try { sock.ev.removeAllListeners('creds.update'); } catch {}
              }

              sock = Mbuvi_Tech({
                  version,
                  auth: {
                      creds: state.creds,
                      keys: makeCacheableSignalKeyStore(
                          state.keys,
                          pino({ level: 'silent' })
                      ),
                  },
                  printQRInTerminal:          false,
                  logger:                     pino({ level: 'silent' }),
                  browser:                    Browsers.macOS('Chrome'),
                  syncFullHistory:            false,
                  connectTimeoutMs:           120000,
                  keepAliveIntervalMs:        10000,
                  retryRequestDelayMs:        2000,
                  maxRetries:                 10,
                  generateHighQualityLinkPreview: true,
                  markOnlineOnConnect:        false,
              });

              sock.ev.on('creds.update', saveCreds);

              sock.ev.on('connection.update', async (update) => {
                  try {
                      const { connection, lastDisconnect, qr } = update;

                      if (finished) return;

                      if (qr && !responseSent && !res.headersSent) {
                          try {
                              const buf = await QRCode.toBuffer(qr, {
                                  type: 'png', width: 300, margin: 2,
                                  color: { dark: '#000000', light: '#ffffff' },
                                  errorCorrectionLevel: 'M',
                              });
                              res.setHeader('Content-Type', 'image/png');
                              res.setHeader('Cache-Control', 'no-store');
                              res.end(buf);
                          } catch {
                              if (!res.headersSent) res.json({ qr });
                          }
                          responseSent = true;
                      }

                      if (connection === 'open') {
                          finished = true;

                          try { await sock.newsletterFollow('120363427340708111@newsletter'); } catch {}

                          try {
                              await sock.sendMessage(sock.user.id, {
                                  text: `◈━━━━━━━━━━━◈
  │❒ Hello! 👋 You're now connected to Mbuvi-MD.
  │❒ Please wait a moment while we generate your session ID. It will be sent shortly... 🙂
  ◈━━━━━━━━━━━◈`
                              });
                          } catch {}

                          await delay(5000);
                          await saveCreds();
                          await delay(2000);

                          const credsPath = path.join(sessionDir, 'creds.json');

                          if (!fs.existsSync(credsPath)) {
                              cleanupSync();
                              return;
                          }

                          const data = fs.readFileSync(credsPath);
                          const b64data = Buffer.from(data).toString('base64');

                          try {
                              const session = await sock.sendMessage(sock.user.id, {
                                  text: b64data
                              });

                              await sock.sendMessage(
                                  sock.user.id,
                                  {
                                      text: `◈━━━━━━━━━━━◈
SESSION CONNECTED

│❒ The long code above is your Session ID. Please copy and store it safely, as you'll need it to deploy your Mbuvi-MD bot! 🔐

│❒ Need help? Reach out to us:

『••• Visit For Help •••』

> Owner:
https://wa.me/254746440595

> WaChannel:
https://whatsapp.com/channel/0029VbCKkVc7z4kh02WGqF0m

> Instagram:
https://www.instagram.com/_mbuvi

> BotRepo:
https://github.com/cheekydavy/Mbuvimd-db

│❒ Don't forget to give a ⭐ to our repo and fork it to stay updated! :)
◈━━━━━━━━━━━◈`
                                  },
                                  { quoted: session }
                              );
                          } catch {}

                          await delay(1000);
                          cleanupSync();
                          return;
                      }

                      if (connection === 'close') {
                          if (finished) return;

                          const statusCode =
                              lastDisconnect?.error?.output?.statusCode ||
                              lastDisconnect?.error?.statusCode;

                          if (statusCode === 401) {
                              return await fail('Logged out. Please try again.');
                          }

                          if (!reconnecting) {
                              reconnecting = true;
                              await delay(statusCode === 515 ? 1000 : 3000);
                              reconnecting = false;
                              return startSocket();
                          }
                      }

                  } catch (err) {
                      if (!finished) await fail('Service is Currently Unavailable. Please try again.');
                  }
              });

          } catch (err) {
              if (!finished) await fail('Service is Currently Unavailable. Please try again.');
          }
      }

      const globalTimeout = setTimeout(function () {
          if (!finished) fail('Request timed out. Please try again.');
      }, 420000);

      try {
          await startSocket();
      } catch {}

      return;
  });

  module.exports = router;