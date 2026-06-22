const axios = require("axios");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

// API Font + Catégories différentes
const FONT_API = "https://raw.githubusercontent.com/Azadwebapi/Azadx69x-bm-store/main/font.json";
const CAT_API = "https://raw.githubusercontent.com/Azadwebapi/Azadx69x-bm-store/main/category.json";

let fontCache = {};
let catCache = {};
let loading = false;

async function loadFonts() {
  try {
    const res = await axios.get(FONT_API, { timeout: 4000 });
    fontCache = res.data || {};
  } catch { fontCache = {}; }
}

async function loadCats() {
  if (loading) return;
  loading = true;
  try {
    const res = await axios.get(CAT_API, { timeout: 4000 });
    catCache = {};
    Object.keys(res.data || {}).forEach(k => {
      catCache[k.toLowerCase().trim()] = res.data[k];
    });
  } catch { catCache = {}; }
  finally { loading = false; }
}

function bold(text) {
  if (!text) return "";
  return text.split("").map(ch => fontCache[ch] || ch).join("");
}

function catIcon(cat) {
  if (!Object.keys(catCache).length &&!loading) loadCats();
  return catCache[(cat || "").toLowerCase().trim()] || "⚡";
}

module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "cmds", "rayd"],
    version: "8.0",
    author: "Rayd Efoua",
    role: 0,
    countDown: 3,
    description: { en: "Rayd Efoua Command Center" },
    category: "system",
    guide: { en: "{pn} ou {pn} <nom_cmd>" }
  },

  onStart: async function ({ message, args, event, role }) {
    if (!Object.keys(fontCache).length) await loadFonts();
    if (!Object.keys(catCache).length) await loadCats();

    const prefix = getPrefix(event.threadID);
    const input = args[0]?.toLowerCase();
    let targetCmd = null;

    if (input) {
      if (commands.has(input)) targetCmd = commands.get(input);
      else if (aliases.has(input)) targetCmd = commands.get(aliases.get(input));
      else return message.reply(`◈ 𝗘𝗥𝗘𝗨𝗥 404 ◈\n▸ Commande "${input}" introuvable`);
    }

    // Détails d'une commande
    if (targetCmd) {
      const c = targetCmd.config;
      const desc = typeof c.description === "string"? c.description : c.description?.en || "Aucune description";
      const usage = typeof c.guide?.en === "string"? c.guide.en.replace(/{pn}/g, prefix + c.name) : `${prefix}${c.name}`;
      const aliasList = c.aliases?.length? c.aliases.map(a => prefix + a).join(", ") : "Aucun";

      const detailMsg =
`◈═══════════════◈
    𝗥𝗔𝗬𝗗 𝗖𝗘𝗡𝗧𝗘𝗥 𝗩𝟴
◈═══════════════◈

◆ 𝗡𝗢𝗠: ${prefix}${c.name}
◆ 𝗜𝗖𝗢𝗡𝗘: ${catIcon(c.category)} ${c.category || "Divers"}
◆ 𝗙𝗢𝗡𝗖𝗧𝗜𝗢𝗡: ${desc}
◆ 𝗩𝗘𝗥𝗦𝗜𝗢𝗡: v${c.version || "1.0"}
◆ 𝗔𝗖𝗘𝗦: ${c.role === 0? "👤 Public" : c.role === 1? "👑 Admin" : "⚡ Owner"}
◆ 𝗗𝗘𝗟𝗔𝗜: ${c.countDown || 3}s
◆ 𝗔𝗟𝗜𝗔𝗦: ${aliasList}
◆ 𝗖𝗥𝗘𝗔𝗧𝗘𝗨𝗥: ${c.author || "Rayd Efoua"}

◈═══ 𝗨𝗧𝗜𝗟𝗜𝗦𝗔𝗧𝗜𝗢𝗡 ═══◈
${usage}

◈═══════ 𝗡𝗢𝗧𝗘 ═══════◈
▸ <texte> = Paramètre requis
▸ [a|b] = Choix multiple
▸ ( ) = Optionnel
◈══════════◈
💎 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝗥𝗮𝘆𝗱 𝗘𝗳𝗼𝘂𝗮 𝗔𝗜`;

      try {
        return message.reply({
          body: detailMsg,
          attachment: await global.utils.getStreamFromURL("https://i.imgur.com/7yUvePI.gif")
        });
      } catch {
        return message.reply(detailMsg);
      }
    }

    // Menu principal
    const grouped = {};
    for (const [name, cmd] of commands) {
      if (cmd.config.role > role) continue;
      const cat = cmd.config.category || "Autres";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(name);
    }

    let mainMsg = `◈══════════◈
║ 𝗥𝗔𝗬𝗗 𝗘𝗙𝗢𝗨𝗔 𝗛𝗨𝗕
║ V8.0 | ${commands.size} Commandes
◈══════════◈

▸ 𝗣𝗿𝗲́𝗳𝗶𝘅𝗲: [ ${prefix} ]
▸ 𝗨𝘀𝗮𝗴𝗲: ${prefix}help <nom> pour détails
▸ 𝗦𝘁𝗮𝘁𝘂𝘀: 🟢 En ligne

`;

    Object.keys(grouped).sort().forEach(cat => {
      const icon = catIcon(cat);
      const catBold = bold(cat.toUpperCase());
      const cmds = grouped[cat].sort();

      mainMsg += `◈─── ${icon} ${catBold} ───◈\n`;

      // 3 commandes par ligne pour compacité
      for (let i = 0; i < cmds.length; i += 3) {
        const line = cmds.slice(i, i + 3).map(c => c.padEnd(12)).join(" ");
        mainMsg += `▸ ${line}\n`;
      }
      mainMsg += `\n`;
    });

    mainMsg += `◈══════════◈
▸ 💎 Bot développé par Rayd Efoua
▸ ⚡ Tous droits réservés 2026
◈══════════◈`;

    try {
      await message.reply({
        body: mainMsg,
        attachment: await global.utils.getStreamFromURL("https://i.imgur.com/7yUvePI.gif")
      });
    } catch {
      await message.reply(mainMsg);
    }
  }
};
