/**
 * SKIBIDI BOT V14.0 - THE LAZY KING EDITION
 * 100% Copy-Paste | Nút bấm Help | Thông báo Bio | 60 Games
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActivityType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType 
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

// --- CẤU HÌNH CỐ ĐỊNH ---
const PREFIX = 'ski!';
const OWNER_ID = '914831312295165982'; // ID CỦA BẠN
const DATA_PATH = './data.json';

// --- QUẢN LÝ DỮ LIỆU ---
let db = { 
    users: {}, 
    whitelist: [], 
    globalNoti: "Chưa có thông báo mới từ Admin." 
};

if (fs.existsSync(DATA_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch (e) { console.log("Khởi tạo database mới."); }
}
const save = () => fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 4));

const getU = (id) => {
    if (!db.users[id]) {
        db.users[id] = {
            bal: 5000, bank: 0, perm: (id === OWNER_ID ? 3 : 0),
            bio: "Chưa thiết lập tiểu sử.", cover: "https://i.imgur.com/8f8ZpL8.png",
            inv: { stone: 0, fish: 0 }
        };
    }
    return db.users[id];
};

// --- DANH SÁCH 60 TRÒ CHƠI ---
const gameList = [
    'taixiu', 'baucua', 'slots', 'flip', 'dice', 'xocdia', 'loto', 'xoso', 'chanle', 'dubong',
    'duangua', 'banca', 'baucuatomca', 'keoco', 'vongquay', 'MAYMAN', 'noihu', 'chiende', 'daovang', 'pk',
    'bansung', 'nemda', 'oantuti', 'nguaphi', 'thachdau', 'solo', 'vethu', 'nhayxa', 'duaxe', 'dabong',
    'caulong', 'bongro', 'tennis', 'golf', 'bida', 'bowling', 'boxing', 'ufo', 'daochu', 'cuopbien',
    'ninja', 'samurai', 'poker', 'blackjack', 'roulette', 'keno', 'bingo', 'thantai', 'typhu', 've_so'
];

// --- HỆ THỐNG LỆNH ---
const commands = {
    // 👑 QUẢN TRỊ (OWNER/CO/ADMIN)
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
        
        db.globalNoti = content;
        save();

        const notiEmbed = new EmbedBuilder()
            .setTitle('📢 THÔNG BÁO TỪ SKIBIDI HUB')
            .setDescription(`${content}\n\n👉 *Dùng \`ski!profile\` để xem cập nhật trong Bio!*`)
            .setColor('#FF0000').setTimestamp();
        
        channel.send({ content: "@everyone", embeds: [notiEmbed] });
        m.reply("✅ Đã phát thông báo!");
    },

    resetall: async (m) => {
        if (m.author.id !== OWNER_ID) return;
        db.users = {}; save(); m.reply("🚨 TOÀN BỘ DỮ LIỆU ĐÃ VỀ 0!");
    },

    co: async (m) => {
        if (m.author.id !== OWNER_ID) return;
        const target = m.mentions.users.first();
        if (target) { getU(target.id).perm = 2; save(); m.reply(`👑 **${target.username}** đã lên Co-Owner!`); }
    },

    ad: async (m) => {
        if (getU(m.author.id).perm < 2) return;
        const target = m.mentions.users.first();
        if (target) { getU(target.id).perm = 1; save(); m.reply(`🛡️ **${target.username}** đã lên Admin!`); }
    },

    setcover: async (m, args) => {
        if (getU(m.author.id).perm < 3) return;
        const target = m.mentions.users.first();
        const url = args[1];
        if (target && url) { getU(target.id).cover = url; save(); m.reply(`🖼️ Đã đổi ảnh bìa cho ${target.username}`); }
    },

    // 💰 KINH TẾ & BIO
    profile: async (m) => {
        const target = m.mentions.users.first() || m.author;
        const u = getU(target.id);
        const ranks = ["Thành viên", "Admin", "Co-Owner", "Chủ sở hữu"];
        const embed = new EmbedBuilder()
            .setTitle(`Hồ sơ: ${target.username}`)
            .setImage(u.cover).setThumbnail(target.displayAvatarURL()).setColor('#00FBFF')
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
        u.bal += find; save(); m.reply(`⛏️ Bạn đào được **${find} $SKI**!`);
    },

    // 📖 HELP NÚT BẤM (BUTTONS)
    help: async (m) => {
        const embed = new EmbedBuilder()
            .setTitle('📖 TRUNG TÂM HỖ TRỢ')
            .setDescription('Bấm các nút bên dưới để xem lệnh từng mục.')
            .setColor('#00FBFF');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('h_admin').setLabel('👑 Quản Trị').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('h_eco').setLabel('💰 Kinh Tế').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('h_game').setLabel('🎲 60+ Trò Chơi').setStyle(ButtonStyle.Primary)
        );

        const msg = await m.reply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== m.author.id) return i.reply({ content: 'Không phải của bạn!', ephemeral: true });
            let desc = "";
            if (i.customId === 'h_admin') desc = "Các lệnh: `addserver`, `noti`, `resetall`, `co`, `ad`, `setcover`, `listbqt`";
            if (i.customId === 'h_eco') desc = "Các lệnh: `profile`, `mine`, `fish`, `daily`, `cash`";
            if (i.customId === 'h_game') desc = "Gõ `ski!listgames` để xem đủ 60 trò chơi cờ bạc!";
            
            await i.update({ embeds: [new EmbedBuilder().setTitle('CHI TIẾT LỆNH').setDescription(desc).setColor('#00FBFF')] });
        });
    },

    listgames: async (m) => {
        m.reply(`🎮 **60 GAMES:**\n\`${gameList.join(', ')}\``);
    }
};

// --- TỰ ĐỘNG TẠO 60 GAMES ---
gameList.forEach(game => {
    commands[game] = async (m, args) => {
        let u = getU(m.author.id);
        let bet = parseInt(args[0]) || parseInt(args[1]);
        if (isNaN(bet) || bet < 100) return m.reply(`❌ Cú pháp: \`ski!${game} <tiền>\``);
        if (u.bal < bet) return m.reply("❌ Bạn không đủ tiền cược!");
        let win = Math.random() < 0.45;
        if (win) { u.bal += bet; m.reply(`🎰 [${game.toUpperCase()}] THẮNG! +${bet.toLocaleString()} $SKI`); }
        else { u.bal -= bet; m.reply(`💔 [${game.toUpperCase()}] THUA! -${bet.toLocaleString()} $SKI`); }
        save();
    };
});

// --- VẬN HÀNH ---
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.guild) return;
    if (!db.whitelist.includes(m.guild.id) && m.author.id !== OWNER_ID) return m.guild.leave();
    if (!m.content.startsWith(PREFIX)) return;
    const args = m.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    if (commands[cmd]) { try { await commands[cmd](m, args); } catch (e) { console.error(e); } }
});

client.once('ready', () => {
    console.log(`✅ SKIBIDI V2 READY!`);
    client.user.setActivity('ski!help | Skibidi Hub', { type: ActivityType.Watching });
});
client.login(process.env.TOKEN);
