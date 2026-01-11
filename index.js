/**
 * SKIBIDI BOT V17.0 - BẢN TỐI ƯU CHO KOYEB
 * Đã sửa lỗi kết nối mạng (IP 0.0.0.0) và Port để xem được Log.
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActivityType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType 
} = require('discord.js');
const fs = require('fs');
const express = require('express');

// --- 🌐 WEB SERVER (QUAN TRỌNG ĐỂ XEM ĐƯỢC LOG TRÊN KOYEB) ---
const app = express();
const port = process.env.PORT || 8000; // Koyeb ưu tiên cổng 8000 hoặc 8080

app.get('/', (req, res) => res.send('Skibidi Bot đang chạy 24/7!'));

// Cấu hình lắng nghe trên 0.0.0.0 để Koyeb có thể truy cập Health Check
app.listen(port, '0.0.0.0', () => {
    console.log('==============================================');
    console.log(`✅ WEB SERVER ĐÃ SẴN SÀNG TẠI CỔNG: ${port}`);
    console.log('==============================================');
});

// --- 🛡️ HỆ THỐNG CHỐNG SẬP ---
process.on('unhandledRejection', (reason) => console.error('❌ Lỗi chưa xử lý:', reason));
process.on('uncaughtException', (err) => console.error('❌ Lỗi nghiêm trọng:', err));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

// --- ⚙️ CẤU HÌNH ---
const PREFIX = 'ski!';
const OWNER_ID = process.env.OWNER_ID || '914831312295165982';
const DATA_PATH = '/tmp/data.json'; 

let db = { 
    users: {}, 
    whitelist: [], 
    globalNoti: "Chào mừng đến với Skibidi Hub!" 
};

// Khởi tạo database
if (fs.existsSync(DATA_PATH)) {
    try { 
        db = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); 
    } catch (e) { 
        console.log("Khởi tạo db mới."); 
    }
}
const save = () => {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 4));
    } catch (e) {
        console.error("Lỗi lưu file:", e);
    }
};

const getU = (id) => {
    if (!db.users[id]) {
        db.users[id] = {
            bal: 5000, bank: 0, perm: (id === OWNER_ID ? 3 : 0),
            bio: "Member của Skibidi Hub", cover: "https://i.imgur.com/8f8ZpL8.png"
        };
    }
    return db.users[id];
};

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
        const id = args[0] || m.guild.id;
        if (!db.whitelist.includes(id)) db.whitelist.push(id);
        save(); m.reply(`✅ Đã thêm server \`${id}\` vào Whitelist.`);
    },
    noti: async (m, args) => {
        if (getU(m.author.id).perm < 2) return m.reply("❌ Cần quyền Co-Owner!");
        const channel = m.mentions.channels.first();
        const content = args.slice(1).join(' ');
        if (!channel || !content) return m.reply("❌ Cú pháp: `ski!noti #kênh <nội dung>`");
        db.globalNoti = content; save();
        const emb = new EmbedBuilder().setTitle('📢 THÔNG BÁO').setDescription(`${content}\n\n👉 *Xem chi tiết trong Bio (\`ski!profile\`)*`).setColor('#FF0000');
        channel.send({ content: "@everyone", embeds: [emb] }).catch(() => m.reply("❌ Bot thiếu quyền gửi tin vào kênh đó!"));
        m.reply("✅ Đã gửi thông báo.");
    },
    co: async (m) => {
        if (m.author.id !== OWNER_ID) return;
        const target = m.mentions.users.first();
        if (target) { getU(target.id).perm = 2; save(); m.reply(`👑 **${target.username}** -> Co-Owner.`); }
    },
    ad: async (m) => {
        if (getU(m.author.id).perm < 2) return;
        const target = m.mentions.users.first();
        if (target) { getU(target.id).perm = 1; save(); m.reply(`🛡️ **${target.username}** -> Admin.`); }
    },
    resetall: async (m) => {
        if (m.author.id !== OWNER_ID) return;
        db.users = {}; save(); m.reply("🚨 Đã Reset toàn bộ dữ liệu người dùng!");
    },
    setcover: async (m, args) => {
        if (getU(m.author.id).perm < 2) return;
        const target = m.mentions.users.first();
        const url = args[1];
        if (target && url) { getU(target.id).cover = url; save(); m.reply("🖼️ Đã đổi ảnh bìa."); }
    },

    // 💰 KINH TẾ & BIO
    profile: async (m) => {
        const target = m.mentions.users.first() || m.author;
        const u = getU(target.id);
        const ranks = ["Thành viên", "Quản Trị Viên", "Đồng Sở Hữu", "Chủ Sở Hữu"];
        const embed = new EmbedBuilder()
            .setTitle(`Hồ sơ: ${target.username}`).setColor('#00FBFF')
            .setImage(u.cover).setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '🛡️ Cấp bậc', value: ranks[u.perm], inline: true },
                { name: '💰 Ví tiền', value: `${u.bal.toLocaleString()} $SKI`, inline: true },
                { name: '📢 THÔNG BÁO MỚI', value: `\`\`\`${db.globalNoti}\`\`\`` },
                { name: '📝 Tiểu sử', value: u.bio }
            );
        m.reply({ embeds: [embed] });
    },
    mine: async (m) => {
        let u = getU(m.author.id);
        let find = Math.floor(Math.random() * 500) + 100;
        u.bal += find; save(); m.reply(`⛏️ Bạn nhận được **${find} $SKI**!`);
    },
    daily: async (m) => {
        let u = getU(m.author.id);
        u.bal += 5000; save(); m.reply("🎁 Nhận **5,000 $SKI** quà điểm danh!");
    },
    cash: async (m) => {
        m.reply(`💰 Bạn đang có **${getU(m.author.id).bal.toLocaleString()} $SKI**.`);
    },

    // 📖 HELP & LIST
    help: async (m) => {
        const embedMain = new EmbedBuilder().setTitle('📖 HELP MENU').setDescription('Chọn mục bằng nút bấm bên dưới.').setColor('#00FBFF');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('h_admin').setLabel('👑 Quản Trị').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('h_eco').setLabel('💰 Kinh Tế').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('h_game').setLabel('🎮 60+ Games').setStyle(ButtonStyle.Primary)
        );
        const msg = await m.reply({ embeds: [embedMain], components: [row] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
        collector.on('collect', async i => {
            if (i.user.id !== m.author.id) return i.reply({ content: 'Không dành cho bạn!', ephemeral: true });
            let desc = i.customId === 'h_admin' ? "`addserver`, `noti`, `co`, `ad`, `resetall`, `setcover`" : 
                       i.customId === 'h_eco' ? "`profile`, `mine`, `cash`, `daily`" : "Gõ `ski!listgames` để xem 60 trò chơi vận động!";
            await i.update({ embeds: [new EmbedBuilder().setTitle('CHI TIẾT LỆNH').setDescription(desc).setColor('#00FBFF')] });
        });
    },
    listgames: async (m) => {
        m.reply(`🎮 **60 TRÒ CHƠI LÀNH MẠNH:**\n\`${gameList.join(', ')}\``);
    }
};

// --- 🔥 AUTO GAME ENGINE ---
gameList.forEach(game => {
    commands[game] = async (m, args) => {
        let u = getU(m.author.id);
        let bet = parseInt(args[0]) || 500;
        if (u.bal < bet) return m.reply("❌ Bạn không đủ $SKI để tham gia!");
        let win = Math.random() < 0.5;
        u.bal += win ? bet : -bet; save();
        m.reply(win ? `🏆 [${game.toUpperCase()}] Thắng! Bạn nhận được **+${bet} $SKI**` : `💪 [${game.toUpperCase()}] Thua! Bạn mất **-${bet} $SKI** năng lượng.`);
    };
});

// --- 🚀 KHỞI CHẠY ---
client.on('messageCreate', async (m) => {
    try {
        if (m.author.bot || !m.guild) return;
        if (!m.content.startsWith(PREFIX)) return;
        const args = m.content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = args.shift().toLowerCase();
        if (commands[cmd]) await commands[cmd](m, args);
    } catch (e) { console.error("Lỗi tin nhắn:", e); }
});

client.once('ready', () => {
    console.log('==============================================');
    console.log(`✅ DISCORD BOT ONLINE AS: ${client.user.tag}`);
    console.log('==============================================');
    client.user.setActivity('ski!help | Skibidi Hub', { type: ActivityType.Watching });
});

// Kiểm tra Token trước khi login
if (!process.env.TOKEN) {
    console.error("❌ LỖI: Chưa có biến TOKEN trong Environment Variables của Koyeb!");
} else {
    client.login(process.env.TOKEN);
}
