const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const { config } = global.GoatBot;

function fancyText(text) {
  return global.utils?.toGlobalFontStyle ? global.utils.toGlobalFontStyle(text) : text;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- FONCTION DE GÉNÉRATION DE CANVAS DYNAMIQUE CYBERPUNK ---
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
        accent: "#00f0ff", // Bleu électrique
        accent2: "#ff0055", // Rose Cyber
        text: "#ffffff"
    };

    // 1. Fond Cyberpunk dégradé radial
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width);
    bgGrad.addColorStop(0, "#111930");
    bgGrad.addColorStop(1, theme.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Effet Scanlines d'arrière-plan
    ctx.globalAlpha = 0.06;
    for(let i = 0; i < height; i += 2) {
        ctx.fillStyle = theme.accent;
        ctx.fillRect(0, i, width, 1);
    }
    ctx.globalAlpha = 1;

    // Halos néon composites
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(width, 0, 0, width, 0, 300);
    glow.addColorStop(0, hexToRgba(theme.accent2, 0.35));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(width - 300, 0, 300, height);
    ctx.restore();

    // 2. Card principale en Glassmorphism
    ctx.save();
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 25;
    ctx.fillStyle = theme.card;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    // Bordure dégradée néon
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, theme.accent);
    borderGrad.addColorStop(1, theme.accent2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Reflection supérieure
    const reflect = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 40);
    reflect.addColorStop(0, "rgba(255,255,255,0.12)");
    reflect.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = reflect;
    ctx.fillRect(cardX, cardY, cardW, 40);

    // 3. Message d'accueil personnalisé demandé
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = theme.text;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 10;
    ctx.fillText(`Hey ${senderName}, tu as demandé mon prefix`, cardX + 30, cardY + 45);
    ctx.shadowBlur = 0;

    ctx.font = "12px monospace";
    ctx.fillStyle = hexToRgba(theme.text, 0.5);
    ctx.fillText("SYSTEM CONFIGURATION PROTOCOL v2.1", cardX + 30, cardY + 70);

    // Ligne séparatrice
    const lineGrad = ctx.createLinearGradient(cardX + 30, 0, cardX + cardW - 30, 0);
    lineGrad.addColorStop(0, theme.accent);
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cardX + 30, cardY + 85);
    ctx.lineTo(cardX + cardW - 30, cardY + 85);
    ctx.stroke();

    // 4. Blocs de Données Dynamiques (Global vs Local)
    const boxWidth = (cardW - 80) / 2;
    const boxHeight = 95;
    const boxY = cardY + 110;

    // --- BLOC GLOBAL ---
    const box1X = cardX + 30;
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(box1X, boxY, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    // Indicateur visuel bleu
    ctx.fillStyle = theme.accent;
    ctx.fillRect(box1X, boxY + 20, 4, boxHeight - 40);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = hexToRgba(theme.text, 0.4);
    ctx.fillText("GLOBAL SYSTEM PREFIX", box1X + 20, boxY + 32);
    
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = theme.text;
    ctx.fillText(globalPrefix, box1X + 20, boxY + 75);

    // --- BLOC THIS CHAT ---
    const box2X = box1X + boxWidth + 20;
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(box2X, boxY, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Indicateur visuel rose
    ctx.fillStyle = theme.accent2;
    ctx.fillRect(box2X, boxY + 20, 4, boxHeight - 40);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = hexToRgba(theme.text, 0.4);
    ctx.fillText("CURRENT CHAT PREFIX", box2X + 20, boxY + 32);
    
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = theme.accent2; 
    ctx.fillText(threadPrefix, box2X + 20, boxY + 75);

    // 5. Bas de page / Footer Hologramme
    ctx.textAlign = "center";
    ctx.font = "10px monospace";
    ctx.fillStyle = hexToRgba(theme.text, 0.3);
    ctx.fillText(`SECURE PROTOCOL TRANSMISSION • RAYD SYSTEMS GROUP`, width / 2, height - 50);

    // Chemin sécurisé vers le dossier cache (local ou global)
    const dirCache = global.client?.dirCache || path.join(__dirname, "cache");
    await fs.ensureDir(dirCache);
    const imagePath = path.join(dirCache, `prefix_cyber_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`);
    await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
    return imagePath;
}

// --- MODULE PRINCIPAL ---
module.exports = {
  config: {
    name: "prefix",
    aliases: ["prefixe"],
    version: "2.1.1",
    author: "rayd",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Show bot prefix in a cyberpunk neon UI" },
    longDescription: { en: "Displays the global and current chat prefix inside an advanced dynamic neon grid canvas with user greetings." },
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event, threadsData, usersData }) {
    const globalPrefix = config.prefix || "•";
    let threadPrefix = globalPrefix;
    let senderName = "Utilisateur";
    let imagePath = null;
    
    try {
        if (threadsData && event.threadID) {
            const threadData = await threadsData.get(event.threadID);
            if (threadData && threadData.data && threadData.data.prefix) {
                threadPrefix = threadData.data.prefix;
            }
        }
    } catch (e) {
        console.error("Erreur threadsData:", e);
    }

    try {
        if (usersData && event.senderID) {
            const name = await usersData.getName(event.senderID);
            if (name) senderName = name;
        }
    } catch (e) {
        console.error("Erreur usersData:", e);
    }

    try {
        imagePath = await generatePrefixCanvas(globalPrefix, threadPrefix, senderName);
        
        await message.reply({
          body: fancyText(`⚙️ **PREFIX CONFIGURATION**\n\nGlobal : ${globalPrefix}\nThis chat : ${threadPrefix}`),
          attachment: fs.createReadStream(imagePath)
        });
    } catch (error) {
        console.error("Erreur de génération du préfixe:", error);
        // Secours textuel au cas où le canvas échoue totalement pour un utilisateur
        return message.reply(`⚙️ **PREFIX CONFIGURATION**\n\nGlobal : ${globalPrefix}\nThis chat : ${threadPrefix}`);
    } finally {
        if (imagePath && fs.existsSync(imagePath)) {
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.error("Erreur suppression fichier:", err);
            }
        }
    }
  }
};
