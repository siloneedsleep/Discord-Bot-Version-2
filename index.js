require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActivityType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType 
} = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

// --- 🌐 WEB SERVER (KOYEB) ---
const app = express();
const port = process.env.PORT || 8000;
app.get('/', (req, res) => res.send('Skibidi Bot 24/7 Online!'));
app.listen(port, '0.0.0.0', () => console.log(`✅ Cổng kết nối: ${port}`));

// --- 🛡️ CHỐNG SẬP ---
process.on('unhandledRejection', (r) => console.error('❌ Lỗi:', r));
process.on('uncaughtException', (e) => console.error('❌ Lỗi:', e));

// --- 💾 DATABASE (MONGODB) ---
const MONGO_URI = process.env.MONGO_URI; 
mongoose.connect(MONGO_URI).then(() => console.log("✅ DB CONNECTED")).catch(e => console.error(e));

const User = mongoose.model('User', new mongoose.Schema({
    id: String, bal: { type: Number, default: 5000 }, perm: { type: Number, default: 0 }, 
    bio: { type: String, default: "Member của Skibidi Hub" }, cover: { type: String, default: "https://i.imgur.com/8f8ZpL8.png" }
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

const gameList = [
    'dabong', 'bongro', 'caulong', 'dua_xe', 'chay_bo', 'boi_loi', 'hit_dat', 'nhay_day', 'ban_cung', 'keo_co',
    'vat_tay', 'leo_nui', 'ban_sung_son', 'cau_ca', 'trong_cay', 'yoga', 'skibidi_dance', 'toilet_race', 'camera_fight', 'titan_battle',
    'dao_vang', 'chem_hoa_qua', 'ran_san_moi', 'sinh_ton', 'vuot_ngai_vat', 'pk_skibidi', 'nem_bong', 'tron_tim', 'xay_nha', 'nau_an',
    'boxing', 'golf', 'bida', 'bowling', 'ufo_catch', 'ninja_jump', 'samurai_slash', 'karate', 'taekwondo', 'marathon',
    'thue_xe', 'giao_hang', 'lam_vuon', 'doc_sach', 'lap_trinh', 've_tranh', 'hat_karaoke', 'di_cho', 'rua_xe', 'suc_manh',
    'thach_dau', 'dai_chien', 'cuop_co', 'nhay_xa', 'nem_ta', 'ban_sung_nuoc', 'kham_pha', 'chup_anh', 'quay_phim', 'du_lich'
];

const commands = {
    // 👑 QUẢN TRỊ
    addserver: async (m, args) => {
        if (m.author.id !== OWNER_ID) return;
        await Global.findOneAndUpdate({ id: "main" }, { $addToSet: { whitelist: args[0] || m.guild.id } }, { upsert: true });
        m.reply("✅ Đã thêm server vào Whitelist.");
    },
    noti: async (m, args) => {
        if ((await getU(m.author.id)).perm < 2) return;
        const channel = m.mentions.channels.first(); const content = args.slice(1).join(' ');
        if (!channel || !content) return m.reply("❌ `ski!noti #kênh nội dung` ");
        await Global.findOneAndUpdate({ id: "main" }, { noti: content }, { upsert: true });
        channel.send({ content: "@everyone", embeds: [new EmbedBuilder().setTitle('📢 THÔNG BÁO').setDescription(content).setColor('#FF0000')] });
    },
    co: async (m) => {
        if (m.author.id !== OWNER_ID) return;
        const target = m.mentions.users.first();
        if (target) { let u = await getU(target.id); u.perm = 2; await u.save(); m.reply(`👑 **${target.username}** -> Co-Owner.`); }
    },
    editcash: async (m, args) => {
        if ((await getU(m.author.id)).perm < 2) return;
        const target = m.mentions.users.first(); const amount = parseInt(args[1]);
        if (!target || isNaN(amount)) return m.reply("❌ `ski!editcash @user <số_tiền>`");
        let u = await getU(target.id); u.bal += amount; await u.save();
        m.reply(`✅ Đã chỉnh sửa tiền cho **${target.username}**.`);
    },
    addgift: async (m, args) => {
        if ((await getU(m.author.id)).perm < 2) return;
        const [code, amount, limit, days] = [args[0], parseInt(args[1]), parseInt(args[2]), parseInt(args[3]) || 7];
        if (!code || !amount || !limit) return m.reply("❌ `ski!addgift code tiền lượt_nhập ngày` ");
        const exp = new Date(); exp.setDate(exp.getDate() + days);
        await Gift.create({ code, amount, limit, usedBy: [], expires: exp });
        m.reply(`🎁 Đã tạo Code: **${code}** (${limit} lượt)`);
    },
    listcode: async (m) => {
        if ((await getU(m.author.id)).perm < 1) return;
        const codes = await Gift.find(); let txt = "📜 **GIFTCODE:**\n";
        codes.forEach(c => txt += `• **${c.code}**: ${c.usedBy.length}/${c.limit} lượt | Hạn: ${c.expires.toLocaleDateString()}\n`);
        m.reply(txt || "Chưa có code nào.");
    },

    // 💰 KINH TẾ
    profile: async (m) => {
        const target = m.mentions.users.first() || m.author; const u = await getU(target.id);
        const g = await Global.findOne({ id: "main" }) || { noti: "Welcome!" };
        const ranks = ["Thành viên", "Quản Trị", "Co-Owner", "Owner"];
        const emb = new EmbedBuilder().setTitle(`Hồ sơ: ${target.username}`).setColor('#00FBFF').setImage(u.cover).setThumbnail(target.displayAvatarURL())
            .addFields({ name: '🛡️ Cấp bậc', value: ranks[u.perm] || "Thành viên", inline: true }, { name: '💰 Ví tiền', value: `${u.bal.toLocaleString()} $SKI`, inline: true }, { name: '📢 THÔNG BÁO', value: `\`\`\`${g.noti}\`\`\`` }, { name: '📝 Tiểu sử', value: u.bio });
        m.reply({ embeds: [emb] });
    },
    send: async (m, args) => {
        const target = m.mentions.users.first(); const amount = parseInt(args[1]);
        if (!target || isNaN(amount) || amount <= 0 || target.id === m.author.id) return m.reply("❌ Sai cú pháp hoặc số tiền!");
        let s = await getU(m.author.id); if (s.bal < amount) return m.reply("❌ Bạn không đủ tiền!");
        let r = await getU(target.id); s.bal -= amount; r.bal += amount;
        await s.save(); await r.save(); m.reply(`✅ Đã gửi **${amount} $SKI** cho **${target.username}**.`);
    },
    giftcode: async (m, args) => {
        const gift = await Gift.findOne({ code: args[0] });
        if (!gift || new Date() > gift.expires || gift.usedBy.length >= gift.limit || gift.usedBy.includes(m.author.id)) return m.reply("❌ Code sai, hết hạn hoặc bạn đã dùng rồi!");
        let u = await getU(m.author.id); u.bal += gift.amount; gift.usedBy.push(m.author.id);
        await u.save(); await gift.save(); m.reply(`🎉 Nhận thành công **${gift.amount} $SKI**!`);
    },
    mine: async (m) => { let u = await getU(m.author.id); let f = Math.floor(Math.random() * 500) + 100; u.bal += f; await u.save(); m.reply(`⛏️ +${f} $SKI!`); },
    daily: async (m) => { let u = await getU(m.author.id); u.bal += 5000; await u.save(); m.reply("🎁 +5,000 $SKI!"); },
    help: async (m) => { m.reply("📖 **Lệnh:** `profile`, `mine`, `cash`, `daily`, `send`, `giftcode`, `listgames`\n👑 **Admin:** `addgift`, `listcode`, `editcash`, `noti`, `co`..."); },
    listgames: async (m) => { m.reply(`🎮 **GAMES:** \`${gameList.join(', ')}\``); }
};

gameList.forEach(g => {
    commands[g] = async (m, args) => {
        let u = await getU(m.author.id); let b = parseInt(args[0]) || 500;
        if (u.bal < b) return m.reply("❌ Không đủ tiền!");
        let w = Math.random() < 0.5; u.bal += w ? b : -b; await u.save();
        m.reply(w ? `🏆 [${g.toUpperCase()}] Thắng +${b}` : `💪 [${g.toUpperCase()}] Thua -${b}`);
    };
});

const client = new Client({ intents: [3276799] });
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.content.startsWith(PREFIX)) return;
    const args = m.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    if (commands[cmd]) await commands[cmd](m, args);
});
client.once('ready', () => { console.log(`✅ ${client.user.tag} ONLINE!`); client.user.setActivity('ski!help'); });
client.login(process.env.TOKEN);
