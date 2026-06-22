const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { writeFileSync } = require("fs-extra");

const SPOILER_TAG = "||HIDDEN_DATA||:";

const THEMES = {
  blue: { bg: "#060913", card: "rgba(13, 21, 39, 0.85)", accent: "#00f0ff", text: "#ffffff", panel: "rgba(0, 240, 255, 0.15)" },
  green: { bg: "#040d0a", card: "rgba(11, 28, 22, 0.85)", accent: "#00ff66", text: "#ffffff", panel: "rgba(0, 255, 102, 0.15)" },
  red: { bg: "#0d060a", card: "rgba(31, 11, 20, 0.85)", accent: "#ff0055", text: "#ffffff", panel: "rgba(255, 0, 85, 0.15)" },
  gold: { bg: "#0a0905", card: "rgba(26, 22, 13, 0.85)", accent: "#ffb700", text: "#ffffff", panel: "rgba(255, 183, 0, 0.15)" }
};

async function drawAdminCardUltra(title, admins, themeType = "blue", api, botConfig) {
  const theme = THEMES[themeType] || THEMES.blue;
  const rowHeight = 85;
  const height = 200 + admins.length * rowHeight;
  const width = 850;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Fond dégradé radial
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width);
  bgGrad.addColorStop(0, "#111930");
  bgGrad.addColorStop(1, theme.bg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Scanlines
  ctx.globalAlpha = 0.08;
  for(let i = 0; i < height; i += 2) {
    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(0, i, width, 1);
  }
  ctx.globalAlpha = 1;

  // Halos néon
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const glow1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 400);
  glow1.addColorStop(0, hexToRgba(theme.accent, 0.4));
  glow1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, 400, height);

  const glow2 = ctx.createRadialGradient(width, height, 0, width, height, 400);
  glow2.addColorStop(0, hexToRgba(theme.accent, 0.4));
  glow2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(width - 400, 0, 400, height);
  ctx.restore();

  // 2. Card Glassmorphism
  const cardX = 35;
  const cardY = 85;
  const cardWidth = width - 70;
  const cardHeight = height - 140;

  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 40;
  ctx.fillStyle = theme.card;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
  borderGrad.addColorStop(0, theme.accent);
  borderGrad.addColorStop(0.5, "#ffffff");
  borderGrad.addColorStop(1, theme.accent);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const reflect = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 50);
  reflect.addColorStop(0, "rgba(255,255,255,0.15)");
  reflect.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = reflect;
  ctx.fillRect(cardX, cardY, cardWidth, 50);

  // 3. Header premium
  ctx.font = "bold 30px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 20;
  ctx.fillText(title, cardX + 25, 55);

  ctx.shadowBlur = 15;
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(cardX + ctx.measureText(title).width + 55, 48, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (admins.length === 0) {
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#ff3366";
    ctx.textAlign = "center";
    ctx.fillText("⚠️ AUCUN ADMINISTRATEUR ENREGISTRÉ", width / 2, cardY + 120);
  } else {
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = hexToRgba(theme.text, 0.5);
    ctx.textAlign = "left";
    ctx.fillText("RANK", cardX + 35, cardY + 40);
    ctx.fillText("PROFIL", cardX + 110, cardY + 40);
    ctx.fillText("IDENTITÉ", cardX + 210, cardY + 40);
    ctx.fillText("UID", cardX + 540, cardY + 40);
    ctx.fillText("LEVEL", cardX + 730, cardY + 40);

    const lineGrad = ctx.createLinearGradient(cardX + 20, 0, cardX + cardWidth - 20, 0);
    lineGrad.addColorStop(0, "transparent");
    lineGrad.addColorStop(0.5, theme.accent);
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cardX + 20, cardY + 55);
    ctx.lineTo(cardX + cardWidth - 20, cardY + 55);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const uidsList = admins.map(a => a.uid);
    let userInfo = {};
    try {
      userInfo = await api.getUserInfo(uidsList);
    } catch (e) {}

    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];
      const rowY = cardY + 65 + i * rowHeight;

      ctx.fillStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.roundRect(cardX + 15, rowY, cardWidth - 30, rowHeight - 8, 12);
      ctx.fill();

      const textY = rowY + rowHeight / 2 + 5;

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = i === 0 ? "#ffd700" : theme.accent;
      ctx.fillText(`#${String(i + 1).padStart(2, '0')}`, cardX + 35, textY);

      const avatarSize = 56;
      const avatarX = cardX + 105;
      const avatarY = rowY + (rowHeight - avatarSize) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();

      try {
        const avatarUrl = userInfo[admin.uid]?.thumbSrc || `https://graph.facebook.com/${admin.uid}/picture?width=200&height=200`;
        const img = await loadImage(avatarUrl);
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      } catch {
        ctx.fillStyle = theme.panel;
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        ctx.font = "bold 20px sans-serif";
        ctx.fillStyle = theme.accent;
        ctx.textAlign = "center";
        ctx.fillText(admin.name.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 7);
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = i === 0 ? "#ffd700" : theme.accent;
      ctx.lineWidth = 3;
      ctx.shadowColor = i === 0 ? "#ffd700" : theme.accent;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Dessin du Nom de l'utilisateur (Le badge OWNER a été complètement supprimé)
      ctx.textAlign = "left";
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = theme.text;
      ctx.fillText(admin.name, cardX + 210, textY);

      ctx.font = "13px monospace";
      ctx.fillStyle = hexToRgba(theme.text, 0.7);
      ctx.fillText(admin.uid, cardX + 540, textY);

      const level = Math.max(100 - i * 10, 20);
      const barWidth = 80;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(cardX + 730, textY - 6, barWidth, 12);
      const levelGrad = ctx.createLinearGradient(cardX + 730, 0, cardX + 730 + barWidth, 0);
      levelGrad.addColorStop(0, theme.accent);
      levelGrad.addColorStop(1, "#ffffff");
      ctx.fillStyle = levelGrad;
      ctx.fillRect(cardX + 730, textY - 6, barWidth * (level / 100), 12);
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.fillText(`${level}%`, cardX + 730 + barWidth / 2, textY + 3);
    }
  }

  ctx.textAlign = "center";
  ctx.font = "11px monospace";
  ctx.fillStyle = hexToRgba(theme.text, 0.4);
  ctx.fillText(`SECURE MATRIX PROTOCOL v2.1 • ADMINS: ${admins.length} • RAYD SYSTEMS`, width / 2, height - 25);

  return canvas.toBuffer("image/png");
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

module.exports = {
  config: {
    name: "admin",
    aliases: ["ad"],
    version: "0.3.0",
    author: "rayd",
    countDown: 5,
    role: 4,
    shortDescription: { en: "Panel admin holographique" },
    longDescription: { en: "Interface cyberpunk premium avec avatars réels et glassmorphism" },
    category: "admin",
    guide: { en: "Usage:\n{pn} list\n{pn} add <uid|tag|reply>\n{pn} remove <uid|tag|reply>" }
  },

  onReply: async function ({ message, event, api }) {
    if (event.type === "message_reply" && event.messageReply?.attachments?.length > 0) {
      const attachment = event.messageReply.attachments[0];
      if (attachment.type === "photo") {
        try {
          const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
          const bufferStr = Buffer.from(response.data).toString("utf-8");
          if (bufferStr.includes(SPOILER_TAG)) {
            const hiddenData = bufferStr.split(SPOILER_TAG)[1];
            return message.reply(`💾 **REGISTRE SÉCURISÉ :**\n\n${hiddenData.trim()}`);
          }
        } catch (err) {}
      }
    }
  },

  onStart: async function ({ message, args, event, usersData, api }) {
    const senderID = event.senderID;
    const botConfig = global.GoatBot.config;

    const getName = async (uid) => {
      try {
        return await usersData.getName(uid.toString()) || "Unknown User";
      } catch {
        return "Unknown User";
      }
    };

    if (!botConfig.adminBot.includes(senderID) && ["add", "-a", "remove", "-r"].includes(args[0])) {
      return message.reply("⛔ ACCÈS REFUSÉ : Privilèges administrateur requis.");
    }

    let uids = [];
    if (event.mentions && Object.keys(event.mentions).length) {
      uids = Object.keys(event.mentions);
    } else if (event.type === "message_reply" && event.messageReply?.senderID) {
      uids = [event.messageReply.senderID];
    } else {
      uids = args.slice(1).filter(a => !isNaN(a));
    }
    uids = uids.map(u => u.toString());

    // LIST - Theme BLUE
    if (args[0] === "list" || args[0] === "-l") {
      const admins = await Promise.all(
        botConfig.adminBot.map(async uid => ({
          uid,
          name: await getName(uid)
        }))
      );

      const imageBuffer = await drawAdminCardUltra("DATABASE: CORE ADMINS", admins, "blue", api, botConfig);
      const textToHide = `👑 CLASSIFICATION: NIVEAU 4\n` + admins.map((a, i) => `⚡ [${i + 1}] ${a.name} | ${a.uid}`).join("\n");
      const finalBuffer = Buffer.concat([imageBuffer, Buffer.from(`${SPOILER_TAG}${textToHide}`, "utf-8")]);

      const dirCache = global.client.dirCache || path.join(__dirname, "cache");
      if (!fs.existsSync(dirCache)) fs.mkdirSync(dirCache, { recursive: true });
      const filePath = path.join(dirCache, `admin_list_${Date.now()}.png`);
      
      await fs.promises.writeFile(filePath, finalBuffer);
      await api.sendMessage({ attachment: fs.createReadStream(filePath) }, event.threadID, event.messageID);
      fs.unlinkSync(filePath);
      return;
    }

    // ADD - Theme GREEN
    if (args[0] === "add" || args[0] === "-a") {
      if (!uids.length) return message.reply("⚠️ Spécifie une cible: mention, reply ou UID");

      const newAdmins = [];
      for (const uid of uids) {
        if (!botConfig.adminBot.includes(uid)) {
          botConfig.adminBot.push(uid);
          newAdmins.push(uid);
        }
      }
      writeFileSync(global.client.dirConfig, JSON.stringify(botConfig, null, 2));

      const admins = await Promise.all(newAdmins.map(async uid => ({ uid, name: await getName(uid) })));
      const imageBuffer = await drawAdminCardUltra("PRIVILÈGES ACCORDÉS", admins, "green", api, botConfig);
      const textToHide = `✅ ACCÈS AUTORISÉ\n` + admins.map(a => `🔹 ${a.name} (${a.uid})`).join("\n");
      const finalBuffer = Buffer.concat([imageBuffer, Buffer.from(`${SPOILER_TAG}${textToHide}`, "utf-8")]);

      const dirCache = global.client.dirCache || path.join(__dirname, "cache");
      if (!fs.existsSync(dirCache)) fs.mkdirSync(dirCache, { recursive: true });
      const filePath = path.join(dirCache, `admin_add_${Date.now()}.png`);
      
      await fs.promises.writeFile(filePath, finalBuffer);
      await api.sendMessage({ attachment: fs.createReadStream(filePath) }, event.threadID);
      fs.unlinkSync(filePath);
      return;
    }

    // REMOVE - Theme RED
    if (args[0] === "remove" || args[0] === "-r") {
      if (!uids.length) return message.reply("⚠️ Spécifie une cible: mention, reply ou UID");

      const removed = [];
      for (const uid of uids) {
        const idx = botConfig.adminBot.indexOf(uid);
        if (idx !== -1) {
          botConfig.adminBot.splice(idx, 1);
          removed.push(uid);
        }
      }
      writeFileSync(global.client.dirConfig, JSON.stringify(botConfig, null, 2));

      const admins = await Promise.all(removed.map(async uid => ({ uid, name: await getName(uid) })));
      const imageBuffer = await drawAdminCardUltra("PRIVILÈGES RÉVOQUÉS", admins, "red", api, botConfig);
      const textToHide = `❌ ACCÈS TERMINÉ\n` + admins.map(a => `🔸 ${a.name} (${a.uid})`).join("\n");
      const finalBuffer = Buffer.concat([imageBuffer, Buffer.from(`${SPOILER_TAG}${textToHide}`, "utf-8")]);

      const dirCache = global.client.dirCache || path.join(__dirname, "cache");
      if (!fs.existsSync(dirCache)) fs.mkdirSync(dirCache, { recursive: true });
      const filePath = path.join(dirCache, `admin_remove_${Date.now()}.png`);
      
      await fs.promises.writeFile(filePath, finalBuffer);
      await api.sendMessage({ attachment: fs.createReadStream(filePath) }, event.threadID);
      fs.unlinkSync(filePath);
      return;
    }

    return message.reply("💡 Syntaxe: list │ add │ remove");
  }
};
