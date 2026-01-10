/**
 * Skibidi Bot Server - Full Edition
 * Manager, Minigames, Economy & Leaderboard
 * Credit: by ski_shimano
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');

const { loadData: loadFromDb, saveData: saveToDb } = (() => {
  try { return require('./db'); } catch (e) { return {}; }
})();

const app = express();
app.use(express.json());
app.get('/', (req, res) => res.send('✅ Bot is running! Credit: by ski_shimano'));
const PORT = process.env.PORT || 10000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = '?';
const TOKEN = process.env.TOKEN;

// === CẤU TRÚC DỮ LIỆU ĐẦY ĐỦ ===
let data = {
  balances: {},
  warns: {},
  stocks: { AAPL: 100, TSLA: 120, GME: 80 },
  afk: {},
  shops: {},
  inventories: {},
  tickets: {},
  cooldowns: {} 
};

async function initData() {
  if (process.env.DATABASE_URL && loadFromDb && saveToDb) {
    try {
      const loaded = await loadFromDb('global');
      if (loaded) data = Object.assign(data, loaded);
      else await saveToDb(data, 'global');
      console.log('📂 Data synced with Postgres.');
      return;
    } catch (e) { console.warn('⚠️ DB Load Error:', e.message); }
  }
}

async function saveData() {
  if (process.env.DATABASE_URL && saveToDb) {
    return saveToDb(data, 'global').catch(e => console.error('❌ DB Save Error:', e.message));
  }
}

// === BOT EVENTS ===
client.once('ready', () => console.log(`✅ Online: ${client.user.tag} | Credit: by ski_shimano`));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Xử lý AFK
  if (data.afk[message.author.id]) {
    delete data.afk[message.author.id];
    await saveData();
    message.reply('✅ Chào mừng bạn quay trở lại! Đã tắt chế độ AFK.');
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  try {
    // --- 1. MANAGER COMMANDS ---
    if (cmd === 'warn') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Bạn không có quyền quản trị viên.');
      const target = message.mentions.users.first();
      if (!target) return message.reply('⚠️ Tag người cần cảnh cáo.');
      if (!data.warns[target.id]) data.warns[target.id] = [];
      data.warns[target.id].push({ reason: args.slice(1).join(' ') || 'Không lý do', time: Date.now() });
      await saveData();
      message.reply(`⚠️ Đã warn **${target.tag}**. Tổng: ${data.warns[target.id].length} lần.`);
    }

    if (cmd === 'clear') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Bạn không có quyền xóa tin nhắn.');
      const num = parseInt(args[0]) || 10;
      await message.channel.bulkDelete(Math.min(num, 100), true);
      message.channel.send(`🧹 Đã dọn dẹp ${num} tin nhắn.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    // --- 2. ECONOMY & MINIGAMES ---
    if (cmd === 'work') {
      const now = Date.now();
      const last = data.cooldowns[`work_${message.author.id}`] || 0;
      if (now - last < 3600000) return message.reply(`⏳ Bạn đang mệt, nghỉ ngơi tí đi (Chờ ${Math.ceil((3600000 - (now-last))/60000)} phút).`);
      
      const gain = Math.floor(Math.random() * 300) + 100;
      data.balances[message.author.id] = (data.balances[message.author.id] || 0) + gain;
      data.cooldowns[`work_${message.author.id}`] = now;
      await saveData();
      message.reply(`⚒️ Bạn đã làm việc và nhận được **${gain}** 💰`);
    }

    if (cmd === 'bal') {
      const bal = data.balances[message.author.id] || 0;
      message.reply(`💳 Tài khoản của bạn: **${bal}** 💰`);
    }

    if (cmd === 'cf') { // Coinflip
      const bet = parseInt(args[0]);
      const bal = data.balances[message.author.id] || 0;
      if (isNaN(bet) || bet <= 0 || bet > bal) return message.reply('❌ Tiền cược không hợp lệ.');
      const win = Math.random() > 0.5;
      data.balances[message.author.id] += win ? bet : -bet;
      await saveData();
      message.reply(win ? `🪙 **NGỬA!** Bạn thắng **${bet}** 💰` : `🪙 **SẤP!** Bạn mất **${bet}** 💰`);
    }

    // --- 3. LEADERBOARD ---
    if (cmd === 'lb' || cmd === 'top') {
      const sorted = Object.entries(data.balances)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
      
      let lbMsg = "🏆 **BẢNG XẾP HẠNG ĐẠI GIA** 🏆\n\n";
      for (let i = 0; i < sorted.length; i++) {
        const user = await client.users.fetch(sorted[i][0]).catch(() => ({ tag: 'Người dùng ẩn danh' }));
        lbMsg += `**#${i + 1}** ${user.tag} — ${sorted[i][1]} 💰\n`;
      }
      lbMsg += "\n*By ski_shimano*";
      message.reply(lbMsg);
    }

    // --- 4. CREDIT ---
    if (cmd === 'credit') {
      message.reply('🛠️ Bot được phát triển bởi: **ski_shimano**');
    }

  } catch (err) {
    console.error(err);
    message.reply('❌ Lỗi thực thi lệnh.');
  }
});

(async () => {
  await initData();
  app.listen(PORT, () => console.log(`🌐 Server on port ${PORT}`));
  client.login(TOKEN);
})();
