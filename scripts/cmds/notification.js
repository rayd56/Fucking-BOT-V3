const fs = require("fs-extra");
const path = require("path");
const { createCanvas, registerFont } = require("canvas");

// Fonts
try {
  registerFont(path.join(__dirname, "fonts/Rajdhani-Bold.ttf"), { family: "Rajdhani" });
  registerFont(path.join(__dirname, "fonts/Teko-SemiBold.ttf"), { family: "Teko" });
  registerFont(path.join(__dirname, "fonts/Orbitron-Black.ttf"), { family: "Orbitron" });
} catch {}

async function generateNotificationCanvas(adminName, messageText) {
  const width = 1000;
  const height = 560;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // BLUE GRADIENT BACKGROUND
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#0a192f");
  bgGrad.addColorStop(0.5, "#112240");
  bgGrad.addColorStop(1, "#1e3a8a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Lignes diagonales
  ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
  ctx.lineWidth = 2;
  for(let i = -height; i < width; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }

  // Glow bleu
  const glow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, 350);
  glow.addColorStop(0, "rgba(59, 130, 246, 0.3)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // PANNEAU
  const panelW = 900, panelH = 420;
  const panelX = (width - panelW) / 2, panelY = 70;

  ctx.fillStyle = "rgba(17, 34, 64, 0.92)";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 30);
  ctx.fill();

  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 25;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // BADGE ADMIN
  ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
  ctx.beginPath();
  ctx.roundRect(panelX + 30, panelY - 20, 200, 40, 20);
  ctx.fill();
  ctx.strokeStyle = "#3b82f6";
  ctx.stroke();

  ctx.font = "bold 16px Rajdhani, Arial";
  ctx.fillStyle = "#3b82f6";
  ctx.textAlign = "center";
  ctx.fillText("⚡ ADMIN PREMIUM ⚡", panelX + 130, panelY + 5);

  // HEADER
  ctx.font = "bold 42px Orbitron, Rajdhani, Arial";
  ctx.fillStyle = "#60a5fa";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 20;
  ctx.fillText("📢 NOTIFICATION OFFICIELLE", width / 2, panelY + 65);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(panelX + 50, panelY + 95);
  ctx.lineTo(panelX + panelW - 50, panelY + 95);
  ctx.stroke();

  // ADMIN + MESSAGE
  ctx.textAlign = "left";
  ctx.font = "bold 22px Teko, Arial";
  ctx.fillStyle = "#60a5fa";
  ctx.fillText("👤 Admin :", panelX + 50, panelY + 145);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(adminName, panelX + 180, panelY + 145);

  ctx.font = "bold 25px Rajdhani, Arial";
  ctx.fillStyle = "#93c5fd";
  ctx.fillText("💬 Message :", panelX + 50, panelY + 195);

  ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
  ctx.beginPath();
  ctx.roundRect(panelX + 40, panelY + 215, panelW - 80, 160, 15);
  ctx.fill();
  ctx.strokeStyle = "rgba(96, 165, 250, 0.4)";
  ctx.stroke();

  ctx.font = "19px Teko, Arial";
  ctx.fillStyle = "#e2e8f0";
  const words = messageText.split(' ');
  let line = '', y = panelY + 245;
  const maxWidth = panelW - 120;

  for(let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, panelX + 60, y);
      line = words[n] + ' ';
      y += 32;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, panelX + 60, y);

  ctx.textAlign = "center";
  ctx.font = "italic 15px Rajdhani, Arial";
  ctx.fillStyle = "rgba(147, 197, 253, 0.8)";
  ctx.fillText(`⚡ RAYD EFOUA HUB • ${new Date().toLocaleDateString("fr-FR")} ⚡`, width / 2, height - 25);

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
  const cachePath = path.join(cacheDir, `notif_${Date.now()}.png`);
  fs.writeFileSync(cachePath, canvas.toBuffer("image/png"));

  return { cachePath, captionText: `📢 NOTIFICATION OFFICIELLE\n👤 Admin: ${adminName}\n💬 Message: ${messageText}\n\n⚡ RAYD EFOUA HUB` };
}

module.exports = {
  config: {
    name: "notification",
    aliases: ["noti"],
    version: "1.7",
    author: "Rayd",
    countDown: 5,
    role: 2,
    shortDescription: "Broadcast notification bleu safe",
    category: "⚙️ Admin"
  },

  onStart: async function ({ message, event, args, threadsData, usersData, api }) {
    try {
      const messageText = args.join(" ");
      if (!messageText) return message.reply("❌ Usage: `.noti ton message ici`");

      const adminName = await usersData.getName(event.senderID);
      const { cachePath, captionText } = await generateNotificationCanvas(adminName, messageText);

      const allThreads = await threadsData.getAll();
      const groupThreads = allThreads.filter(t => t.threadID && t.isGroup);

      await message.reply(`📡 **BROADCAST LANCÉ**\nCible: ${groupThreads.length} groupes\nMode: Batch sécurisé anti-ban...`);

      let success = 0, failed = 0;
      const batchSize = 15; // 15 groupes max par batch pour éviter ban WhatsApp
      const delay = 3000; // 3s entre chaque batch

      // ✅ FIX : Envoi par batch + nouveau stream à chaque fois
      for(let i = 0; i < groupThreads.length; i += batchSize) {
        const batch = groupThreads.slice(i, i + batchSize);

        await Promise.all(batch.map(thread =>
          new Promise(async (resolve) => {
            try {
              await api.sendMessage({
                body: captionText,
                attachment: fs.createReadStream(cachePath) // Nouveau stream à chaque envoi
              }, thread.threadID);
              success++;
            } catch (err) {
              failed++;
              console.error(`Fail groupe ${thread.threadID}:`, err.message || err);
            }
            resolve();
          })
        ));

        if(i + batchSize < groupThreads.length) {
          await new Promise(r => setTimeout(r, delay)); // Pause anti-rate-limit
        }
      }

      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);

      return message.reply(
        `✅ **BROADCAST TERMINÉ**\n\n` +
        `📢 Message: "${messageText}"\n` +
        `📊 Réussi: ${success} groupes\n` +
        `❌ Échec: ${failed} groupes\n` +
        `⏱️ Durée: ~${Math.ceil(groupThreads.length/batchSize)*3}s`
      );

    } catch (error) {
      console.error("Erreur notification:", error);
      return message.reply("❌ Erreur: " + (error.message || "Inconnue"));
    }
  }
};
