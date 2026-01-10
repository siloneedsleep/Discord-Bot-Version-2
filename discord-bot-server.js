/**
 * Minimalized Skibidi bot server
 * Đã loại bỏ hoàn toàn các tính năng liên quan đến nhạc.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const { loadData: loadFromDb, saveData: saveToDb } = (() => {
  try {
    return require('./db');
  } catch (e) {
    return {};
  }
})();

// === WEB SERVER ===
const app = express();
app.use(express.json());
app.get('/', (req, res) => res.send('✅ Bot đang chạy!'));
const PORT = process.env.PORT || 10000;

// === DISCORD CLIENT ===
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
const BOT_DASHBOARD_TOKEN = process.env.BOT_DASHBOARD_TOKEN || null;

if (!TOKEN) {
  console.error('❌ TOKEN không được cung cấp!');
  process.exit(1);
}

// === DATA LOADING ===
const dataPath = path.join(__dirname, 'data.json');
let data = {
  balances: {},
  warns: {},
  stocks: { AAPL: 100, TSLA: 120, GME: 80 },
  afk: {},
  shops: {},
  inventories: {},
  tickets: {}
};

let saveQueue = Promise.resolve();

async function initData() {
  if (process.env.DATABASE_URL && loadFromDb && saveToDb) {
    try {
      const loaded = await loadFromDb('global');
      if (loaded) data = Object.assign(data, loaded);
      else await saveToDb(data, 'global');
      console.log('📂 Dữ liệu đã được tải từ Postgres.');
      return;
    } catch (e) {
      console.warn('⚠️ Không thể load từ Postgres:', e.message);
    }
  }

  if (fs.existsSync(dataPath)) {
    try {
      data = Object.assign(data, JSON.parse(fs.readFileSync(dataPath)));
      console.log('📂 Dữ liệu đã được tải từ data.json.');
    } catch (e) {
      console.error('⚠️ Lỗi đọc data.json, tạo mới...');
    }
  } else {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }
}

function saveData() {
  if (process.env.DATABASE_URL && saveToDb) {
    return saveToDb(data, 'global').catch((e) => console.error('❌ Lỗi lưu vào DB:', e.message));
  }
  saveQueue = saveQueue.then(() => {
    return new Promise((resolve) => {
      fs.writeFile(dataPath, JSON.stringify(data, null, 2), (err) => {
        if (err) console.error('❌ Lỗi lưu data:', err.message);
        resolve();
      });
    });
  });
  return saveQueue;
}

// === UTILS ===
function ensureGuildData(guildId) {
  if (!data.shops[guildId]) data.shops[guildId] = [];
  if (!data.inventories[guildId]) data.inventories[guildId] = {};
  if (!data.tickets[guildId]) data.tickets[guildId] = [];
}

// === API FOR DASHBOARD ===
function checkDashboardAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!BOT_DASHBOARD_TOKEN) return res.status(403).json({ error: 'BOT_DASHBOARD_TOKEN not configured' });
  if (auth !== `Bearer ${BOT_DASHBOARD_TOKEN}`) return res.status(401).json({ error: 'Invalid token' });
  next();
}

app.get('/api/guilds/:id/shop', checkDashboardAuth, (req, res) => {
  ensureGuildData(req.params.id);
  res.json({ shop: data.shops[req.params.id] || [] });
});

app.post('/api/guilds/:id/shop', checkDashboardAuth, async (req, res) => {
  const gid = req.params.id;
  if (!Array.isArray(req.body.shop)) return res.status(400).json({ error: 'shop array required' });
  ensureGuildData(gid);
  data.shops[gid] = req.body.shop;
  await saveData();
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`🌐 Web server chạy tại port ${PORT}`));

// === BOT EVENTS ===
client.once('ready', () => console.log(`✅ Bot online: ${client.user.tag}`));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Xử lý AFK
  if (data.afk[message.author.id]) {
    delete data.afk[message.author.id];
    await saveData();
    message.reply('✅ Bạn đã quay trở lại, chế độ AFK đã tắt.');
  }

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach((u) => {
      if (data.afk[u.id]) {
        const info = data.afk[u.id];
        message.channel.send(`💤 ${u.tag} đang AFK: ${info.reason} (từ ${new Date(info.since).toLocaleString()})`);
      }
    });
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  try {
    if (cmd === 'ping') return message.reply(`🏓 Pong: ${client.ws.ping}ms`);

    if (cmd === 'afk') {
      const reason = args.join(' ') || 'Không có lý do';
      data.afk[message.author.id] = { reason, since: Date.now() };
      await saveData();
      return message.reply(`💤 Bạn đã treo máy: ${reason}`);
    }

    if (cmd === 'shop') {
      const sub = args.shift();
      const gid = message.guild.id;
      ensureGuildData(gid);

      if (!sub || sub === 'list') {
        const list = data.shops[gid].map(it => `**${it.id}**. ${it.name} — ${it.price} 💰`).join('\n') || 'Shop hiện đang trống.';
        return message.reply(`🛒 **Cửa hàng của Server:**\n${list}`);
      }

      if (sub === 'buy') {
        const id = args[0];
        const item = data.shops[gid].find(x => String(x.id) === String(id));
        if (!item) return message.reply('❌ Không tìm thấy vật phẩm này.');
        
        const balance = data.balances[message.author.id] || 0;
        if (balance < item.price) return message.reply('❌ Bạn không đủ tiền!');

        data.balances[message.author.id] = balance - item.price;
        const inv = data.inventories[gid][message.author.id] || [];
        const exist = inv.find(i => i.itemId === item.id);
        
        if (exist) exist.qty++;
        else inv.push({ itemId: item.id, qty: 1, name: item.name });
        
        data.inventories[gid][message.author.id] = inv;
        await saveData();
        return message.reply(`✅ Bạn đã mua thành công **${item.name}**!`);
      }

      if (sub === 'add' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const id = args.shift();
        const price = parseInt(args.pop());
        const name = args.join(' ');
        if (!id || !name || isNaN(price)) return message.reply('❌ Dùng: `?shop add <id> <tên> <giá>`');
        
        data.shops[gid].push({ id, name, price });
        await saveData();
        return message.reply(`✅ Đã thêm **${name}** vào shop.`);
      }
    }
  } catch (error) {
    console.error(error);
    message.reply('❌ Đã xảy ra lỗi khi thực hiện lệnh.');
  }
});

(async () => {
  await initData();
  client.login(TOKEN).catch(e => {
    console.error('❌ Lỗi đăng nhập:', e.message);
    process.exit(1);
  });
})();
