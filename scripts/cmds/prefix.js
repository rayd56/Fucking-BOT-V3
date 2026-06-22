const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function generatePrefixCanvas(globalPrefix, threadPrefix, senderName) {
    const width = 850;
    const height = 350; 
    const cardX = 35;
    const cardY = 35;
    const cardW = width - 70;
    const cardH = height - 70;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const theme = {
        bg: "#060913",
        card: "rgba(13, 21, 39, 0.85)",
        accent: "#00f0ff",
        accent2: "#ff0055",
        text: "#ffffff"
    };

    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width);
    bgGrad.addColorStop(0, "#111930");
    bgGrad.addColorStop(1, theme.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.06;
    for(let i = 0; i < height; i += 2) {
        ctx.fillStyle = theme.accent;
        ctx.fillRect(0, i, width, 1);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(width, 0, 0, width, 0, 300);
    glow.addColorStop(0, hexToRgba(theme.accent2, 0.35));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(width - 300, 0, 300, height);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 25;
    ctx.fillStyle = theme.card;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, theme.accent);
    borderGrad.addColorStop(1, theme.accent2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const reflect = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 40);
    reflect.addColorStop(0, "rgba(255,255,255,0.12)");
    reflect.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = reflect;
    ctx.fillRect(cardX, cardY, cardW, 40);

    ctx.font = "bold 20px Arial";
    ctx.fillStyle = theme.text;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 10;
    ctx.fillText(`Hey ${senderName}, tu as demandé mon prefix`, cardX + 30, cardY + 45);
    ctx.shadowBlur = 0;

    ctx.font = "12px monospace";
    ctx.fillStyle = hexToRgba(theme.text, 0.5);
    ctx.fillText("SYSTEM CONFIGURATION PROTOCOL v2.1", cardX + 30, cardY + 70);

    const lineGrad = ctx.createLinearGradient(cardX + 30, 0, cardX + cardW - 30, 0);
    lineGrad.addColorStop(0, theme.accent);
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cardX + 30, cardY + 85);
    ctx.lineTo(cardX + cardW - 30, cardY + 85);
    ctx.stroke();

    const boxWidth = (cardW - 80) / 2;
    const boxHeight = 95;
    const boxY = cardY + 110;

    const box1X = cardX + 30;
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(box1X, boxY, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.fillRect(box1X, boxY + 20, 4, boxHeight - 40);

    ctx.font = "bold 13px Arial";
    ctx.fillStyle = hexToRgba(theme.text, 0.4);
    ctx.fillText("GLOBAL SYSTEM PREFIX", box1X + 20, boxY + 32);
    
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = theme.text;
    ctx.fillText(globalPrefix, box1X + 20, boxY + 75);

    const box2X = box1X + boxWidth + 20;
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(box2X, boxY, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.accent2;
    ctx.fillRect(box2X, boxY + 20, 4, boxHeight - 40);

    ctx.font = "bold 13px Arial";
    ctx.fillStyle = hexToRgba(theme.text, 0.4);
    ctx.fillText("CURRENT CHAT PREFIX", box2X + 20, boxY + 32);
    
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = theme.accent2; 
    ctx.fillText(threadPrefix, box2X + 20, boxY + 75);

    ctx.textAlign = "center";
    ctx.font = "10px monospace";
    ctx.fillStyle = hexToRgba(theme.text, 0.3);
    ctx.fillText(`SECURE PROTOCOL TRANSMISSION • RAYD SYSTEMS`, width / 2, height - 50);

    const dirCache = global.client?.dirCache || path.join(process.cwd(), "cache");
    await fs.ensureDir(dirCache);
    const imagePath = path.join(dirCache, `prefix_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`);
    await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
    return imagePath;
}

module.exports = {
  config: {
    name: "prefix",
    aliases: ["prefixe", "pre"],
    version: "2.1.3",
    author: "Rayd",
    countDown: 5,
    role: 0, // Public pour tout le monde
    shortDescription: { en: "Show bot prefix" },
    longDescription: { en: "Displays global and chat prefix" },
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event, threadsData, usersData }) {
    // Récupération sécurisée du préfixe global
    const globalPrefix = global.GoatBot?.config?.prefix || "•";
    let threadPrefix = globalPrefix;
    let senderName = "Utilisateur";
    let imagePath = null;
    
    // Récupération sécurisée du préfixe du groupe
    try {
        if (threadsData && event.threadID) {
            const threadData = await threadsData.get(event.threadID);
            threadPrefix = threadData?.data?.prefix || globalPrefix;
        }
    } catch (e) {
        console.log("Erreur threadsData ignorée pour compatibilité publique.");
    }

    // Récupération sécurisée du nom de l'utilisateur
    try {
        if (usersData && event.senderID) {
            senderName = await usersData.getName(event.senderID) || "Utilisateur";
        }
    } catch (e) {
        console.log("Erreur usersData ignorée pour compatibilité publique.");
    }

    try {
        imagePath = await generatePrefixCanvas(globalPrefix, threadPrefix, senderName);
        
        await message.reply({
          body: `⚙️ **PREFIX**\nGlobal: ${globalPrefix}\nCe chat: ${threadPrefix}`,
          attachment: fs.createReadStream(imagePath)
        });
    } catch (error) {
        console.error("Erreur de génération d'image, envoi du texte seul :", error);
        return message.reply(`⚙️ **PREFIX**\nGlobal: ${globalPrefix}\nCe chat: ${threadPrefix}`);
    } finally {
        if (imagePath && fs.existsSync(imagePath)) {
            try { await fs.unlink(imagePath); } catch (e) {}
        }
    }
  }
};
