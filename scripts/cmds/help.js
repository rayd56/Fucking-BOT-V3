const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

async function generateTextImage(prefix, commands, totalCmds) {
  const width = 1400, height = 950;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // FOND CYBER NEBULA
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#0a0a2e");
  bgGrad.addColorStop(0.3, "#1a0033");
  bgGrad.addColorStop(0.7, "#16213e");
  bgGrad.addColorStop(1, "#0f0f23");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Particules
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  for(let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // PANNEAU
  const panelW = 1280, panelH = 820;
  const panelX = (width - panelW) / 2, panelY = (height - panelH) / 2;
  ctx.fillStyle = "rgba(20, 25, 50, 0.9)";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 25);
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY);
  borderGrad.addColorStop(0, "#8a2be2");
  borderGrad.addColorStop(0.5, "#00d4ff");
  borderGrad.addColorStop(1, "#8a2be2");
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.shadowColor = "#8a2be2";
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // HEADER
  ctx.textAlign = "center";
  ctx.font = "bold 46px Arial";
  const titleGrad = ctx.createLinearGradient(width/2 - 220, 0, width/2 + 220, 0);
  titleGrad.addColorStop(0, "#8a2be2");
  titleGrad.addColorStop(1, "#00d4ff");
  ctx.fillStyle = titleGrad;
  ctx.shadowColor = "#8a2be2";
  ctx.shadowBlur = 18;
  ctx.fillText("RAYD EFOUA HUB V8.4", width/2, panelY + 65);
  ctx.shadowBlur = 0;

  ctx.font = "17px Arial";
  ctx.fillStyle = "#c0d0ff";
  ctx.fillText(`Prefix: [ ${prefix} ]  |  Total: ${totalCmds} commandes`, width/2, panelY + 100);

  // TEXTE DANS IMAGE + CAPTION
  const startY = panelY + 155;
  const lineHeight = 26;
  const colWidth = (panelW - 80) / 4;
  const cols = Array.from({ length: 4 }, () => []);
  
  commands.sort().forEach((cmd, i) => cols[i % 4].push(cmd));

  ctx.textAlign = "left";
  ctx.font = "14px monospace";
  
  let captionText = `◈ RAYD EFOUA HUB V8.4 ◈\nPrefix: [ ${prefix} ] | ${totalCmds} commandes\n`;
  
  cols.forEach((colCmds, colIndex) => {
    const x = panelX + 40 + colIndex * colWidth;
    let y = startY;
    
    colCmds.forEach(cmd => {
      ctx.fillStyle = "#e8e8ff";
      ctx.shadowColor = "#8a2be2";
      ctx.shadowBlur = 6;
      ctx.fillText(`▸ ${cmd}`, x, y);
      ctx.shadowBlur = 0;
      y += lineHeight;
      
      captionText += `▸ ${cmd}\n`; // Même texte dans caption
    });
    captionText += `\n`;
  });

  captionText += `◈ Powered by Rayd Efoua AI 2026 ◈`;

  // SAVE
  const cacheDir = path.join(process.cwd(), "cache");
  await fs.ensureDir(cacheDir);
  const imgPath = path.join(cacheDir, `help_text_${Date.now()}.png`);
  await fs.writeFile(imgPath, canvas.toBuffer("image/png"));
  
  return { imgPath, captionText };
}

module.exports = {
  config: {
    name: "help",
    version: "8.4.2",
    author: "Rayd",
    role: 0,
    category: "system"
  },
  onStart: async function({ message, event }) {
    try {
      const prefix = global.GoatBot.config.prefix;
      const commands = Array.from(global.GoatBot.commands.keys());
      const { imgPath, captionText } = await generateTextImage(prefix, commands, commands.length);
      
      // ✅ CAPTION = MÊME TEXTE QUE L'IMAGE
      return message.reply({
        body: captionText, // Texte visible quand tu réponds à l'image
        attachment: fs.createReadStream(imgPath)
      });
    } catch(e) {
      console.error(e);
      return message.reply("❌ Erreur: " + e.message);
    }
  }
};
