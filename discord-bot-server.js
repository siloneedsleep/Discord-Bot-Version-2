/**
 * SKIBIDI BOT - BOT DÀNH CHO SERVER SKIBIDI HUB
 * Developed by: ski_shimano
 * Full Suite: Economy, Roles (Owner/Co-Owner/Admin), Anti-Guild, Crypto, Mining, Advanced Profile
 * Version: 4.0 - Supreme Edition
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActivityType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField 
} = require('discord.js');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// --- CẤU HÌNH HỆ THỐNG ---
const PREFIX = '?';
const OWNER_ID = '914831312295165982'; // ski_shimano
let isDirty = false;
let cryptoPrice = 100;

let data = {
    balances: {}, 
    levels: {}, 
    inventory: {}, 
    marriages: {}, 
    blacklist: [], 
    coOwners: [], 
    admins: [], 
    allowedGuilds: [1410645959813107866], 
    crypto: {}, 
    mining: { pickaxe: {} }, 
    cooldowns: {},
    logs: {}
};

// --- HỆ THỐNG CRYPTO BIẾN ĐỘNG ---
setInterval(() => {
    const change = Math.random() > 0.5 ? 1.05 : 0.95; // Biến động 5%
    cryptoPrice = Math.max(10, Math.floor(cryptoPrice * change));
}, 600000); // 10 phút cập nhật 1 lần

// --- WEB SERVER (GIỮ BOT ONLINE 24/7) ---
const app = express();
app.get('/', (req, res) => {
    res.send(`
        <body style="background-color: #2c3e50; color: white; font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>🚀 SKIBIDI HUB BOT IS ONLINE</h1>
            <p>Developed by: <b>ski_shimano</b></p>
            <p>Status: Operating Normally</p>
        </body>
    `);
});
app.listen(process.env.PORT || 10000);

// --- HÀM KIỂM TRA QUYỀN HẠN ---
const checkPermission = (id) => {
    if (id === OWNER_ID) return 3; // Owner
    if (data.coOwners.includes(id)) return 2; // Co-Owner
    if (data.admins.includes(id)) return 1; // Admin
    return 0; // Member
};

const getRankDetails = (id) => {
    const level = checkPermission(id);
    switch(level) {
        case 3: return { name: '👑 TỐI THƯỢNG (OWNER)', color: '#FF0000', badge: '🥇' };
        case 2: return { name: '🥈 ĐIỀU HÀNH (CO-OWNER)', color: '#FFA500', badge: '🥈' };
        case 1: return { name: '🛡️ QUẢN TRỊ VIÊN (ADMIN)', color: '#00BFFF', badge: '🥉' };
        default: return { name: '👤 THÀNH VIÊN', color: '#BDC3C7', badge: '🔹' };
    }
};

// --- HÀM THÔNG BÁO CHO OWNER (LOGGING) ---
async function logToOwner(title, action, executorId) {
    try {
        const owner = await client.users.fetch(OWNER_ID);
        const embed = new EmbedBuilder()
            .setTitle(`🛡️ HỆ THỐNG GIÁM SÁT: ${title}`)
            .setDescription(`**Người thực hiện:** <@${executorId}>\n**Hành động:** ${action}`)
            .setColor('#2F3136')
            .setTimestamp();
        owner.send({ embeds: [embed] });
    } catch (e) { console.error("Không thể gửi log cho Owner"); }
}

// --- XỬ LÝ LỆNH ---
const commands = {
    // 1. LỆNH CÁ NHÂN & THÔNG TIN
    profile: async (message, args) => {
        const perm = checkPermission(message.author.id);
        let targetUser;

        if (perm >= 2 && (message.mentions.users.first() || args[0])) {
            const id = message.mentions.users.first()?.id || args[0];
            targetUser = await client.users.fetch(id).catch(() => null);
        } else {
            targetUser = message.author;
        }

        if (!targetUser) return message.reply('❌ Không tìm thấy người dùng này.');

        const rank = getRankDetails(targetUser.id);
        const balance = (data.balances[targetUser.id] || 0).toLocaleString();
        const coins = (data.crypto[targetUser.id] || 0).toLocaleString();
        const level = data.levels[targetUser.id]?.level || 0;
        const marriage = data.marriages[targetUser.id] ? `<@${data.marriages[targetUser.id]}>` : 'Chưa kết hôn';

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Hồ Sơ Thành Viên: ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
            .setColor(rank.color)
            .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
            .addFields(
                { name: '📋 Thông Tin Chức Danh', value: `${rank.badge} **${rank.name}**`, inline: false },
                { name: '💰 Kinh Tế', value: `💵 Tiền mặt: \`${balance}\` 💰\n📈 Crypto: \`${coins}\` $SKIB`, inline: true },
                { name: '📊 Tiến Trình', value: `⭐ Cấp độ: \`${level}\`\n💍 Bạn đời: ${marriage}`, inline: true },
                { name: '🎒 Kho Đồ', value: `\`${(data.inventory[targetUser.id] || []).length}\` vật phẩm`, inline: false }
            )
            .setFooter({ text: `Yêu cầu bởi: ${message.author.tag} | Skibidi Hub`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    // 2. LỆNH QUẢN TRỊ OWNER
    setco: async (message, args) => {
        if (!checkPermission(message.author.id) === 3) return message.reply('❌ Chỉ Owner tối cao mới có quyền này.');
        const target = message.mentions.users.first() || { id: args[0] };
        if (!target.id) return message.reply('❌ Hãy ping hoặc nhập ID.');

        if (data.coOwners.includes(target.id)) {
            data.coOwners = data.coOwners.filter(id => id !== target.id);
            message.reply(`✅ Đã bãi nhiệm Co-Owner đối với <@${target.id}>.`);
        } else {
            data.coOwners.push(target.id);
            message.reply(`⭐ Đã bổ nhiệm <@${target.id}> làm **Co-Owner** của bot.`);
        }
        isDirty = true;
    },

    addserver: async (message, args) => {
        if (checkPermission(message.author.id) !== 3) return;
        const guildId = args[0];
        if (!guildId) return message.reply('❌ Nhập ID Server.');
        data.allowedGuilds.push(guildId);
        isDirty = true;
        message.reply(`✅ Đã thêm Server \`${guildId}\` vào danh sách cho phép.`);
    },

    // 3. LỆNH QUẢN TRỊ CO-OWNER
    setadmin: async (message, args) => {
        if (checkPermission(message.author.id) < 2) return message.reply('❌ Bạn không đủ quyền hạn (Yêu cầu Co-Owner).');
        const target = message.mentions.users.first() || { id: args[0] };
        if (!target.id) return message.reply('❌ Hãy cung cấp người được bổ nhiệm.');

        if (data.admins.includes(target.id)) {
            data.admins = data.admins.filter(id => id !== target.id);
            message.reply(`✅ Đã hạ quyền Admin của <@${target.id}>.`);
        } else {
            data.admins.push(target.id);
            message.reply(`🛡️ Đã bổ nhiệm <@${target.id}> làm **Admin**.`);
        }
        logToOwner('Bổ Nhiệm Nhân Sự', `<@${message.author.id}> đã thay đổi quyền Admin cho <@${target.id}>`, message.author.id);
        isDirty = true;
    },

    addmoney: async (message, args) => {
        if (checkPermission(message.author.id) < 2) return;
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);
        if (!target || isNaN(amount)) return message.reply('❌ Cú pháp: `?addmoney @user <số tiền>`');
        
        data.balances[target.id] = (data.balances[target.id] || 0) + amount;
        isDirty = true;
        message.reply(`✅ Đã cộng **${amount.toLocaleString()}** 💰 vào tài khoản <@${target.id}>.`);
        logToOwner('Điều Tiết Kinh Tế', `<@${message.author.id}> đã thêm tiền cho <@${target.id}>`, message.author.id);
    },

    eval: async (message, args) => {
        if (message.author.id !== OWNER_ID) return;
        const code = args.join(" ");
        try {
            let evaled = eval(code);
            message.reply(`\`\`\`js\n${require('util').inspect(evaled)}\n\`\`\``);
        } catch (err) { message.reply(`\`ERROR\` \`\`\`xl\n${err}\n\`\`\``); }
    }
};

// --- HỆ THỐNG SỰ KIỆN (EVENTS) ---
client.on('guildCreate', (guild) => {
    if (!data.allowedGuilds.includes(guild.id)) {
        console.log(`⚠️ Phát hiện truy cập trái phép tại server: ${guild.name} (${guild.id})`);
        guild.leave();
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Kiểm tra Whitelist Server
    if (!data.allowedGuilds.includes(message.guild.id) && message.author.id !== OWNER_ID) {
        return message.guild.leave();
    }

    // Kiểm tra Blacklist
    if (data.blacklist.includes(message.author.id)) return;

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (commands[cmd]) {
        try {
            await commands[cmd](message, args);
        } catch (error) {
            console.error(error);
            message.reply('❌ Đã xảy ra lỗi khi thực thi lệnh.');
        }
    }
});

client.once('ready', () => {
    console.log(`
    -------------------------------------------
    🚀 SKIBIDI HUB BOT ĐÃ SẴN SÀNG!
    👤 Developer: ski_shimano
    👑 Owner ID: ${OWNER_ID}
    -------------------------------------------
    `);
    client.user.setActivity('Skibidi Hub | ?help', { type: ActivityType.Watching });
    
    // Auto-leave khi khởi động nếu ở server lạ
    client.guilds.cache.forEach(guild => {
        if (!data.allowedGuilds.includes(guild.id)) guild.leave();
    });
});

client.login(process.env.TOKEN);
