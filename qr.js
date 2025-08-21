const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL')
const {makeid} = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
	default: Mbuvi_Tech,
	useMultiFileAuthState,
	jidNormalizedUser,
	Browsers,
	delay,
	makeInMemoryStore,
} = require("baileys");

function removeFile(FilePath) {
	if (!fs.existsSync(FilePath)) return false;
	fs.rmSync(FilePath, {
		recursive: true,
		force: true
	})
};
const {
	readFile
} = require("node:fs/promises")
router.get('/', async (req, res) => {
	const id = makeid();
	async function MBUVI_MD_QR_CODE() {
		const {
			state,
			saveCreds
		} = await useMultiFileAuthState('./temp/' + id)
		try {
			let Qr_Code_By_Mbuvi_Tech = Mbuvi_Tech({
				auth: state,
				printQRInTerminal: false,
				logger: pino({
					level: "silent"
				}),
				browser: Browsers.macOS("Desktop"),
			});

			Qr_Code_By_Mbuvi_Tech.ev.on('creds.update', saveCreds)
			Qr_Code_By_Mbuvi_Tech.ev.on("connection.update", async (s) => {
				const {
					connection,
					lastDisconnect,
					qr
				} = s;
				if (qr) await res.end(await QRCode.toBuffer(qr));
				if (connection == "open") {
					await delay(5000);
					let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
					await delay(800);
				   let b64data = Buffer.from(data).toString('base64');
				   let session = await Qr_Code_By_Mbuvi_Tech.sendMessage(Qr_Code_By_Mbuvi_Tech.user.id, { text: '' + b64data });
	
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
______________________________`
	 await Qr_Code_By_Mbuvi_Tech.sendMessage(Qr_Code_By_Mbuvi_Tech.user.id,{text:MBUVI_MD_TEXT},{quoted:session})



					await delay(100);
					await Qr_Code_By_Mbuvi_Tech.ws.close();
					return await removeFile("temp/" + id);
				} else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
					await delay(10000);
					MBUVI_MD_QR_CODE();
				}
			});
		} catch (err) {
			if (!res.headersSent) {
				await res.json({
					code: "Service is Currently Unavailable"
				});
			}
			console.log(err);
			await removeFile("temp/" + id);
		}
	}
	return await MBUVI_MD_QR_CODE()
});
module.exports = router
