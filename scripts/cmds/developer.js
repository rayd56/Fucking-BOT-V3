const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

function fancyText(text) {
  return global.utils?.toGlobalFontStyle ? global.utils.toGlobalFontStyle(text) : text;
}

// --- FONCTION DE GÉNÉRATION DE CANVAS STYLE DARK PREMIUM ---
async function generateDevCanvas(title, usersList) {
    const width = 850;
    const itemHeight = 110;
    const padding = 50;
    const headerHeight = 140;
    const footerHeight = 60;
    
    const count = usersList.length || 1;
    const height = headerHeight + (count * itemHeight) + footerHeight;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Fond Ultra Dark Premium
    const gradient = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, height);
    gradient.addColorStop(0, '#141419');
    gradient.addColorStop(1, '#0a0a0c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Bordure Fine Étoilée / Or Ambré
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    // 3. En-tête
    ctx.fillStyle = '#d4af37'; // Couleur Or / Bronze
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(title, padding, 75);

    ctx.fillStyle = '#8e8e93';
    ctx.font = '16px sans-serif';
    ctx.fillText(`SYSTÈME DE SÉCURITÉ ET INTERFACE DÉVELOPPEURS`, padding, 105);

    // Ligne de séparation
    ctx.strokeStyle = '#222226';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 120);
    ctx.lineTo(width - padding, 120);
    ctx.stroke();

    // 4. Liste des Développeurs
    let currentY = headerHeight;

    if (usersList.length === 0) {
        ctx.fillStyle = '#ff453a';
        ctx.font = 'italic 20px sans-serif';
        ctx.fillText("Aucun développeur enregistré dans le protocole.", padding, currentY + 40);
    } else {
        for (const user of usersList) {
            // Background Glassmorphic sombre
            ctx.fillStyle = '#111115';
            ctx.beginPath();
            ctx.roundRect(padding, currentY, width - (padding * 2), itemHeight - 15, 12);
            ctx.fill();
            
            ctx.strokeStyle = '#1c1c21';
            ctx.stroke();

            const avatarRadius = 32;
            const avatarX = padding + 40;
            const avatarY = currentY + (itemHeight - 15) / 2;

            // Avatar par défaut
            ctx.fillStyle = '#2c2c31';
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
            ctx.fill();

            // Tentative de chargement de l'avatar Facebook
            const avatarUrl = `https://graph.facebook.com/${user.uid}/picture?height=200&width=200&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            try {
                const img = await loadImage(avatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                ctx.restore();
            } catch (e) {
                try {
                    const backupImg = await loadImage(`https://api.mestaria.com/fb/avatar?id=${user.uid}`);
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(backupImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                    ctx.restore();
                } catch(err) {}
            }

            // Textes
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(user.name, avatarX + 55, currentY + 42);

            ctx.fillStyle = '#636366';
            ctx.font = '500 15px monospace';
            ctx.fillText(`UID: ${user.uid}`, avatarX + 55, currentY + 67);

            currentY += itemHeight;
        }
    }

    // 5. Footer
    ctx.fillStyle = '#3a3a3c';
    ctx.font = '13px monospace';
    ctx.fillText(`DEVELOPER MATRIX • ${new Date().toLocaleDateString('fr-FR')} • RAYD PREMIUM`, padding, height - 30);

    // Sauvegarde en cache
    const dirCache = global.client.dirCache || path.join(__dirname, "cache");
    await fs.ensureDir(dirCache);
    const imagePath = path.join(dirCache, `dev_${Date.now()}.png`);
    await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
    return imagePath;
}

// --- MODULE PRINCIPAL ---
module.exports = {
  config: {
    name: "developer",
    aliases: ["dev"],
    version: "3.0",
    author: "rayd",
    countDown: 5,
    role: 5,
    shortDescription: { en: "Add, remove developer role with high-tech UI" },
    longDescription: { en: "Manage developers using an elite dark-themed dashboard visualization." },
    category: "owner",
    guide: { en: "{pn} [add/remove/list]" }
  },

  langs: {
    en: {
      missingIdAdd: fancyText("⚠️ | Reply / tag / UID required to add developer"),
      missingIdRemove: fancyText("⚠️ | Reply / tag / UID required to remove developer"),
    }
  },

  onStart: async function ({ message, args, usersData, event, api }) {
    let devArray = config.developer || config.devUsers || config.developers || [];
    devArray = devArray.filter(uid => uid && uid.toString().trim() !== "" && !isNaN(uid));

    const getUserInfo = async (uid) => {
      try {
        try { const name = await usersData.getName(uid); if (name && name !== "Unknown User" && name !== "null") return { uid, name }; } catch {}
        try { const userInfo = await api.getUserInfo(uid); if (userInfo && userInfo[uid]) return { uid, name: userInfo[uid].name || userInfo[uid].firstName || "Unknown User" }; } catch {}
        try { const response = await axios.get(`https://graph.facebook.com/${uid}?fields=name&access_token=EAABwzLixnjYBO`, { timeout: 5000 }); if (response.data && response.data.name) return { uid, name: response.data.name }; } catch {}
        return { uid, name: `User_${uid.substring(0, 8)}` };
      } catch { return { uid, name: `User_${uid.substring(0, 8)}` }; }
    };

    const getUIDs = () => {
      let uids = [];
      if (event.mentions && Object.keys(event.mentions).length > 0) uids = Object.keys(event.mentions);
      else if (event.messageReply && event.messageReply.senderID) uids.push(event.messageReply.senderID);
      else if (args.length > 1) uids = args.slice(1).filter(id => !isNaN(id) && id.trim() !== "");
      else if (args[0] === "add" && args.length === 1) uids.push(event.senderID);
      return [...new Set(uids.map(id => id.toString().trim()))];
    };

    const sub = (args[0] || "").toLowerCase();

    // --- LISTE DES DÉVELOPPEURS ---
    if (sub === "list" || sub === "-l") {
      if (!devArray.length) return message.reply(fancyText("⚠️ | No developers found"));
      
      const devs = await Promise.all(devArray.map(uid => getUserInfo(uid)));
      const imagePath = await generateDevCanvas("✦ CORE DEVELOPERS", devs);
      
      await message.reply({
        body: fancyText(`🔳 **PANEL MASTER DEV [${devArray.length}]**`),
        attachment: fs.createReadStream(imagePath)
      });
      return await fs.unlink(imagePath);
    }

    // --- AJOUT D'UN DÉVELOPPEUR ---
    if (sub === "add" || sub === "-a") {
      const uids = getUIDs();
      if (!uids.length) return message.reply(this.langs.en.missingIdAdd);
      
      const added = [], already = [];
      let newDevArray = [...devArray];
      
      for (const uid of uids) { 
        if (newDevArray.includes(uid)) already.push(uid); 
        else { newDevArray.push(uid); added.push(uid); } 
      }
      
      if (added.length > 0) { 
        config.developer = newDevArray; config.devUsers = newDevArray; this.saveConfig();
        const addedInfo = await Promise.all(added.map(uid => getUserInfo(uid)));
        
        const imagePath = await generateDevCanvas("✓ PRIVILÈGES DÉVELOPPEUR", addedInfo);
        await message.reply({
          body: fancyText(`✅ Droits de développement attribués à ${added.length} utilisateur(s).`),
          attachment: fs.createReadStream(imagePath)
        });
        await fs.unlink(imagePath);
      }
      
      if (already.length > 0) { 
        const alreadyInfo = await Promise.all(already.map(uid => getUserInfo(uid)));
        return message.reply(fancyText(`⚠️ Déjà enregistrés :\n${alreadyInfo.map(i => `• ${i.name} (${i.uid})`).join("\n")}`)); 
      }
      return;
    }

    // --- SUPPRESSION D'UN DÉVELOPPEUR ---
    if (sub === "remove" || sub === "-r") {
      const uids = getUIDs();
      if (!uids.length) return message.reply(this.langs.en.missingIdRemove);
      
      const removed = [], notDev = [];
      let newDevArray = [...devArray];
      
      for (const uid of uids) { 
        const index = newDevArray.indexOf(uid); 
        if (index !== -1) { newDevArray.splice(index,1); removed.push(uid); } 
        else notDev.push(uid); 
      }
      
      if (removed.length > 0) { 
        config.developer = newDevArray; config.devUsers = newDevArray; this.saveConfig();
        const removedInfo = await Promise.all(removed.map(uid => getUserInfo(uid)));
        
        const imagePath = await generateDevCanvas("✕ ACCÈS RÉVOQUÉ", removedInfo);
        await message.reply({
          body: fancyText(`❌ Rôle développeur désactivé pour ${removed.length} utilisateur(s).`),
          attachment: fs.createReadStream(imagePath)
        });
        await fs.unlink(imagePath);
      }
      
      if (notDev.length > 0) { 
        const notDevInfo = await Promise.all(notDev.map(uid => getUserInfo(uid)));
        return message.reply(fancyText(`⚠️ Non enregistrés :\n${notDevInfo.map(i => `• ${i.name} (${i.uid})`).join("\n")}`)); 
      }
      return;
    }

    // --- CORRECTION DES NOMS ---
    if (sub === "fixnames" || sub === "-fn") {
      if (!devArray.length) return message.reply(fancyText("⚠️ | No developers to fix"));
      
      const devs = await Promise.all(devArray.map(uid => getUserInfo(uid)));
      const imagePath = await generateDevCanvas("🛠️ PROTOCOLE MISE À JOUR", devs);
      
      await message.reply({
        body: fancyText(`🛠️ Indexation et rafraîchissement des identités achevés.`),
        attachment: fs.createReadStream(imagePath)
      });
      return await fs.unlink(imagePath);
    }

    return message.reply(fancyText("❌ Commande invalide. Spécifiez : list │ add │ remove │ fixnames"));
  },

  saveConfig: function() {
    try { 
      writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2)); 
      console.log(fancyText("✅ Config saved successfully")); 
    } catch (error) { 
      console.error(fancyText("❌ Error saving config:"), error); 
    }
  }
};
