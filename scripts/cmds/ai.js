const axios = require('axios');
const validUrl = require('valid-url');
const fs = require('fs');
const path = require('path');
const ytSearch = require('yt-search');
const { v4: uuidv4 } = require('uuid');

const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";
const YT_API = "http://65.109.80.126:20409/aryan/yx";
const EDIT_API = "https://gemini-edit-omega.vercel.app/edit";

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const downloadFile = async (url, ext) => {
  const filePath = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, Buffer.from(response.data));
  return filePath;
};

// Banner Rayd Efoua
const BANNER = `
╭─⦗ 🤖 Rayd Efoua AI ⦘─╮
│ Version 4.1 | Premium
╰────────────────────╯
`;

const resetConversation = async (api, event, message) => {
  api.setMessageReaction("🌌", event.messageID, () => {}, true);
  try {
    await axios.delete(`${CLEAR_ENDPOINT}/${event.senderID}`);
    return message.reply(`${BANNER}\n✅ Mémoire effacée\n💬 On repart à zéro!`);
  } catch {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    return message.reply(`${BANNER}\n❌ Erreur reset`);
  }
};

const handleEdit = async (api, event, message, args) => {
  const prompt = args.join(" ");
  if (!prompt) return message.reply(`${BANNER}\n❗ Usage: ai edit <prompt>\nEx: ai edit un chat cyberpunk`);

  api.setMessageReaction("🎨", event.messageID, () => {}, true);
  try {
    const params = { prompt };
    if (event.messageReply?.attachments?.[0]?.url) {
      params.imgurl = event.messageReply.attachments[0].url;
      await message.reply(`${BANNER}\n🖼️ Image détectée... Modification en cours`);
    } else {
      await message.reply(`${BANNER}\n✨ Génération en cours...`);
    }

    const res = await axios.get(EDIT_API, { params });
    if (!res.data?.images?.[0]) throw new Error("No image");

    const base64Image = res.data.images[0].replace(/^data:image\/\w+;base64,/, "");
    const imagePath = path.join(TMP_DIR, `${Date.now()}.png`);
    fs.writeFileSync(imagePath, Buffer.from(base64Image, "base64"));

    api.setMessageReaction("✅", event.messageID, () => {}, true);
    await message.reply({
      body: `${BANNER}\n🎨 Voilà ton image!\nPrompt: ${prompt}`,
      attachment: fs.createReadStream(imagePath)
    });
    fs.unlinkSync(imagePath);
  } catch {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    message.reply(`${BANNER}\n⚠️ L'atelier a bugué. Réessaie`);
  }
};

const handleYouTube = async (api, event, message, args) => {
  const option = args[0];
  if (!["-v", "-a"].includes(option)) {
    return message.reply(`${BANNER}\n❌ Usage: ai youtube -v/-a <recherche>\n-v = vidéo | -a = audio`);
  }

  const query = args.slice(1).join(" ");
  if (!query) return message.reply(`${BANNER}\n❗ Donne-moi un titre ou lien YouTube`);

  await message.reply(`${BANNER}\n🔍 Recherche "${query}"...`);

  const sendFile = async (url, type) => {
    try {
      const { data } = await axios.get(`${YT_API}?url=${encodeURIComponent(url)}&type=${type}`);
      if (!data.status || !data.download_url) throw new Error("API failed");
      
      await message.reply(`${BANNER}\n⬇️ Téléchargement ${type === 'mp4'? 'vidéo' : 'audio'}...`);
      const filePath = await downloadFile(data.download_url, type);
      
      await message.reply({
        body: `${BANNER}\n✅ Fichier prêt!\nTitre: ${url.split('v=')[1] || 'Custom'}`,
        attachment: fs.createReadStream(filePath)
      });
      fs.unlinkSync(filePath);
    } catch {
      message.reply(`${BANNER}\n❌ Échec download`);
    }
  };

  if (query.startsWith("http")) return await sendFile(query, option === "-v"? "mp4" : "mp3");

  try {
    const results = (await ytSearch(query)).videos.slice(0, 6);
    if (results.length === 0) return message.reply(`${BANNER}\n❌ Aucun résultat`);

    let list = `╭─⦗ Résultats YouTube ⦘─╮\n`;
    results.forEach((v, i) => {
      list += `│ ${i + 1}. ${v.title.slice(0,35)}...\n│ ⏱️ ${v.timestamp} | 👁️ ${v.views}\n├───────────────\n`;
    });
    list += `╰─ Réponds 1-6 ─╯\n\n🤖 Rayd Efoua`;

    const thumbs = await Promise.all(
      results.map(v => axios.get(v.thumbnail, { responseType: "stream" }).then(res => res.data))
    );

    api.sendMessage(
      { body: list, attachment: thumbs },
      event.threadID,
      (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "ai",
          author: event.senderID,
          results,
          type: option
        });
      },
      event.messageID
    );
  } catch {
    message.reply(`${BANNER}\n❌ YouTube en maintenance`);
  }
};

const handleAIRequest = async (api, event, userInput, message) => {
  const args = userInput.split(" ");
  const first = args[0]?.toLowerCase();

  if (["edit", "-e"].includes(first)) return await handleEdit(api, event, message, args.slice(1));
  if (["youtube", "yt", "ytb"].includes(first)) return await handleYouTube(api, event, message, args.slice(1));

  const userId = event.senderID;
  let messageContent = userInput;
  let imageUrl = null;

  api.setMessageReaction("🧠", event.messageID, () => {}, true);

  const urlMatch = messageContent.match(/(https?:\/\/[^\s]+)/)?.[0];
  if (urlMatch && validUrl.isWebUri(urlMatch)) {
    imageUrl = urlMatch;
    messageContent = messageContent.replace(urlMatch, '').trim();
    await message.reply(`${BANNER}\n🖼️ Image analysée...`);
  } else {
    await message.reply(`${BANNER}\n💭 Réflexion en cours...`);
  }

  if (!messageContent && !imageUrl) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    return message.reply(`${BANNER}\n💬 Pose ta question après "ai"`);
  }

  try {
    const response = await axios.post(API_ENDPOINT, { uid: userId, message: messageContent, image_url: imageUrl });
    let finalReply = response.data.reply || '✅ Réponse Rayd Efoua';

    finalReply = finalReply
      .replace(/🎀\s*𝗦𝗵𝗶𝘇𝘂/gi, '🤖 Rayd Efoua')
      .replace(/Shizu/gi, 'Rayd Efoua')
      .replace(/Christuska/gi, 'Rayd Efoua')
      .replace(/Aryan Chauhan/gi, 'Rayd Efoua');

    const attachments = [];
    if (response.data.image_url) {
      attachments.push(fs.createReadStream(await downloadFile(response.data.image_url, 'jpg')));
    }

    const sentMessage = await message.reply({
      body: `${BANNER}\n${finalReply}\n\n╰─ Propulsé par Rayd Efoua ─╯`,
      attachment: attachments.length > 0 ? attachments : undefined
    });

    global.GoatBot.onReply.set(sentMessage.messageID, {
      commandName: 'ai',
      author: userId
    });

    api.setMessageReaction("✨", event.messageID, () => {}, true);
  } catch (error) {
    api.setMessageReaction("💥", event.messageID, () => {}, true);
    message.reply(`${BANNER}\n⚠️ Crash Rayd Efoua\nErreur: ${error.message.slice(0,100)}`);
  }
};

module.exports = {
  config: {
    name: 'ai',
    version: '4.1.0',
    author: 'Rayd Efoua',
    role: 0,
    category: '🤖 AI Premium',
    shortDescription: 'Assistant IA Rayd Efoua',
    longDescription: 'Chat IA + Edit image + Download YouTube',
    guide: {
      en: `ai [question] → Chat
ai edit [prompt] → Génère/édite image
ai youtube -v [titre] → Vidéo MP4
ai youtube -a [titre] → Audio MP3
ai clear → Reset mémoire`
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const userInput = args.join(' ').trim();
    if (!userInput) {
      return message.reply(`${BANNER}\n👋 Salut! Rayd Efoua AI\nTape "ai" + ta question\nTape "ai help" pour commandes`);
    }
    if (userInput.toLowerCase() === 'help') {
      return message.reply(`${BANNER}\n📚 COMMANDES:\n\n1. ai salut → Chat\n2. ai edit un robot bleu → Génère\n3. ai edit (réponds à image) → Modifie\n4. ai youtube -a Kamin → MP3\n5. ai youtube -v Lofi → MP4\n6. ai clear → Reset\n╰─ Rayd Efoua ─╯`);
    }
    if (['clear', 'reset'].includes(userInput.toLowerCase())) {
      return await resetConversation(api, event, message);
    }
    return await handleAIRequest(api, event, userInput, message);
  },

  onReply: async function ({ api, event, Reply, message }) {
    if (event.senderID !== Reply.author) return;
    const userInput = event.body?.trim();
    if (!userInput) return;
    if (['clear', 'reset'].includes(userInput.toLowerCase())) {
      return await resetConversation(api, event, message);
    }
    if (Reply.results && Reply.type) {
      const idx = parseInt(userInput);
      const list = Reply.results;
      if (isNaN(idx) || idx < 1 || idx > list.length)
        return message.reply(`${BANNER}\n❌ Choix invalide. 1-6`);
      
      await message.reply(`${BANNER}\n⬇️ Préparation du fichier...`);
      const selected = list[idx - 1];
      const type = Reply.type === "-v"? "mp4" : "mp3";
      const fileUrl = `${YT_API}?url=${encodeURIComponent(selected.url)}&type=${type}`;
      try {
        const { data } = await axios.get(fileUrl);
        const filePath = await downloadFile(data.download_url, type);
        await message.reply({
          body: `${BANNER}\n✅ Téléchargé!\n🎵 ${selected.title}`,
          attachment: fs.createReadStream(filePath)
        });
        fs.unlinkSync(filePath);
      } catch {
        message.reply(`${BANNER}\n❌ Download failed`);
      }
    } else {
      return await handleAIRequest(api, event, userInput, message);
    }
  }
};
