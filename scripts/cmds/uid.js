const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const { findUid } = global.utils;
const regExCheckURL = /^(http|https):\/\/[^ "]+$/;

function fancyText(text) {
  return global.utils?.toGlobalFontStyle ? global.utils.toGlobalFontStyle(text) : text;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- FONCTION DE GÉNÉRATION DU CANVAS DESIGN CYBERPUNK PREMIUM ---
async function generateUidCanvas(usersList) {
    const width = 850;
    const itemHeight = 120;
    const padding = 50;
    const headerHeight = 140;
    const footerHeight = 60;
    
    const count = usersList.length || 1;
    const height = headerHeight + (count * itemHeight) + footerHeight;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const theme = {
        bg: "#060913",
        card: "rgba(11, 19, 38, 0.88)",
        accent: "#00f0ff", // Bleu néon électro
        accent2: "#ff0055", // Rose néon cyber
        text: "#ffffff"
    };

    // 1. Fond Cyberpunk de profondeur (Radial Gradient)
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
    bgGrad.addColorStop(0, "#121b36");
    bgGrad.addColorStop(1, theme.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grille de scanlines discrète
    ctx.globalAlpha = 0.04;
    for(let i = 0; i < height; i += 2) {
        ctx.fillStyle = theme.accent;
        ctx.fillRect(0, i, width, 1);
    }
    ctx.globalAlpha = 1;

    // 2. Vitre principale Glassmorphic à angles doux
    ctx.save();
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 30;
    ctx.fillStyle = theme.card;
    ctx.beginPath();
    ctx.roundRect(30, 30, width - 60, height - 60, 20);
    ctx.fill();

    // Bordure néon avec fondu linéaire
    const borderGrad = ctx.createLinearGradient(30, 30, width - 30, height - 30);
    borderGrad.addColorStop(0, theme.accent);
    borderGrad.addColorStop(0.5, "#ffffff");
    borderGrad.addColorStop(1, theme.accent2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Brillance du verre (Reflection)
    const reflect = ctx.createLinearGradient(30, 30, 30, 80);
    reflect.addColorStop(0, "rgba(255,255,255,0.15)");
    reflect.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = reflect;
    ctx.fillRect(30, 30, width - 60, 50);

    // 3. Section En-tête (Header)
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = theme.text;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 15;
    ctx.fillText("IDENTITY MATRIX SYSTEM", padding, 80);
    ctx.shadowBlur = 0;

    ctx.font = "13px monospace";
    ctx.fillStyle = hexToRgba(theme.text, 0.45);
    ctx.fillText("DECENTRALIZED DATA SCANNER // USER EXTRACt", padding, 105);

    // Ligne néon horizontale fine
    const lineGrad = ctx.createLinearGradient(padding, 0, width - padding, 0);
    lineGrad.addColorStop(0, theme.accent);
    lineGrad.addColorStop(0.7, theme.accent2);
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, 120);
    ctx.lineTo(width - padding, 120);
    ctx.stroke();

    // 4. Listing des Nodes Identités
    let currentY = headerHeight;

    for (const user of usersList) {
        // Fond de fiches élégantes
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.roundRect(padding, currentY, width - (padding * 2), itemHeight - 20, 14);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.stroke();

        // Barre lumineuse de profil d'indexation
        ctx.fillStyle = theme.accent;
        ctx.fillRect(padding, currentY + 20, 4, itemHeight - 60);

        const avatarSize = 64;
        const avatarX = padding + 35;
        const avatarY = currentY + (itemHeight - 20 - avatarSize) / 2;

        // Cercle d'arrière-plan d'avatar
        ctx.fillStyle = '#17223b';
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Injection asynchrone de la photo de profil réelle
        if (user.uid && !isNaN(user.uid)) {
            const avatarUrl = `https://graph.facebook.com/${user.uid}/picture?height=200&width=200&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            try {
                const img = await loadImage(avatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
                ctx.restore();
            } catch (e) {}
        }

        // Contour néon entourant l'avatar
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
        ctx.stroke();

        // Textes d'identité associés
        ctx.textAlign = "left";
        ctx.fillStyle = theme.text;
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(user.name, avatarX + avatarSize + 25, currentY + 44);

        ctx.fillStyle = theme.accent2;
        ctx.font = "bold 16px monospace";
        ctx.fillText(`UID: ${user.uid}`, avatarX + avatarSize + 25, currentY + 72);

        currentY += itemHeight;
    }

    // 5. Section de Bas de page (Footer)
    ctx.textAlign = "left";
    ctx.font = "11px monospace";
    ctx.fillStyle = hexToRgba(theme.text, 0.35);
    ctx.fillText(`DATA TRANSMISSION RECOVERY SECURE • DESIGN BY RAYD`, padding, height - 40);

    // Enregistrement final de l'image mise en cache
    const dirCache = global.client.dirCache || path.join(__dirname, "cache");
    await fs.ensureDir(dirCache);
    const imagePath = path.join(dirCache, `uid_${Date.now()}.png`);
    await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
    return imagePath;
}

// --- CONFIGURATION ET STRUCTURE DU MODULE ---
module.exports = {
  config: {
    name: "uid",
    version: "2.1.0",
    author: "rayd",
    countDown: 5,
    role: 0,
    description: {
      vi: "Xem user id facebook của người dùng",
      en: "View facebook user id of user via high-fidelity Cyberpunk Canvas interface"
    },
    category: "info",
    guide: {
      en: "   {pn}: Displays your own identity data card"
        + "\n   {pn} @tag: Displays data card for tagged accounts"
        + "\n   {pn} <profile link>: Extract and render profile link identifier"
        + "\n   Reply to a message with the command to scan their UID card"
    }
  },

  langs: {
    en: {
      syntaxError: "⚠️ | Please mention a user, reply to a message, or provide a valid profile link."
    }
  },

  onStart: async function ({ message, event, args, usersData, getLang }) {
    const dataToCompile = [];

    const getName = async (uid) => {
        try {
            return await usersData.getName(uid) || "Target Matrix Node";
        } catch (e) {
            return "Target Matrix Node";
        }
    };

    // Case 1: Message Reply
    if (event.messageReply) {
        const uid = event.messageReply.senderID;
        const name = await getName(uid);
        dataToCompile.push({ uid, name });
    }
    // Case 2: No arguments (Self check)
    else if (!args[0]) {
        const uid = event.senderID;
        const name = await getName(uid);
        dataToCompile.push({ uid, name });
    }
    // Case 3: Profile URLs
    else if (args[0].match(regExCheckURL)) {
        for (const link of args) {
            try {
                const uid = await findUid(link);
                const name = await getName(uid);
                dataToCompile.push({ uid: uid.toString(), name });
            } catch (e) {
                dataToCompile.push({ uid: "ERROR/UNRESOLVED", name: link.substring(0, 30) });
            }
        }
    }
    // Case 4: Mentions
    else if (event.mentions && Object.keys(event.mentions).length > 0) {
        for (const id in event.mentions) {
            const name = event.mentions[id].replace("@", "");
            dataToCompile.push({ uid: id.toString(), name });
        }
    }

    // Verification and Rendering execution
    if (dataToCompile.length === 0) {
        return message.reply(getLang("syntaxError"));
    }

    const imagePath = await generateUidCanvas(dataToCompile);
    
    await message.reply({
        body: fancyText(`🔳 **SCANNER IDENTITÉ COMPLET** [${dataToCompile.length} enregistrement(s)]`),
        attachment: fs.createReadStream(imagePath)
    });

    return await fs.unlink(imagePath);
  }
};
