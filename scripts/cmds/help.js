const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

module.exports = {
  config: {
    name: 'help',
    usage: 'help [page/nom]',
    description: 'Centre d\'aide multicolor',
    coolDown: 2,
    role: 0,
    author: 'Rayd',
    aliases: ['h', 'menu']
  },

  onStart: async function({ api, event, args }) {
    const cmdsPath = __dirname;
    const files = fs.readdirSync(cmdsPath).filter(f => f.endsWith('.js'));

    let allCommands = [];
    for (const file of files) {
      try {
        const fp = path.join(cmdsPath, file);
        delete require.cache[require.resolve(fp)];
        const cmd = require(fp);
        if (cmd.config?.name) {
          let desc = cmd.config.description || cmd.config.shortDescription || '';
          if (typeof desc === 'object') desc = desc.en || desc.fr || cmd.config.shortDescription || 'No description';
          cmd.config._desc = desc;
          allCommands.push(cmd.config);
        }
      } catch {}
    }

    allCommands = allCommands.sort((a,b) => a.name.localeCompare(b.name));
    const total = allCommands.length;
    const perPage = 8;
    const totalPages = Math.ceil(total / perPage);

    const theme = getRandomTheme();

    // Si recherche par nom
    if (args[0] && isNaN(args[0])) {
      const name = args[0].toLowerCase();
      const cmd = allCommands.find(c => c.name.toLowerCase() === name || c.aliases?.map(a=>a.toLowerCase()).includes(name));
      if (!cmd) return api.sendMessage(`❌ "${args[0]}" introuvable.`, event.threadID, event.messageID);
      const buf = await genDetailCanvas(cmd, event.senderID, theme);
      const tmp = path.join(__dirname, `help_d_${Date.now()}.png`);
      fs.writeFileSync(tmp, buf);
      return api.sendMessage({ attachment: fs.createReadStream(tmp) }, event.threadID, () => { try{fs.unlinkSync(tmp)}catch{} }, event.messageID);
    }

    let page = parseInt(args[0]) || 1;
    if (page < 1) page = 1; if (page > totalPages) page = totalPages;

    const cmds = allCommands.slice((page-1)*perPage, page*perPage);
    const buffer = await genHelpCanvas(cmds, page, totalPages, total, event.senderID, theme);

    const tmp = path.join(__dirname, `help_${Date.now()}.png`);
    fs.writeFileSync(tmp, buffer);
    return api.sendMessage({
      body: `✨ Thème: ${theme.name} • Page ${page}/${totalPages}`,
      attachment: fs.createReadStream(tmp)
    }, event.threadID, () => { try{fs.unlinkSync(tmp)}catch{} }, event.messageID);
  }
};

function getRandomTheme() {
  const themes = [
    { name: 'RAYD GREEN', main: '#22c55e', second: '#16a34a', glow: 'rgba(34,197,94,0.45)' },
    { name: 'NEON PURPLE', main: '#a855f7', second: '#7e22ce', glow: 'rgba(168,85,247,0.45)' },
    { name: 'CYAN ICE', main: '#06b6d4', second: '#0891b2', glow: 'rgba(6,182,214,0.45)' },
    { name: 'HOT PINK', main: '#ec4899', second: '#be185d', glow: 'rgba(236,72,153,0.45)' },
    { name: 'SUNSET ORANGE', main: '#f97316', second: '#ea580c', glow: 'rgba(249,115,22,0.45)' },
    { name: 'GOLDEN RAYD', main: '#facc15', second: '#ca8a04', glow: 'rgba(250,204,21,0.45)' },
    { name: 'BLOOD RED', main: '#ef4444', second: '#b91c1c', glow: 'rgba(239,68,68,0.45)' }
  ];
  return themes[Math.floor(Math.random() * themes.length)];
}

async function getUserAvatar(senderID) {
  // Essaie 3 méthodes pour choper la PP
  const urls = [
    `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`,
    `https://graph.facebook.com/${senderID}/picture?width=512&height=512`,
    `https://api.nixhost.top/aryan/fb-avatar?uid=${senderID}`
  ];

  for (const url of urls) {
    try {
      const img = await loadImage(url);
      return img;
    } catch {}
  }
  return null;
}

async function genHelpCanvas(commands, page, totalPages, totalCmds, senderID, theme) {
  const W = 1120, H = 1660;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0,0,W,H);

  const g1 = ctx.createRadialGradient(900, 0, 0, 900, 0, 900);
  g1.addColorStop(0, theme.glow); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0,0,W,H);

  // Avatar USER qui a tapé la commande
  const avatar = await getUserAvatar(senderID);

  ctx.shadowColor = theme.main; ctx.shadowBlur = 30;
  ctx.fillStyle = theme.main;
  ctx.beginPath(); ctx.arc(110, 110, 74, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  const ringGrad = ctx.createLinearGradient(36,36,184,184);
  ringGrad.addColorStop(0, theme.main); ringGrad.addColorStop(1, theme.second);
  ctx.fillStyle = ringGrad;
  ctx.beginPath(); ctx.arc(110,110,72,0,Math.PI*2); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(110,110,60,0,Math.PI*2); ctx.clip();
  if (avatar) {
    ctx.drawImage(avatar, 50, 50, 120, 120);
  } else {
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(50,50,120,120);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Sans'; ctx.textAlign='center'; ctx.fillText('?',110,125); ctx.textAlign='left';
  }
  ctx.restore();

  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(110,110,60,0,Math.PI*2); ctx.stroke();

  ctx.fillStyle = '#fff'; ctx.font = 'bold 58px Sans'; ctx.fillText("CENTRE D'AIDE", 220, 110);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '600 22px Sans'; ctx.fillText(`RAYD BOT • ${totalCmds} COMMANDES`, 220, 145);
  ctx.fillStyle = theme.main; ctx.font = 'bold 24px Sans'; ctx.fillText(`PAGE ${page} / ${totalPages} • ${theme.name}`, 220, 178);

  const lineGrad = ctx.createLinearGradient(50,0,W-50,0);
  lineGrad.addColorStop(0, theme.main); lineGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.strokeStyle = lineGrad; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(50,225); ctx.lineTo(W-50,225); ctx.stroke();

  let y = 265;
  for (const cmd of commands) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; roundRect(ctx, 45, y, W-90, 135, 22, true);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    roundRect(ctx, 45, y, W-90, 135, 22, false, true);

    const barGrad = ctx.createLinearGradient(45, y, 45, y+135);
    barGrad.addColorStop(0, theme.main); barGrad.addColorStop(1, theme.second);
    ctx.fillStyle = barGrad;
    roundRect(ctx, 45, y, 7, 135, 7, true);

    ctx.fillStyle = '#fff'; ctx.font = 'bold 31px Sans'; ctx.fillText(`/${cmd.name}`, 90, y+52);
    ctx.fillStyle = '#a1a1aa'; ctx.font = '19px Sans';
    let desc = cmd._desc || 'Pas de description';
    if (desc.length > 68) desc = desc.slice(0,68)+'...';
    ctx.fillText(desc, 90, y+88);

    const cat = (cmd.category || 'OTHER').toUpperCase();
    const cd = `${cmd.coolDown||cmd.countDown||3}s`;
    const role = getRoleName(cmd.role);

    drawTag(ctx, W-380, y+32, 150, 32, cat, '#c4b5fd', 'rgba(139,92,246,0.18)', 'rgba(139,92,246,0.4)');
    drawTag(ctx, W-210, y+32, 85, 32, `⏱ ${cd}`, '#e4e4e7', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.15)');

    let rBg = theme.main, rColor = '#000', rBorder = theme.main;
    if (role === 'ADMIN') { rBg = '#facc15'; rColor = '#000'; rBorder = '#facc15'; }
    if (role === 'OWNER') { rBg = '#ef4444'; rColor = '#fff'; rBorder = '#ef4444'; }
    drawTag(ctx, W-110, y+32, 85, 32, role, rColor, rBg, rBorder, true);

    ctx.fillStyle = theme.main; ctx.shadowColor = theme.main; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(90, y+118, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    y += 160;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '18px Sans'; ctx.textAlign='center';
  ctx.fillText(`✦ Thème ${theme.name} • /help ${page < totalPages? page+1 : 1} pour continuer ✦`, W/2, H-35);
  ctx.textAlign='left';
  return canvas.toBuffer('image/png');
}

function getRoleName(r){ if(r==1) return 'ADMIN'; if(r==2||r==3) return 'OWNER'; return 'ALL'; }
function roundRect(ctx,x,y,w,h,r,fill=false,stroke=false){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }
function drawTag(ctx,x,y,w,h,text,color,bg,border,bold=false){ ctx.fillStyle=bg; roundRect(ctx,x,y,w,h,10,true); ctx.strokeStyle=border; ctx.lineWidth=1; roundRect(ctx,x,y,w,h,10,false,true); ctx.fillStyle=color; ctx.font=`${bold?'bold ':''}600 14px Sans`; ctx.textAlign='center'; ctx.fillText(text, x+w/2, y+20.5); ctx.textAlign='left'; }
async function genDetailCanvas(cmd, senderID, theme){
  const W=950,H=550; const canvas=createCanvas(W,H); const ctx=canvas.getContext('2d');
  ctx.fillStyle='#0a0a0f'; ctx.fillRect(0,0,W,H);
  const avatar = await getUserAvatar(senderID);
  if(avatar){ ctx.save(); ctx.beginPath(); ctx.arc(80,80,40,0,Math.PI*2); ctx.clip(); ctx.drawImage(avatar,40,40,80,80); ctx.restore(); }
  ctx.fillStyle='#fff'; ctx.font='bold 42px Sans'; ctx.fillText(`/${cmd.name}`, 140, 90);
  ctx.fillStyle='#a1a1aa'; ctx.font='21px Sans'; wrapText(ctx, cmd._desc||'',40,140,870,28);
  ctx.fillStyle=theme.main; ctx.font='bold 18px Sans'; ctx.fillText(`USAGE: ${cmd.usage||cmd.name} • AUTHOR: ${cmd.author}`,40,260);
  return canvas.toBuffer();
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){ const words=text.split(' '); let line=''; let yy=y; for(let n=0;n<words.length;n++){ let test=line+words[n]+' '; if(ctx.measureText(test).width>maxWidth && n>0){ ctx.fillText(line,x,yy); line=words[n]+' '; yy+=lineHeight; } else line=test; } ctx.fillText(line,x,yy); }
