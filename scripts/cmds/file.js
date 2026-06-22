const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const { config } = global.GoatBot;

function fancyText(text) {
  return global.utils?.toGlobalFontStyle ? global.utils.toGlobalFontStyle(text) : text;
}

// --- FONCTION DE GÉNÉRATION DE CANVAS STYLE DARK PREMIUM ---
async function generateFileCanvas(fileName, status, senderName) {
    const width = 900; 
    const height = 380; 
    const padding = 55;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Fond Ultra Dark Premium
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, height);
    gradient.addColorStop(0, '#16161c');
    gradient.addColorStop(1, '#08080a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Bordure Fine Or Ambré
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 3; 
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // 3. En-tête / Message principal agrandi
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif'; 
    ctx.fillText(`Hey ${senderName}, extraction demandée`, padding, 70);

    ctx.fillStyle = '#d4af37'; 
    ctx.font = 'bold 14px monospace'; 
    ctx.fillText(`CORE FILE EXTRACTOR PROTOCOL v1.3 • PREMIUM ACCESS`, padding, 100);

    // Ligne de séparation
    ctx.strokeStyle = '#282830';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, 115);
    ctx.lineTo(width - padding, 115);
    ctx.stroke();

    // 4. Blocs de Données (Target File vs Status)
    const boxWidth = (width - (padding * 2) - 30) / 2;
    const boxHeight = 120; 
    const boxY = 145;

    // --- BLOC FICHIER ---
    const box1X = padding;
    ctx.fillStyle = '#0f0f12';
    ctx.beginPath();
    ctx.roundRect(box1X, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#1e1e24';
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(box1X, boxY + 25, 5, boxHeight - 50);

    ctx.font = 'bold 15px sans-serif'; 
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('TARGET FILE', box1X + 25, boxY + 38);
    
    ctx.font = 'bold 28px monospace'; 
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fileName, box1X + 25, boxY + 82);

    // --- BLOC STATUT ---
    const box2X = box1X + boxWidth + 30;
    ctx.fillStyle = '#0f0f12';
    ctx.beginPath();
    ctx.roundRect(box2X, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#1e1e24';
    ctx.stroke();

    const isSuccess = status.includes("SUCCESS");
    ctx.fillStyle = isSuccess ? '#d4af37' : '#ff453a';
    ctx.fillRect(box2X, boxY + 25, 5, boxHeight - 50);

    ctx.font = 'bold 15px sans-serif'; 
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('EXTRACTION STATUS', box2X + 25, boxY + 38);
    
    ctx.font = 'bold 28px monospace'; 
    ctx.fillStyle = isSuccess ? '#d4af37' : '#ff453a';
    ctx.fillText(status, box2X + 25, boxY + 82);

    // 5. Footer Premium
    ctx.textAlign = 'center';
    ctx.font = '13px monospace'; 
    ctx.fillStyle = '#4a4a52';
    ctx.fillText(`SECURE FILE TRANSMISSION • RAYD SYSTEMS PREMIUM`, width / 2, height - 40);

    // Sauvegarde temporaire en cache
    const dirCache = global.client.dirCache || path.join(__dirname, "cache");
    await fs.ensureDir(dirCache);
    const imagePath = path.join(dirCache, `file_premium_${Date.now()}.png`);
    await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
    return imagePath;
}

// --- MODULE PRINCIPAL ---
module.exports = {
  config: {
    name: "file",
    aliases: ["src", "readfile"],
    version: "1.3.0",
    author: "rayd",
    countDown: 5,
    role: 2, 
    shortDescription: { en: "Get command code in copyable format + Dark Premium canvas" },
    longDescription: { en: "Extracts and sends the source code of any command file inline for easy copying." },
    category: "owner",
    guide: { en: "{pn} [nom_commande]" }
  },

  onStart: async function ({ message, event, args, usersData }) {
    const devArray = config.developer || config.devUsers || config.developers || [];
    
    if (!devArray.includes(event.senderID)) {
      return message.reply(fancyText("✕ Accès refusé : Ce protocole est strictement réservé à l'équipe de développement RAYD."));
    }

    let senderName = "Développeur";
    try {
        senderName = await usersData.getName(event.senderID) || "Développeur";
    } catch (e) {}

    const commandName = args[0];
    if (!commandName) {
        const errPath = await generateFileCanvas("None", "ERROR: MISSING ARG", senderName);
        await message.reply({
            body: fancyText("⚠️ Veuillez spécifier le nom d'une commande."),
            attachment: fs.createReadStream(errPath)
        });
        return await fs.unlink(errPath);
    }

    const commandsDir = path.join(__dirname, '..', 'cmds'); 
    const targetFileName = commandName.endsWith('.js') ? commandName : `${commandName}.js`;
    let filePath = path.join(__dirname, targetFileName); 

    if (!fs.existsSync(filePath)) {
        filePath = path.join(commandsDir, targetFileName); 
    }

    if (!fs.existsSync(filePath)) {
        const failPath = await generateFileCanvas(targetFileName, "ERROR: NOT FOUND", senderName);
        await message.reply({
            body: fancyText(`❌ Impossible de localiser le fichier ${targetFileName} dans le dépôt.`),
            attachment: fs.createReadStream(failPath)
        });
        return await fs.unlink(failPath);
    }

    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const canvasPath = await generateFileCanvas(targetFileName, "SUCCESS: EXTRACTED", senderName);

        // On envoie l'image d'illustration ET le texte directement copiable en dessous
        await message.reply({
            body: `📦 **Extraction réussie pour ${targetFileName}** :\n\n\`\`\`javascript\n${fileContent}\n\`\`\``,
            attachment: fs.createReadStream(canvasPath)
        });

        return await fs.unlink(canvasPath);

    } catch (error) {
        const errTrackPath = await generateFileCanvas(targetFileName, "ERROR: FAILED", senderName);
        await message.reply({
            body: fancyText(`⚠️ Une erreur est survenue lors de la lecture : ${error.message}`),
            attachment: fs.createReadStream(errTrackPath)
        });
        return await fs.unlink(errTrackPath);
    }
  }
};
