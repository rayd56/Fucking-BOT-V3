const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { utils } = global;

async function sendPrefixCanvas(message, globalPrefix, threadPrefix) {
  const neonBgUrl = "https://files.catbox.moe/52gztq.gif";
  const width = 800, height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  try {
    const background = await loadImage(neonBgUrl);
    ctx.drawImage(background, 0, 0, width, height);
  } catch {
    ctx.fillStyle = "#0c0a1c";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px sans-serif";
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 15;
  ctx.textAlign = "center";
  ctx.fillText("⚡ CONFIGURATION PRÉFIXE ⚡", width / 2, 85);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.shadowBlur = 0;
  ctx.fillRect(120, 130, width - 240, 2);

  ctx.textAlign = "left";
  ctx.font = "bold 26px sans-serif";

  ctx.fillStyle = "#ff007f";
  ctx.shadowColor = "#ff007f";
  ctx.shadowBlur = 8;
  ctx.fillText("🌍 Global System :", 150, 210);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.fillText(`[ ${globalPrefix} ]`, 440, 210);

  ctx.fillStyle = "#00e5ff";
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 8;
  ctx.fillText("💬 Chatbox Unit :", 150, 285);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.fillText(`[ ${threadPrefix} ]`, 440, 285);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffff00";
  ctx.font = "italic 22px sans-serif";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 6;
  ctx.fillText(`Tapez "${threadPrefix}help" pour afficher la liste des commandes`, width / 2, 390);

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

  const cachePath = path.join(cacheDir, `prefix_${Date.now()}.png`);
  fs.writeFileSync(cachePath, canvas.toBuffer("image/png"));

  return message.reply({
    body: `Voici les configurations actuelles de l'assistant :`,
    attachment: fs.createReadStream(cachePath)
  }, () => {
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  });
}

module.exports = {
  config: {
    name: "prefix",
    version: "2.7.1",
    author: "Rayd",
    countDown: 5,
    role: 0,
    description: "Change le préfixe du bot ou l'affiche avec un fond Canvas Neon Ring",
    category: "⚙️ Configuration"
  },

  langs: {
    en: {
      reset: "┌─『 Prefix Reset 』\n│ ✅ Reset to default: %1",
      onlyAdmin: "┌─『 Permission Denied 』\n│ ⛔ Only bot admins can change global prefix!",
      confirmGlobal: "┌─『 Global Prefix Change 』\n│ ⚙️ React to confirm global prefix update.",
      confirmThisThread: "┌─『 Chat Prefix Change 』\n│ ⚙️ React to confirm this chat's prefix update.",
      successGlobal: "┌─『 Prefix Updated 』\n│ ✅ Global prefix: %1",
      successThisThread: "┌─『 Prefix Updated 』─┐\n│ ✅ Chat prefix: %1\n"
    }
  },

  onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
    const globalPrefix = global.GoatBot.config.prefix;
    const threadPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;

    // ✅ SI PAS D'ARGS → ENVOIE CANVAS 1 SEULE FOIS
    if (!args[0]) {
      return sendPrefixCanvas(message, globalPrefix, threadPrefix);
    }

    if (args[0] === "reset") {
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply(getLang("reset", globalPrefix));
    }

    const newPrefix = args[0];
    const formSet = {
      commandName,
      author: event.senderID,
      newPrefix,
      setGlobal: args[1] === "-g"
    };

    if (formSet.setGlobal && role < 2) {
      return message.reply(getLang("onlyAdmin"));
    }

    const confirmMessage = formSet.setGlobal? getLang("confirmGlobal") : getLang("confirmThisThread");
    return message.reply(confirmMessage, (err, info) => {
      formSet.messageID = info.messageID;
      global.GoatBot.onReaction.set(info.messageID, formSet);
    });
  },

  onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
    const { author, newPrefix, setGlobal } = Reaction;
    if (event.userID!== author) return;

    if (setGlobal) {
      global.GoatBot.config.prefix = newPrefix;
      fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
      return message.reply(getLang("successGlobal", newPrefix));
    }

    await threadsData.set(event.threadID, newPrefix, "data.prefix");
    return message.reply(getLang("successThisThread", newPrefix));
  }
};
