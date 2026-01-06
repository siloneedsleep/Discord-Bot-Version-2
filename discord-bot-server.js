/**
 * Minimalized Skibidi bot server with:
 * - Postgres JSONB storage (via db.js) (fallback to data.json if no DATABASE_URL)
 * - Music (play-dl + @discordjs/voice) using Dockerfile(ffmpeg)
 * - Simple shop + ticket persistence
 * - Internal REST API endpoints protected by BOT_DASHBOARD_TOKEN for dashboard integration
 *
 * Env variables required:
 * - TOKEN (Discord bot token)
 * - CLIENT_ID (Discord app client id)
 * - OWNER_ID
 * - BOT_DASHBOARD_TOKEN (shared secret for dashboard ⇄ bot)
 * - DATABASE_URL (optional, for persistent storage)
 * - PGSSLMODE=require (if DB requires SSL)
 * - PORT (optional)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const NodeCache = require('node-cache');

// Optional music libs
let playdl = null;
let voice = null;
try {
  playdl = require('play-dl');
  voice = require('@discordjs/voice');
} catch (e) {
  console.warn('⚠️ play-dl or @discordjs/voice không được cài — lệnh music sẽ không hoạt động nếu thiếu các package này.');
}

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
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = '?';
const OWNER_ID = process.env.OWNER_ID;
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const BOT_DASHBOARD_TOKEN = process.env.BOT_DASHBOARD_TOKEN || null;

if (!TOKEN) {
  console.error('❌ TOKEN không được cung cấp! Bot không thể đăng nhập.');
  process.exit(1);
}

// === DATA LOADING / FALLBACK ===
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
  // Try DB first
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

  // Fallback to data.json
  if (fs.existsSync(dataPath)) {
    try {
      data = Object.assign(data, JSON.parse(fs.readFileSync(dataPath)));
      console.log('📂 Dữ liệu đã được tải từ data.json.');
    } catch (e) {
      console.error('⚠️ Lỗi đọc data.json, tạo mới...', e.message);
    }
  } else {
    // create file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }
}

// saveData respects DB if available, else writes file (queued)
function saveData() {
  if (process.env.DATABASE_URL && saveToDb) {
    // write to DB
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

// === MUSIC QUEUE ===
const musicQueues = new Map();

async function playNext(guildId) {
  const queue = musicQueues.get(guildId);
  if (!queue) return;
  if (queue.songs.length === 0) {
    setTimeout(() => {
      const q = musicQueues.get(guildId);
      if (q && q.songs.length === 0) {
        try { if (voice.getVoiceConnection(guildId)) voice.getVoiceConnection(guildId).destroy(); } catch (e) {}
        musicQueues.delete(guildId);
        queue.textChannel?.send('🛑 Queue kết thúc, đã rời kênh voice.');
      }
    }, 30000);
    return;
  }

  const song = queue.songs.shift();
  try {
    if (!playdl) throw new Error('Music packages chưa cài: play-dl/@discordjs/voice');

    if (playdl.is_expired && playdl.is_expired()) await playdl.refreshToken();

    let stream;
    if (song.url && /https?:\/\//.test(song.url)) {
      stream = await playdl.stream(song.url, { quality: 2 });
    } else {
      const searched = await playdl.search(song.query || song.url, { limit: 1 });
      if (!searched || searched.length === 0) throw new Error('Không tìm thấy bài hát.');
      stream = await playdl.stream(searched[0].url, { quality: 2 });
      song.title = searched[0].title;
      song.url = searched[0].url;
    }

    const resource = voice.createAudioResource(stream.stream, { inputType: stream.type });
    queue.player.play(resource);
    queue.textChannel.send(`▶️ Đang phát: **${song.title || song.url}** • requested by ${song.requestedBy}`);
  } catch (err) {
    console.error('❌ Lỗi phát nhạc:', err.message);
    queue.textChannel.send(`❌ Lỗi phát nhạc: ${err.message}`);
    setTimeout(() => playNext(guildId), 1000);
  }
}

function ensurePlayerForQueue(queue, guildId) {
  if (!queue.player) {
    const player = voice.createAudioPlayer();
    player.on('stateChange', (oldState, newState) => {
      if (newState.status === voice.AudioPlayerStatus.Idle && oldState.status !== voice.AudioPlayerStatus.Idle) {
        playNext(guildId);
      }
    });
    player.on('error', (err) => {
      console.error('Player error:', err.message);
      queue.textChannel?.send(`❌ Player error: ${err.message}`);
      playNext(guildId);
    });
    queue.player = player;
    if (queue.connection) queue.connection.subscribe(player);
  }
}

// === EXPRESS API for Dashboard (protected by BOT_DASHBOARD_TOKEN) ===
function checkDashboardAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!BOT_DASHBOARD_TOKEN) return res.status(403).json({ error: 'BOT_DASHBOARD_TOKEN not configured' });
  if (auth !== `Bearer ${BOT_DASHBOARD_TOKEN}`) return res.status(401).json({ error: 'Invalid token' });
  next();
}

// GET shop for guild
app.get('/api/guilds/:id/shop', checkDashboardAuth, (req, res) => {
  const gid = req.params.id;
  ensureGuildData(gid);
  res.json({ shop: data.shops[gid] || [] });
});

// POST add / replace shop array for guild
app.post('/api/guilds/:id/shop', checkDashboardAuth, async (req, res) => {
  const gid = req.params.id;
  const body = req.body;
  if (!Array.isArray(body.shop)) return res.status(400).json({ error: 'shop array required' });
  ensureGuildData(gid);
  data.shops[gid] = body.shop;
  await saveData();
  res.json({ ok: true, shop: data.shops[gid] });
});

// Optional: get tickets list
app.get('/api/guilds/:id/tickets', checkDashboardAuth, (req, res) => {
  const gid = req.params.id;
  ensureGuildData(gid);
  res.json({ tickets: data.tickets[gid] || [] });
});

app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// === DISCORD BOT EVENTS / Commands (minimal but functional) ===
client.once('ready', async () => {
  console.log(`✅ Bot đăng nhập: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // AFK removal on message
  if (data.afk[message.author.id]) {
    delete data.afk[message.author.id];
    await saveData();
    message.reply('✅ Bạn đã bị bỏ AFK vì bạn đã nhắn tin trở lại.');
  }

  // mention AFK notify
  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach((u) => {
      if (data.afk[u.id]) {
        const info = data.afk[u.id];
        message.channel.send(`💤 ${u.tag} đang AFK: ${info.reason || 'Không có lý do'} (từ ${new Date(info.since).toLocaleString()})`);
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
      return message.reply(`💤 Bạn đã được đặt AFK: ${reason}`);
    }

    if (cmd === 'shop') {
      const sub = args.shift();
      const gid = message.guild.id;
      ensureGuildData(gid);
      if (!sub || sub === 'list') {
        const list = (data.shops[gid] || []).map(it => `${it.id}. ${it.name} — ${it.price} 💰`).join('\n') || 'Shop trống.';
        return message.reply(`🛒 Shop:\n${list}`);
      }
      if (sub === 'buy') {
        const id = args[0];
        const item = (data.shops[gid] || []).find(x => String(x.id) === String(id));
        if (!item) return message.reply('❌ Không tìm thấy item.');
        if ((data.balances[message.author.id] || 0) < item.price) return message.reply('❌ Bạn không đủ tiền.');
        data.balances[message.author.id] = (data.balances[message.author.id] || 0) - item.price;
        const inv = data.inventories[gid][message.author.id] || [];
        const exist = inv.find(i => i.itemId === item.id);
        if (exist) exist.qty++;
        else inv.push({ itemId: item.id, qty: 1, name: item.name });
        data.inventories[gid][message.author.id] = inv;
        await saveData();
        return message.reply(`✅ Đã mua ${item.name}`);
      }
      if (sub === 'add') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('🚫 Bạn cần quyền Admin để thêm item.');
        const id = args.shift();
        const price = parseInt(args.pop());
        const name = args.join(' ');
        if (!id || !name || isNaN(price)) return message.reply('❌ Dùng: `?shop add <id> <name> <price>`');
        data.shops[gid].push({ id, name, price });
        await saveData();
        return message.reply(`✅ Thêm item ${name}`);
      }
    }

    // Music: minimal play/skip/stop
    if (cmd === 'play') {
      if (!playdl || !voice) return message.reply('❌ Lệnh music chưa khả dụng — thiếu package play-dl hoặc @discordjs/voice.');
      const query = args.join(' ');
      if (!query) return message.reply('❌ Dùng: `?play <url hoặc từ khoá>`');
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) return message.reply('❌ Bạn phải ở trong voice channel để phát nhạc.');
      const gid = message.guild.id;
      let queue = musicQueues.get(gid);
      if (!queue) {
        queue = { textChannel: message.channel, voiceChannel, connection: null, player: null, songs: [] };
        musicQueues.set(gid, queue);
      }
      const song = { title: null, url: (/https?:\/\//.test(query) ? query : null), query, requestedBy: message.author.tag };
      try {
        if (!voice.getVoiceConnection(gid)) {
          const conn = voice.joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: gid,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: false
          });
          queue.connection = conn;
        } else {
          queue.connection = voice.getVoiceConnection(gid);
        }
        ensurePlayerForQueue(queue, gid);
        queue.connection.subscribe(queue.player);
        queue.songs.push(song);
        message.channel.send(`➕ Đã thêm vào queue: **${song.query}**`);
        if (queue.player.state.status === voice.AudioPlayerStatus.Idle) playNext(gid);
      } catch (err) {
        console.error('❌ Lỗi join voice:', err.message);
        return message.reply(`❌ Lỗi join voice: ${err.message}`);
      }
    }

    if (cmd === 'skip') {
      const gid = message.guild.id;
      const queue = musicQueues.get(gid);
      if (!queue) return message.reply('❌ Không có bài nào đang phát.');
      queue.player.stop();
      return message.reply('⏭ Đã skip bài.');
    }

    if (cmd === 'stop') {
      const gid = message.guild.id;
      const queue = musicQueues.get(gid);
      if (!queue) return message.reply('❌ Không có bài nào đang phát.');
      queue.songs = [];
      try { if (voice.getVoiceConnection(gid)) voice.getVoiceConnection(gid).destroy(); } catch (e) {}
      musicQueues.delete(gid);
      return message.reply('⏹ Đã dừng phát và rời kênh voice.');
    }

  } catch (error) {
    console.error('Command error:', error);
    message.reply('❌ Lỗi khi xử lý lệnh.');
  }
});

// Errors
client.on('error', e => console.error('Discord client error:', e));
process.on('unhandledRejection', (e) => console.error('Unhandled promise rejection:', e && e.stack ? e.stack : e));

// startup
(async () => {
  await initData();
  client.login(TOKEN).catch((e) => {
    console.error('❌ Lỗi đăng nhập:', e.message);
    process.exit(1);
  });
})();
