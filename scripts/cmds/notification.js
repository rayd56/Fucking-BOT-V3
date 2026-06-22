const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const { config } = global.GoatBot;

function fancyText(text) {
  return global.utils?.toGlobalFontStyle ? global.utils.toGlobalFontStyle(text) : text;
}

// --- FONCTION DE GÉNÉRATION DE CANVAS STYLE LUXURY DIFFUSION ---
async function generateNotiCanvas(adminName, messageContent, totalGroups) {
    const width = 1000; 
    const height = 450; 
    const padding = 65;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Fond Minimaliste Luxury
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.6);
    gradient.addColorStop(0, '#121214');
    gradient.addColorStop(1, '#080809');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Bordure Fine Or Satiné
    const goldGrad = ctx.createLinearGradient(0, 0, width, height);
    goldGrad.addColorStop(0, '#d4af37');
    goldGrad.addColorStop(0.5, '#f3e5ab');
    goldGrad.addColorStop(1, '#aa7c11');
    
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 1.5; 
    ctx.strokeRect(25, 25, width - 50, height - 50);

    // 3. En-tête Épuré
    ctx.fillStyle = '#ffffff';
    ctx.font = '300 24px sans-serif'; 
    ctx.fillText("COMMUNIQUE OFFICIEL", padding, 85);

    ctx.fillStyle = '#d4af37'; 
    ctx.font = '600 13px monospace'; 
    ctx.letterSpacing = "2px"; 
    ctx.fillText(`EMIS PAR : ${adminName.toUpperCase()}  •  CANAL : ${totalGroups} DIRECTS`, padding, 115);

    // Ligne de séparation
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 135);
    ctx.lineTo(width - padding, 135);
    ctx.stroke();

    // 4. Zone d'affichage du message
    const boxY = 175;
    const boxW = width - (padding * 2);
    const boxH = 180;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
    ctx.beginPath();
    ctx.roundRect(padding, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif'; 
    
    const words = messageContent.split(' ');
    let line = '';
    let y = boxY + 70;
    const maxLineWidth = boxW - 40;

    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxLineWidth && n > 0) {
            ctx.fillText(line, padding + 20, y);
            line = words[n] + ' ';
            y += 50; 
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, padding + 20, y);

    // 5. Footer Signature Premium
    ctx.textAlign = 'center';
    ctx.font = '11px monospace'; 
    ctx.fillStyle = '#4a4a4e';
    ctx.fillText(`DISTRIBUTED SECURELY VIA RAYD EXECUTIVE NETWORK`, width / 2, height - 45);

    const dirCache = global.client?.dirCache || path.join(__dirname, "cache");
    await fs.ensureDir(dirCache);
    const imagePath = path.join(dirCache, `noti_chic_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`);
    await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
    return imagePath;
}

// --- MODULE PRINCIPAL ---
module.exports = {
  config: {
    name: "noti",
    aliases: ["notification", "broadcast", "bc"],
    version: "1.1.5",
    author: "rayd",
    countDown: 10,
    role: 2, 
    shortDescription: { en: "Send a notification luxury image + text to all groups" },
    longDescription: { en: "Broadcasts an administrative announcement inside a highly customizable professional canvas." },
    category: "owner",
    guide: { en: "{pn} [votre message]" }
  },

  onStart: async function ({ message, event, args, usersData, threadsData, api }) {
    const devArray = config.developer || config.devUsers || config.developers || [];
    
    if (!devArray.includes(event.senderID.toString())) {
      return message.reply(fancyText("✕ Accès refusé : Connexion sécurisée requise."));
    }

    const content = args.join(" ");
    if (!content) {
        return message.reply(fancyText("✨ Veuillez saisir la note à diffuser globalement."));
    }

    let senderName = "Administrateur";
    try {
        if (usersData && event.senderID) {
            senderName = await usersData.getName(event.senderID) || "Administrateur";
        }
    } catch (e) {}

    // --- STRATÉGIE DE RÉCUPÉRATION COMPLÈTE DES GROUPES ---
    let allThreadIDs = [];
    try {
        // Méthode 1 : Récupération depuis la base de données du bot (le plus fiable sur GoatBot)
        if (threadsData && typeof threadsData.getAll === 'function') {
            const allThreadsRaw = await threadsData.getAll() || [];
            allThreadIDs = allThreadsRaw
                .filter(t => t && t.threadID && t.isGroup !== false)
                .map(t => t.threadID.toString());
        }
    } catch (e) {
        console.error("Échec de la récupération via threadsData, tentative via API...", e);
    }

    // Méthode de secours 2 : Si la BDD est vide, on force l'API Facebook à fouiller l'inbox
    if (allThreadIDs.length === 0) {
        try {
            const inbox = await api.getThreadList(500, null, ["INBOX", "OTHER"]) || [];
            allThreadIDs = inbox
                .filter(thread => thread.isGroup === true || thread.isSubscribed === true)
                .map(thread => thread.threadID.toString());
        } catch (err) {
            console.error("Erreur via api.getThreadList:", err);
        }
    }

    // Supprimer les doublons et s'assurer qu'on n'inclut pas des chaînes vides
    allThreadIDs = [...new Set(allThreadIDs)].filter(id => id && id !== "");

    if (allThreadIDs.length === 0) {
        return message.reply("❌ Aucun groupe n'a pu être détecté dans la base de données.");
    }

    let canvasPath = null;
    let successCount = 0;

    try {
        canvasPath = await generateNotiCanvas(senderName, content, allThreadIDs.length);

        // Message initial à l'exécuteur
        await message.reply({
            body: `⚜️ **Transmission du communiqué en cours...**\nAlignement sur ${allThreadIDs.length} canaux réseau détectés.`,
            attachment: fs.createReadStream(canvasPath)
        });

        // Envoi en boucle à TOUS les IDs trouvés
        for (const threadID of allThreadIDs) {
            try {
                await api.sendMessage({
                    body: `✨ **COMMUNIQUÉ DE L'ADMINISTRATION**\n\n${content}`,
                    attachment: fs.createReadStream(canvasPath)
                }, threadID);
                successCount++;
                
                // Pause de sécurité pour éviter le bannissement Facebook (1.2 seconde)
                await new Promise(resolve => setTimeout(resolve, 1200));
            } catch (error) {
                console.error(`Échec d'envoi pour le thread ${threadID}:`, error.message);
            }
        }

        return await message.reply(`✅ **Rapport final disponible**\nTransmissions validées : ${successCount}/${allThreadIDs.length} groupes.`);

    } catch (globalError) {
        console.error("Erreur critique noti:", globalError);
        return message.reply(`❌ Erreur technique : ${globalError.message}`);
    } finally {
        if (canvasPath && fs.existsSync(canvasPath)) {
            try {
                await fs.unlink(canvasPath);
            } catch (err) {
                console.error("Erreur nettoyage cache:", err);
            }
        }
    }
  }
};
