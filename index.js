require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActivityType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType 
} = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

// --- 🌐 WEB SERVER ---
const app = express();
const port = process.env.PORT || 8000;
app.get('/', (req, res) => res.send('Skibidi Bot 24/7 Online!'));
app.listen(port, '0.0.0.0', () => console.log(`✅ Cổng kết nối: ${port}`));

// --- 🛡️ CHỐNG SẬP ---
process.on('unhandledRejection', (r) => console.error('❌ Lỗi:', r));
process.on('uncaughtException', (e) => console.error('❌ Lỗi:', e));

// --- 💾 DATABASE ---
const MONGO_URI = process.env.MONGO_URI; 
mongoose.connect(MONGO_URI).then(() => console.log("✅ DB CONNECTED")).catch(e => console.error(e));

const User = mongoose.model('User', new mongoose.Schema({
    id: String, bal: { type: Number, default: 5000 }, perm: { type: Number, default: 0 }, 
    bio: { type: String, default: "Member của Skibidi Hub" }, cover: { type: String, default: "https://i.imgur.com/8f8ZpL8.png" },
    lastMine: { type: Number, default: 0 }, lastFish: { type: Number, default: 0 }
}));

const Global = mongoose.model('Global', new mongoose.Schema({ id: String, noti: String, whitelist: Array }));
const Gift = mongoose.model('Gift', new mongoose.Schema({
    code: String, amount: Number, limit: Number, usedBy: Array, expires: Date
}));

// --- ⚙️ CẤU HÌNH ---
const PREFIX = 'ski!';
const OWNER_ID = process.env.OWNER_ID || '914831312295165982';

async function getU(id) {
    let u = await User.findOne({ id });
    if (!u) { u = new User({ id, perm: (id === OWNER_ID ? 3 : 0) }); await u.save(); }
    return u;
}

const gameList = ['dabong', 'bongro', 'caulong', 'dua_xe', 'skibidi_dance', 'titan_battle'];

const commands = {
    // ⛏️ TÍNH NĂNG MINE (NÂNG CẤP)
    mine: async (m) => {
        let u = await getU(m.author.id);
        let cd = 45000; // 45 giây
        if (Date.now() - u.lastMine < cd) return m.reply(`⏳ Đừng vội thế! Hãy nghỉ ngơi **${Math.ceil((cd - (Date.now() - u.lastMine)) / 1000)}s** để hồi sức.`);

        const items = [
            { n: "Đá Cuội", v: [100, 300], c: "#95a5a6", p: 60, e: "🪨" },
            { n: "Sắt", v: [400, 800], c: "#bdc3c7", p: 25, e: "⛓️" },
            { n: "Vàng", v: [1000, 2500], c: "#f1c40f", p: 10, e: "💰" },
            { n: "Kim Cương", v: [5000, 10000], c: "#3498db", p: 4, e: "💎" },
            { n: "Cổ Vật Skibidi", v: [20000, 50000], c: "#e74c3c", p: 1, e: "🚽" }
        ];

        let rand = Math.random() * 100;
        let cumulative = 0;
        let found = items[0];

        for (const item of items) {
            cumulative += item.p;
            if (rand <= cumulative) { found = item; break; }
        }

        let reward = Math.floor(Math.random() * (found.v[1] - found.v[0] + 1)) + found.v[0];
        u.bal += reward; u.lastMine = Date.now(); await u.save();

        const emb = new EmbedBuilder()
            .setTitle(`${found.e} KẾT QUẢ KHAI THÁC`)
            .setColor(found.c)
            .setDescription(`**${m.author.username}** vừa xuống hầm mỏ và đào được:\n\n vật phẩm: **${found.n}**\n Giá trị: **+${reward.toLocaleString()} $SKI**`)
            .setFooter({ text: `Số dư: ${u.bal.toLocaleString()} $SKI` })
            .setTimestamp();
        m.reply({ embeds: [emb] });
    },

    // 🎣 TÍNH NĂNG CÂU CÁ (MỚI)
    cau_ca: async (m) => {
        let u = await getU(m.author.id);
        let cd = 30000; // 30 giây
        if (Date.now() - u.lastFish < cd) return m.reply(`🎣 Cá đang sợ đấy! Đợi thêm **${Math.ceil((cd - (Date.now() - u.lastFish)) / 1000)}s** nữa.`);

        const fish = [
            { n: "Cá Rô", v: [100, 200], c: "#7f8c8d", p: 50, e: "🐟" },
            { n: "Cá Chép", v: [300, 600], c: "#34495e", p: 30, e: "🐠" },
            { n: "Cá Mập", v: [2000, 5000], c: "#2980b9", p: 15, e: "🦈" },
            { n: "Cá Vàng Skibidi", v: [10000, 25000], c: "#f39c12", p: 4, e: "✨" },
            { n: "Rương Kho Báu Dưới Đáy Biển", v: [50000, 100000], c: "#8e44ad", p: 1, e: "🏴‍☠️" }
        ];

        let rand = Math.random() * 100;
        let cumulative = 0;
        let caught = fish[0];

        for (const f of fish) {
            cumulative += f.p;
            if (rand <= cumulative) { caught = f; break; }
        }

        let reward = Math.floor(Math.random() * (caught.v[1] - caught.v[0] + 1)) + caught.v[0];
        u.bal += reward; u.lastFish = Date.now(); await u.save();

        const emb = new EmbedBuilder()
            .setTitle(`${caught.e} CHUYẾN ĐI CÂU THÀNH CÔNG`)
            .setColor(caught.c)
            .setDescription(`**${m.author.username}** đã quăng cần và kéo lên được:\n\n Bạn bắt được: **${caught.n}**\n Tiền bán cá: **+${reward.toLocaleString()} $SKI**`)
            .setFooter({ text: `Số dư: ${u.bal.toLocaleString()} $SKI` })
            .setTimestamp();
        m.reply({ embeds: [emb] });
    },

    // --- CÁC LỆNH CŨ (GIỮ NGUYÊN & TỐI ƯU) ---
    profile: async (m) => {
        const target = m.mentions.users.first() || m.author; const u = await getU(target.id);
        const emb = new EmbedBuilder().setTitle(`Hồ sơ: ${target.username}`).setColor('#00FBFF').setImage(u.cover).setThumbnail(target.displayAvatarURL())
            .addFields({ name: '🛡️ Cấp bậc', value: `\`${["Thành viên", "Quản Trị", "Co-Owner", "Owner"][u.perm]}\``, inline: true }, { name: '💰 Ví tiền', value: `**${u.bal.toLocaleString()} $SKI**`, inline: true }, { name: '📝 Tiểu sử', value: u.bio });
        m.reply({ embeds: [emb] });
    },
    daily: async (m) => { 
        let u = await getU(m.author.id); u.bal += 5000; await u.save(); 
        m.reply({ embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('🎁 QUÀ HÀNG NGÀY').setDescription(`Bạn đã nhận được **5,000 $SKI**!`)] }); 
    },
    help: async (m) => { 
        const emb = new EmbedBuilder().setTitle('📖 DANH SÁCH LỆNH').setColor('#FFFFFF').addFields(
            { name: '💰 Kiếm tiền', value: '`mine`, `cau_ca`, `daily`, `giftcode`' },
            { name: '🎮 Giải trí', value: '`profile`, `send`, `listgames`' },
            { name: '👑 Admin', value: '`addgift`, `editcash`, `noti`' }
        );
        m.reply({ embeds: [emb] }); 
    },
    giftcode: async (m, args) => {
        const gift = await Gift.findOne({ code: args[0] });
        if (!gift || new Date() > gift.expires || gift.usedBy.length >= gift.limit || gift.usedBy.includes(m.author.id)) return m.reply("❌ Code sai hoặc đã dùng.");
        let u = await getU(m.author.id); u.bal += gift.amount; gift.usedBy.push(m.author.id);
        await u.save(); await gift.save(); 
        m.reply({ embeds: [new EmbedBuilder().setColor('#FF00FF').setDescription(`🎉 Bạn nhận được **${gift.amount.toLocaleString()} $SKI**!`)] });
    }
};

// Game betting system
gameList.forEach(g => {
    commands[g] = async (m, args) => {
        let u = await getU(m.author.id); let b = parseInt(args[0]) || 500;
        if (u.bal < b) return m.reply("❌ Không đủ tiền!");
        let w = Math.random() < 0.5; u.bal += w ? b : -b; await u.save();
        const emb = new EmbedBuilder().setTitle(`🎮 ${g.toUpperCase()}`).setDescription(w ? `🏆 **THẮNG!** +${b.toLocaleString()}` : `💀 **THUA!** -${b.toLocaleString()}`).setColor(w ? '#00FF00' : '#FF0000');
        m.reply({ embeds: [emb] });
    };
});

const client = new Client({ intents: [3276799] });
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.content.startsWith(PREFIX)) return;
    const args = m.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    if (commands[cmd]) await commands[cmd](m, args);
});
client.once('ready', () => { console.log(`✅ ${client.user.tag} ONLINE!`); });
client.login(process.env.TOKEN);
