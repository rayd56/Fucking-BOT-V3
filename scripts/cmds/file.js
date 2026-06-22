const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "file",
    version: "1.0",
    author: "OtinXShiva",
    countDown: 5,
    role: 2,
    shortDescription: "Envoie le script d'une commande",
    longDescription: "Envoie le code source d'un fichier.js du bot",
    category: "owner",
    guide: "{pn} file nom_fichier. Ex:.{pn} file menu"
  },

  onStart: async function ({ message, args, api, event }) {
    // UID de ton compte admin - change-le
    const permission = ["61577243652962"];
    if (!permission.includes(event.senderID)) {
      return api.sendMessage("🔒 Seul mon maître peut utiliser cette commande", event.threadID, event.messageID);
    }

    const fileName = args[0];
    if (!fileName) {
      return api.sendMessage("⛔ Syntaxe:.file nom_fichier", event.threadID, event.messageID);
    }

    const filePath = path.join(__dirname, `${fileName}.js`);

    if (!fs.existsSync(filePath)) {
      return api.sendMessage(`❌ Fichier introuvable: ${fileName}.js`, event.threadID, event.messageID);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    // WhatsApp coupe à 65535 caractères, donc on découpe si trop long
    if (fileContent.length > 4000) {
      return api.sendMessage("⚠️ Fichier trop long pour être envoyé en 1 message", event.threadID);
    }

    api.sendMessage({ body: fileContent }, event.threadID);
  }
};
