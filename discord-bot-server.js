/**
 * SKIBIDI BOT - BOT DÀNH CHO SERVER SKIBIDI HUB
 * Developed by: ski_shimano
 * Full Suite: Economy, Roles, Anti-Guild, Advanced Profile System
 */

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '?';
const OWNER_ID = '914831312295165982'; // ID của ski_shimano

let isDirty = false;
let data = {
    balances: {}, levels: {}, inventory: {}, 
    marriages: {}, blacklist: [], 
    coOwners: [], admins: [], 
    allowedGuilds: ['ID_SERVER_CHÍNH_CỦA_BẠN'], 
    crypto: {}, mining: {}, cooldowns: {}
};

// --- UTILS ---
const getRank = (id) => {
    if (id === OWNER_ID) return { name: '👑 Tối Thượng (Owner)', color: '#ff0000' };
    if (data.coOwners.includes(id)) return { name: '🥈 Điều Hành (Co-Owner)', color: '#ff9f43' };
    if (data.admins.includes(id)) return { name: '🛡️ Quản Trị Viên (Admin)', color: '#54a0ff' };
    return { name: '👤 Thành Viên', color: '#718093' };
};

const isOwner = (id) => id === OWNER_ID;
const isCoOwner = (id) => isOwner(id) || data.coOwners.includes(id);

// --- WEB SERVER ---
const app = express();
app.get('/', (req, res) => res.send('✅ Skibidi Hub Bot is Active! | dev: ski_shimano'));
app.listen(process.env.PORT || 10000);

// --- COMMANDS ---
const commands = {
    help: (message) => {
        const embed = new EmbedBuilder()
            .setColor('#5865F2').setTitle('🛠️ SKIBIDI HUB - CONTROL PANEL')
            .addFields(
                { name: '👤 Cá nhân', value: '`profile`, `rank`, `inv`', inline: true },
                { name: '💰 Kinh tế', value: '`mine`, `coin`, `bal`, `daily`', inline: true },
                { name: '👑 Quản trị', value: '`setco`, `setadmin`, `addmoney`, `blacklist`', inline: false }
            ).setFooter({ text: 'Bot dành cho Server Skibidi Hub | by ski_shimano' });
        message.reply({ embeds: [embed] });
    },

    profile: async (message, args) => {
        let target;
        // Kiểm tra quyền xem profile người khác
        if (isCoOwner(message.author.id)) {
            target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
        } else {
            target = message.author;
            if (message.mentions.users.first() && message.mentions.users.first().id !== message.author.id) {
                return message.reply('❌ Bạn không có quyền xem Profile của người khác!');
            }
        }

        if (!target) return message.reply('❌ Không tìm thấy người dùng này.');

        const rank = getRank(target.id);
        const bal = (data.balances[target.id] || 0).toLocaleString();
        const crypto = (data.crypto[target.id] || 0).toLocaleString();
        const lvl = data.levels[target.id]?.level || 0;
        const partner = data.marriages[target.id] ? `<@${data.marriages[target.id]}>` : 'Độc thân';

        const embed = new EmbedBuilder()
            .setColor(rank.color)
            .setTitle(`📇 PROFILE: ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🎖️ Chức vụ', value: `**${rank.name}**`, inline: false },
                { name: '📊 Cấp độ', value: `Level \`${lvl}\``, inline: true },
                { name: '❤️ Bạn đời', value: partner, inline: true },
                { name: '💵 Tiền mặt', value: `\`${bal}\` 💰`, inline: true },
                { name: '📈 Crypto', value: `\`${crypto}\` $SKIB`, inline: true },
                { name: '🎒 Vật phẩm', value: `\`${(data.inventory[target.id] || []).length}\` món`, inline: true }
            )
            .setFooter({ text: `ID: ${target.id} | Skibidi Hub System` })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    setco: (message, args) => {
        if (!isOwner(message.author.id)) return message.reply('❌ Quyền tối cao của Owner!');
        const target = message.mentions.users.first() || { id: args[0] };
        if (!target.id) return message.reply('❌ Thiếu đối tượng.');
        if (data.coOwners.includes(target.id)) {
            data.coOwners = data.coOwners.filter(id => id !== target.id);
            message.reply(`✅ Đã hạ quyền Co-Owner của <@${target.id}>.`);
        } else {
            data.coOwners.push(target.id);
            message.reply(`⭐ <@${target.id}> đã trở thành **Co-Owner**!`);
        }
        isDirty = true;
    },

    setadmin: (message, args) => {
        if (!isCoOwner(message.author.id)) return message.reply('❌ Bạn không có quyền!');
        const target = message.mentions.users.first() || { id: args[0] };
        if (!target.id) return message.reply('❌ Thiếu đối tượng.');
        if (data.admins.includes(target.id)) {
            data.admins = data.admins.filter(id => id !== target.id);
            message.reply(`✅ Đã hạ quyền Admin của <@${target.id}>.`);
        } else {
            data.admins.push(target.id);
            message.reply(`🛡️ <@${target.id}> đã trở thành **Admin**!`);
        }
        isDirty = true;
    },

    credit: (message) => {
        message.reply('🌟 **Skibidi Bot - Bot dành cho Server Skibidi Hub**\nPhát triển bởi: **ski_shimano**');
    }
};

// --- EVENTS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || (data.blacklist || []).includes(message.author.id)) return;

    // Bảo mật Whitelist Server
    if (!data.allowedGuilds.includes(message.guild.id) && !isOwner(message.author.id)) {
        return message.guild.leave();
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    if (commands[cmd]) await commands[cmd](message, args).catch(console.error);
});

client.once('ready', () => {
    console.log(`🚀 Skibidi Hub Online | Owner: ski_shimano`);
    client.user.setActivity('Skibidi Hub | ?profile', { type: ActivityType.Watching });
});

client.login(process.env.TOKEN);
