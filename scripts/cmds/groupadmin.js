const OWNER_UIDS = ["61577243652962"];
const LOG_GROUP_ID = "4200466550263927";

const SPAM_CONFIG = {
  messageLimit: 5,
  timeWindow: 10000,
  kickAfterWarnings: 1
};

const BANNED_WORDS = ["spam", "pub", "arnaque", "scam"];

const { getStreamFromURL } = global.utils;

// Stockage en mémoire
const userMessages = {};
const warnings = {};
const autoModeration = {};

// Intervalle 5 minutes
const PENDING_CHECK_INTERVAL = 5 * 60 * 1000;
const pendingNotifIntervals = {};
const lastKnownPending = {};

function box(title, content) {
  return `┏━━━━━━━Ι ❖ Ι━━━━━━━┓\n ${title}|💧\n❯_━━━━━━Ι ❖ Ι━━━━━━_❮\n\n${content}\n\n┗━━━━━━━Ι ❖ Ι━━━━━━━┛`;
}

function long(title, content) {
  return `━━━━━━━━━━━━━\n ${title}|💧\n━━━━━━━━━━━━━\n\n${content}\n\n━━━━━━━━━━━━━`;
}

function extractUID(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry.userFbId || entry.userID || entry.requesterID || entry.sender?.id || entry.id || null;
}

module.exports = {
  config: {
    name: "groupadmin",
    aliases: ["gadm", "groupmgr", "gmgr"],
    version: "7.1",
    author: "Rayd Efoua",
    countDown: 3,
    role: 1,
    description: "Gestion TOTALE du groupe avec auto-moderation",
    category: "admin",
    guide: {
      fr: "{pn} help => Toutes les commandes\n{pn} auto on/off => Auto-moderation\n{pn} approve => Demandes en attente\n{pn} kick @tag => Expulser\n{pn} theme <desc> => Theme AI\n{pn} notif on/off => Auto-notif pending"
    }
  },

  langs: {
    fr: {
      noPermission: "⚠️PERMISSION REFUSEE",
      botNotAdmin: "⚠️BOT PAS ADMIN",
      autoEnabled: "✅AUTO-MOD ACTIVE",
      autoDisabled: "⏸️AUTO-MOD DESACTIVE",
      spamKick: "👢SPAM KICK",
      bannedWordKick: "👢MOT INTERDIT",
      suspendedRemoved: "🗑️COMPTE SUPPRIME",
      cleanComplete: "✅NETTOYAGE TERMINE",
      nameChanged: "✅NOM MODIFIE",
      emojiChanged: "✅EMOJI MODIFIE",
      themeChanged: "✅THEME APPLIQUE",
      photoChanged: "✅PHOTO MODIFIEE",
      noPending: "✅AUCUNE DEMANDE",
      approved: "✅APPROUVE",
      rejected: "❌REJETE",
      approveAllDone: "✅TOUT APPROUVE"
    }
  },

  onStart: async function ({ api, event, args, message, getLang }) {
    const { threadID, senderID } = event;

    if (!event.isGroup) {
      return message.reply(box("ℹ️INFO", "💧| Commande reservee aux groupes"));
    }

    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();

    const isBotAdmin = threadInfo.adminIDs?.some(a => a.id === botID);
    const isUserAdmin = threadInfo.adminIDs?.some(a => a.id === senderID);

    if (!isBotAdmin) return message.reply(box(getLang("botNotAdmin"), "💧| Ajoutez-moi comme admin"));
    if (!isUserAdmin) return message.reply(box(getLang("noPermission"), "💧| Seulement les admins"));

    const command = args[0]?.toLowerCase();

    // Help
    if (!command || command === "help") {
      const content = "🤖 Auto-mod: {pn} auto on/off\n👥 Membres: {pn} approve/reject/kick/clean\n🎨 Apparence: {pn} theme/name/emoji/photo\n🔔 Notif: {pn} notif on/off\n📊 Infos: {pn} info/admins";
      return message.reply(long("🛡️GROUP MANAGER", content));
    }

    // Auto-mod
    if (command === "auto") {
      const action = args[1]?.toLowerCase();
      if (action === "on") {
        autoModeration[threadID] = { enabled: true, antiSpam: true, bannedWords: true, cleanSuspended: true };
        return message.reply(box(getLang("autoEnabled"), "» Anti-spam ✅\n» Mots interdits ✅\n» Comptes suspendus ✅"));
      } else if (action === "off") {
        autoModeration[threadID] = { enabled: false };
        return message.reply(box(getLang("autoDisabled"), "💧| Auto-moderation desactivee"));
      } else {
        const status = autoModeration[threadID]?.enabled? "✅ Active" : "⏸️ Inactive";
        return message.reply(box("🤖AUTO-MOD", `Status: ${status}\n\n💧| {pn} auto on/off`));
      }
    }

    // Notif pending
    if (command === "notif") {
      const action = args[1]?.toLowerCase();
      if (action === "on") {
        if (pendingNotifIntervals[threadID]) clearInterval(pendingNotifIntervals[threadID]);
        pendingNotifIntervals[threadID] = setInterval(async () => {
          try {
            const info = await api.getThreadInfo(threadID);
            const queue = info.approvalQueue || [];
            if (queue.length === 0) return;
            const prev = lastKnownPending[threadID] || 0;
            if (queue.length!== prev) {
              lastKnownPending[threadID] = queue.length;
              const content = `📊 ${queue.length} demande(s) en attente\n💧| {pn} approve all\n💧| {pn} approve`;
              api.sendMessage(box("🔔NOUVELLES DEMANDES", content), threadID);
            }
          } catch (e) { console.error(e); }
        }, PENDING_CHECK_INTERVAL);
        lastKnownPending[threadID] = 0;
        return message.reply(box("🔔AUTO-NOTIF ACTIVE", `⏱️ Verification chaque ${PENDING_CHECK_INTERVAL/60000} min`));
      } else if (action === "off") {
        if (pendingNotifIntervals[threadID]) {
          clearInterval(pendingNotifIntervals[threadID]);
          delete pendingNotifIntervals[threadID];
          delete lastKnownPending[threadID];
        }
        return message.reply(box("🔕AUTO-NOTIF DESACTIVE", "💧| Notifications arretees"));
      } else {
        const active =!!pendingNotifIntervals[threadID];
        return message.reply(box("🔔STATUS NOTIF", `Status: ${active? "✅ Active" : "⏸️ Inactive"}`));
      }
    }

    // Theme AI
    if (command === "theme" || command === "color") {
      const sub = args[1]?.toLowerCase();
      if (sub === "id") {
        const themeId = threadInfo?.threadTheme?.id || threadInfo?.color || "Inconnu";
        return message.reply(box("🎨THEME ACTUEL", `📌 ID: ${themeId}`));
      }
      if (sub === "apply" || sub === "set") {
        const themeId = args[2];
        if (!themeId) return message.reply(box("🎨APPLY THEME", "💧| Usage: {pn} theme apply <ID>"));
        try {
          await api.changeThreadColor(themeId, threadID);
          return message.reply(box(getLang("themeChanged"), `📌 ID: ${themeId}\n💧| Applique avec succes`));
        } catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
      }
      if (!sub) {
        try {
          await message.reply(box("🔍THEME ACTUEL", "💧| Recuperation en cours..."));
          const theme = threadInfo.threadTheme;
          const themeId = theme?.id || "Default";
          let colorInfo = threadInfo.color || "Default";
          const body = `📌 ID: ${themeId}\n🎨 Couleur: ${colorInfo}\n\n💧| {pn} theme <desc> - Creer theme AI\n💧| {pn} theme apply <ID> - Appliquer`;
          if (!theme) return message.reply(box("ℹ️THEME", "💧| Theme par defaut actif"));
          return message.reply(box("🎨THEME ACTUEL", body));
        } catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
      }
      const prompt = args.slice(1).join(" ");
      if (!prompt) return message.reply(box("🎨THEME AI", "💧| Usage: {pn} theme <description>"));
      await message.reply(box("⏳GENERATION", "💧| Creation du theme AI..."));
      try {
        const themes = await api.createAITheme(prompt, 5);
        if (!themes || themes.length === 0) return message.reply(box("❌AUCUN RESULTAT", "💧| Essayez autre description"));
        let themeList = "";
        for (let i = 0; i < themes.length; i++) {
          const t = themes[i];
          let colorInfo = t.accessibility_label || t.gradient_colors?.join(" → ") || t.primary_color || "AI";
          themeList += `${i + 1}. ID: ${t.id}\n 🎨 ${colorInfo}\n\n`;
        }
        themeList += `💧| Repondez avec 1-${themes.length} pour appliquer`;
        const replyBody = long(`✨THEMES AI (${themes.length})`, themeList);
        message.reply(replyBody, (err, info) => {
          if (!err) global.GoatBot.onReply.set(info.messageID, { commandName: "groupadmin", author: senderID, themes, threadID });
        });
      } catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
      return;
    }

    // Approve
    if (command === "approve" || command === "pending") {
      const rawQueue = threadInfo.approvalQueue || [];
      if (rawQueue.length === 0) return message.reply(box(getLang("noPending"), "💧| Aucune demande en attente"));
      if (args[1]?.toLowerCase() === "all") {
        let approved = 0, failed = 0;
        for (const entry of rawQueue) {
          const uid = extractUID(entry);
          if (!uid) { failed++; continue; }
          try { await api.addUserToGroup(uid, threadID); approved++; await new Promise(r => setTimeout(r, 800)); }
          catch (e) { failed++; }
        }
        return message.reply(box(getLang("approveAllDone"), `✅ ${approved} approuve(s)\n${failed > 0? `❌ ${failed} echec(s)` : ""}`));
      }
      if (args[1] &&!isNaN(args[1])) {
        const idx = parseInt(args[1]) - 1;
        if (idx < 0 || idx >= rawQueue.length) return message.reply(box("❌ERREUR", `💧| Numero de 1 à ${rawQueue.length}`));
        const uid = extractUID(rawQueue[idx]);
        if (!uid) return message.reply(box("❌ERREUR", "💧| Identifiant introuvable"));
        try {
          await api.addUserToGroup(uid, threadID);
          let name = "Utilisateur";
          try { const info = await api.getUserInfo(uid); name = info[uid]?.name || name; } catch (_) {}
          return message.reply(box(getLang("approved"), `👤 ${name}\n🆔 ${uid}\n\n💧| A ete approuve(e) ✅`));
        } catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
      }
      let list = `📊 Total: ${rawQueue.length} demande(s)\n\n`;
      for (let i = 0; i < rawQueue.length; i++) {
        const uid = extractUID(rawQueue[i]);
        let name = "Inconnu";
        if (uid) try { const info = await api.getUserInfo(uid); name = info[uid]?.name || name; } catch (_) {}
        list += `${i + 1}. 👤 ${name}\n 🆔 ${uid || "N/A"}\n\n`;
      }
      list += "💧| {pn} approve <n> - Approuver un\n💧| {pn} approve all - Tout approuver\n💧| {pn} reject <n> - Rejeter";
      return message.reply(long("📋DEMANDES EN ATTENTE", list));
    }

    // Reject
    if (command === "reject") {
      const rawQueue = threadInfo.approvalQueue || [];
      if (!args[1] || isNaN(args[1])) return message.reply(box("❌REJECT", "💧| Usage: {pn} reject <numero>"));
      const idx = parseInt(args[1]) - 1;
      if (idx < 0 || idx >= rawQueue.length) return message.reply(box("❌ERREUR", `💧| Numero de 1 à ${rawQueue.length}`));
      const uid = extractUID(rawQueue[idx]);
      if (!uid) return message.reply(box("❌ERREUR", "💧| Identifiant introuvable"));
      try {
        await api.removeUserFromGroup(uid, threadID);
        let name = "Utilisateur";
        try { const info = await api.getUserInfo(uid); name = info[uid]?.name || name; } catch (_) {}
        return message.reply(box(getLang("rejected"), `👤 ${name}\n🆔 ${uid}\n\n💧| Demande rejetee ❌`));
      } catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
    }

    // Kick
    if (command === "kick" || command === "remove") {
      const mentions = Object.keys(event.mentions);
      if (mentions.length === 0) return message.reply(box("👢KICK", "💧| Taguez la personne a expulser"));
      for (const uid of mentions) {
        try {
          await api.removeUserFromGroup(uid, threadID);
          let name = uid;
          try { const info = await api.getUserInfo(uid); name = info[uid]?.name || uid; } catch (_) {}
          await message.reply(box("👢EXPULSION", `👤 ${name}\n💧| a ete expulse(e)`));
        } catch (err) { await message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
      }
      return;
    }

    // Clean
    if (command === "clean") {
      const members = threadInfo.participantIDs;
      let removed = 0;
      for (const uid of members) {
        try {
          const info = await api.getUserInfo(uid);
          const name = info[uid]?.name || "";
          if (name === "Facebook User" || name === "" || name.includes("Utilisateur Facebook")) {
            await api.removeUserFromGroup(uid, threadID);
            removed++;
            await new Promise(r => setTimeout(r, 800));
          }
        } catch (_) {}
      }
      return message.reply(box(getLang("cleanComplete"), `🗑️ ${removed} compte(s) suspendus retire(s)`));
    }

    // Name
    if (command === "name" || command === "rename") {
      const newName = args.slice(1).join(" ");
      if (!newName) return message.reply(box("📝CHANGE NOM", "💧| Usage: {pn} name <nom>"));
      try { await api.setTitle(newName, threadID); return message.reply(box(getLang("nameChanged"), `📝 ${newName}`)); }
      catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
    }

    // Emoji
    if (command === "emoji") {
      const em = args[1];
      if (!em) return message.reply(box("😀CHANGE EMOJI", "💧| Usage: {pn} emoji <emoji>"));
      try { await api.changeThreadEmoji(em, threadID); return message.reply(box(getLang("emojiChanged"), `${em} Nouvel emoji`)); }
      catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
    }

    // Photo
    if (command === "photo" || command === "avatar") {
      const img = event.messageReply?.attachments?.[0] || event.attachments?.[0];
      if (!img || img.type!== "photo") return message.reply(box("🖼️CHANGE PHOTO", "💧| Reponds a une image ou envoie-en une"));
      try {
        const stream = await getStreamFromURL(img.url);
        await api.changeGroupImage(stream, threadID);
        return message.reply(box(getLang("photoChanged"), "🖼️ Photo mise a jour"));
      } catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
    }

    // Info
    if (command === "info" || command === "stats") {
      const content = `📝 Nom: ${threadInfo.threadName}\n👥 Membres: ${threadInfo.participantIDs.length}\n👑 Admins: ${threadInfo.adminIDs.length}\n${threadInfo.emoji || "👍"} Emoji\n🆔 ${threadID}\n🔔 Notif: ${pendingNotifIntervals[threadID]? "✅ Active" : "⏸️ Inactive"}`;
      return message.reply(box("ℹ️INFOS GROUPE", content));
    }

    // Admins
    if (command === "admins") {
      let list = "";
      for (const admin of threadInfo.adminIDs) {
        let name = admin.id;
        try { const info = await api.getUserInfo(admin.id); name = info[admin.id]?.name || admin.id; } catch (_) {}
        list += `👑 ${name}\n 🆔 ${admin.id}\n\n`;
      }
      list += "💧| Liste complete";
      return message.reply(long("👑ADMINISTRATEURS", list));
    }
  },

  onReply: async function ({ api, event, message, Reply, getLang }) {
    const { author, themes, threadID: replyThreadID } = Reply;
    if (event.senderID!== author) return message.reply(box("⚠️ACCES REFUSE", "💧| Seul l'auteur peut choisir"));
    const selection = parseInt(event.body.trim());
    if (isNaN(selection) || selection < 1 || selection > themes.length) return message.reply(box("❌SELECTION", `💧| Entrez un numero de 1 à ${themes.length}`));
    const chosen = themes[selection - 1];
    try {
      const threadInfo = await api.getThreadInfo(event.threadID);
      const currentTheme = threadInfo.threadTheme;
      const prevId = currentTheme?.id || "Default";
      const prevColor = threadInfo.color || "Default";
      await message.reply(box("⏳APPLICATION", "💧| Application du theme..."));
      await api.changeThreadColor(chosen.id, event.threadID);
      const content = `✅ Theme applique!\n📌 ID: ${chosen.id}\n\n📋 Precedent:\n ID: ${prevId}\n 🎨 ${prevColor}`;
      await message.reply(box(getLang("themeChanged"), content));
      api.unsendMessage(Reply.messageID);
    } catch (err) { return message.reply(box("❌ERREUR", `💧| ${err.message}`)); }
  },

  onChat: async function ({ api, event, message, getLang }) {
    const { threadID, senderID, body } = event;
    if (!event.isGroup ||!body) return;
    const autoMod = autoModeration[threadID];
    if (!autoMod?.enabled) return;
    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();
    const isBotAdmin = threadInfo.adminIDs?.some(a => a.id === botID);
    const isUserAdmin = threadInfo.adminIDs?.some(a => a.id === senderID);
    if (!isBotAdmin || isUserAdmin) return;

    // Anti-spam
    if (autoMod.antiSpam) {
      if (!userMessages[senderID]) userMessages[senderID] = [];
      const now = Date.now();
      userMessages[senderID].push(now);
      userMessages[senderID] = userMessages[senderID].filter(t => now - t < SPAM_CONFIG.timeWindow);
      if (userMessages[senderID].length > SPAM_CONFIG.messageLimit) {
        let name = senderID;
        try { const i = await api.getUserInfo(senderID); name = i[senderID]?.name || senderID; } catch (_) {}
        try {
          await api.removeUserFromGroup(senderID, threadID);
          return message.reply(box(getLang("spamKick"), `👤 ${name}\n💧| Spam detecte - expulsion auto`));
        } catch (_) {}
      }
    }

    // Mots interdits
    if (autoMod.bannedWords) {
      const lower = body.toLowerCase();
      if (BANNED_WORDS.some(w => lower.includes(w))) {
        let name = senderID;
        try { const i = await api.getUserInfo(senderID); name = i[senderID]?.name || senderID; } catch (_) {}
        try {
          await api.unsendMessage(event.messageID);
          await api.removeUserFromGroup(senderID, threadID);
          return message.reply(box(getLang("bannedWordKick"), `👤 ${name}\n💧| Mot interdit - expulsion auto`));
        } catch (_) {}
      }
    }
  },

  onEvent: async function ({ api, event, message, getLang }) {
    const { threadID, logMessageType, logMessageData } = event;
    if (logMessageType === "log:subscribe" && autoModeration[threadID]?.cleanSuspended) {
      const threadInfo = await api.getThreadInfo(threadID);
      const botID = api.getCurrentUserID();
      const isBotAdmin = threadInfo.adminIDs?.some(a => a.id === botID);
      if (!isBotAdmin) return;
      for (const p of (logMessageData?.addedParticipants || [])) {
        const uid = p.userFbId;
        try {
          const info = await api.getUserInfo(uid);
          const name = info[uid]?.name || "";
          if (name === "Facebook User" || name === "" || name.includes("Utilisateur Facebook")) {
            await api.removeUserFromGroup(uid, threadID);
            await message.reply(box(getLang("suspendedRemoved"), "👤 Facebook User\n💧| Rejete automatiquement"));
          }
        } catch (_) {}
      }
    }
    if (logMessageType === "log:approval-queue-add") {
      if (!pendingNotifIntervals[threadID]) return;
      try {
        const info = await api.getThreadInfo(threadID);
        const queue = info.approvalQueue || [];
        const uid = logMessageData?.userFbId || logMessageData?.userID || "?";
        let name = "Nouvel adherent";
        try { const uinfo = await api.getUserInfo(uid); name = uinfo[uid]?.name || name; } catch (_) {}
        lastKnownPending[threadID] = queue.length;
        const content = `👤 ${name}\n🆔 ${uid}\n📊 Total en attente: ${queue.length}\n\n💧| {pn} approve\n💧| {pn} approve all`;
        api.sendMessage(box("🔔NOUVELLE DEMANDE", content), threadID);
      } catch (_) {}
    }
  }
};
