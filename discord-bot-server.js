/**
 * SKIBIDI BOT - BOT DÀNH CHO SERVER SKIBIDI HUB
 * Developed by: ski_shimano
 * Full Suite: Economy, Moderation, Logging, Leveling, Auto-Mod, Welcome, Games, Utility
 */
require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');

// --- DATABASE HELPER ---
const { loadData: loadFromDb, saveData: saveToDb } = (() => {
  try { return require('./db'); } catch (e) { return {}; }
})();

// --- WEB SERVER (Giữ bot sống 24/7) ---
const app = express();
app.get('/', (req, res) => res.send('✅ Skibidi Bot (Skibidi Hub) is Online! | By ski_shimano'));
app.listen(process.env.PORT || 10000);

// --- CLIENT SETUP ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences, 
    GatewayIntentBits.GuildModeration
  ]
});

const PREFIX = '?';
let data = {
  balances: {}, warns: {}, levels: {}, afk: {}, 
  shops: {}, inventories: {}, cooldowns: {}, logs: {}
};

// --- CORE FUNCTIONS ---
async function initData() {
  if (process.env.DATABASE_URL && loadFromDb) {
    try {
      const loaded = await loadFromDb('global');
      if (loaded) data = Object.assign(data, loaded);
      console.log('📂 Dữ liệu Skibidi Hub đã được tải.');
    } catch (e) { console.error('⚠️ Lỗi DB:', e.message); }
  }
}

async function saveData() {
  if (process.env.DATABASE_URL && saveToDb) {
    await saveToDb(data, 'global').catch(e => console.error('❌ Lỗi lưu DB:', e.message));
  }
}

// Hàm gửi Log hệ thống
async function sendLog(guild, title, description, color = '#ff0000') {
  const logChannelId = data.logs[guild.id];
  if (!logChannelId) return;
  const channel = guild.channels.cache.get(logChannelId);
  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: 'Skibidi Hub Logs | by ski_shimano' });
    channel.send({ embeds: [embed] });
  }
}

// --- EVENTS ---
client.once('ready', () => {
  console.log(`🚀 Bot đã sẵn sàng: ${client.user.tag}`);
  client.user.setActivity('Skibidi Hub | ?help', { type: ActivityType.Watching });
});

client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.systemChannel;
  if (channel) {
    const welcome = new EmbedBuilder()
      .setColor('#00FFCC')
      .setTitle('✨ THÀNH VIÊN MỚI!')
      .setDescription(`Chào mừng **${member.user.username}** đã gia nhập **Skibidi Hub**!`)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'by ski_shimano' });
    channel.send({ embeds: [welcome] });
  }
});

client.on('messageDelete', (message) => {
  if (!message.guild || message.author?.bot) return;
  sendLog(message.guild, '🗑️ Tin nhắn bị xóa', `**Người gửi:** <@${message.author.id}>\n**Kênh:** <#${message.channel.id}>\n**Nội dung:** ${message.content || 'Không có văn bản'}`);
});

// --- COMMAND HANDLER ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const uid = message.author.id;
  const gid = message.guild.id;

  // 1. AFK CHECK
  if (data.afk[uid]) {
    delete data.afk[uid];
    await saveData();
    message.reply('✅ Bạn đã hết AFK!');
  }
  message.mentions.users.forEach(u => {
    if (data.afk[u.id]) message.reply(`💤 **${u.username}** đang AFK: ${data.afk[u.id].reason}`);
  });

  // 2. LEVELING
  if (!data.levels[uid]) data.levels[uid] = { xp: 0, level: 0 };
  data.levels[uid].xp += 10;
  if (data.levels[uid].xp >= (data.levels[uid].level + 1) * 500) {
    data.levels[uid].level++;
    message.channel.send(`🎊 Chúc mừng <@${uid}> đã đạt Level **${data.levels[uid].level}**!`);
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  try {
    // === LỆNH HỆ THỐNG ===
    if (cmd === 'help') {
      const helpEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🛠️ SKIBIDI HUB MENU')
        .addFields(
          { name: '🛡️ Quản lý', value: '`warn`, `mute`, `unmute`, `clear`, `setlog`, `afk`' },
          { name: '💰 Kinh tế', value: '`daily`, `work`, `bal`, `lb`, `pay`' },
          { name: '🎲 Game', value: '`cf`, `slot`, `taixiu`, `rank`' },
          { name: 'ℹ️ Khác', value: '`avatar`, `serverinfo`, `credit`' }
        )
        .setFooter({ text: 'Bot dành cho Server Skibidi Hub | by ski_shimano' });
      return message.reply({ embeds: [helpEmbed] });
    }

    // === LỆNH QUẢN LÝ ===
    if (cmd === 'setlog') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
      data.logs[gid] = message.channel.id;
      await saveData();
      message.reply('✅ Kênh này đã được đặt làm Log Channel!');
    }

    if (cmd === 'warn') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
      const target = message.mentions.users.first();
      if (!target) return message.reply('Tag người cần warn!');
      if (!data.warns[target.id]) data.warns[target.id] = [];
      data.warns[target.id].push({ reason: args.join(' ') || 'Không lý do', time: Date.now() });
      await saveData();
      message.reply(`⚠️ Đã warn **${target.tag}**. (Lần ${data.warns[target.id].length})`);
    }

    if (cmd === 'mute') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
      const target = message.mentions.members.first();
      const time = parseInt(args[1]) || 10;
      if (!target) return message.reply('Tag người cần mute!');
      await target.timeout(time * 60 * 1000);
      message.reply(`🔇 Đã mute ${target.user.tag} trong ${time} phút.`);
    }

    if (cmd === 'clear') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
      const amount = parseInt(args[0]) || 10;
      await message.channel.bulkDelete(Math.min(amount, 100), true);
      message.channel.send(`🧹 Đã xóa ${amount} tin nhắn.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    // === LỆNH KINH TẾ ===
    if (cmd === 'daily') {
      const now = Date.now();
      if (now - (data.cooldowns[`d_${uid}`] || 0) < 86400000) return message.reply('⏳ Bạn đã nhận hôm nay rồi!');
      data.balances[uid] = (data.balances[uid] || 0) + 1000;
      data.cooldowns[`d_${uid}`] = now;
      await saveData();
      message.reply('💰 Bạn đã nhận 1000 tiền hàng ngày!');
    }

    if (cmd === 'work') {
      const now = Date.now();
      if (now - (data.cooldowns[`w_${uid}`] || 0) < 3600000) return message.reply('⏳ Nghỉ ngơi chút đã!');
      const gain = Math.floor(Math.random() * 200) + 100;
      data.balances[uid] = (data.balances[uid] || 0) + gain;
      data.cooldowns[`w_${uid}`] = now;
      await saveData();
      message.reply(`⚒️ Bạn làm việc và nhận được **${gain}** 💰`);
    }

    if (cmd === 'bal') {
      message.reply(`💳 Số dư của bạn: **${data.balances[uid] || 0}** 💰`);
    }

    if (cmd === 'taixiu') {
      const choice = args[0];
      const bet = parseInt(args[1]);
      if (!['tai', 'xiu'].includes(choice) || isNaN(bet) || bet > (data.balances[uid] || 0)) return message.reply('Cú pháp: `?taixiu <tai/xiu> <tiền>`');
      const roll = Math.floor(Math.random() * 18) + 3;
      const result = roll >= 11 ? 'tai' : 'xiu';
      const win = choice === result;
      data.balances[uid] += win ? bet : -bet;
      await saveData();
      message.reply(`🎲 Kết quả: **${roll}** (${result.toUpperCase()}) - Bạn **${win ? 'THẮNG' : 'THUA'}** ${bet} 💰`);
    }

    if (cmd === 'lb') {
      const sorted = Object.entries(data.balances).sort(([, a], [, b]) => b - a).slice(0, 10);
      let str = sorted.map(([id, b], i) => `**#${i+1}** <@${id}>: ${b} 💰`).join('\n');
      const embed = new EmbedBuilder().setTitle('🏆 TOP ĐẠI GIA SKIBIDI HUB').setDescription(str || 'Trống').setColor('#FFD700');
      message.reply({ embeds: [embed] });
    }

    if (cmd === 'credit') {
      message.reply('🌟 **Skibidi Bot - Bot dành cho Server Skibidi Hub**\nPhát triển bởi: **ski_shimano**\nTrạng thái: Hoạt động ổn định.');
    }

  } catch (err) { console.error(err); }
});

(async () => {
  await initData();
  client.login(process.env.TOKEN);
})();
