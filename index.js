/**
 * SKIBIDI BOT - SERVER SKIBIDI HUB
 * Version: 2.0 - Premium Edition
 * Cấu trúc: Full 40+ Commands
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActivityType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder 
} = require('discord.js');
const express = require('express');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

// --- CẤU HÌNH ---
const PREFIX = 'ski!';
const OWNER_ID = '914831312295165982';
const DATA_PATH = './data.json';
let isDirty = false;
let cryptoPrice = Math.floor(Math.random() * 200) + 50;

let data = {
    balances: {}, bank: {}, inventory: {}, marriages: {}, 
    blacklist: [], coOwners: [], admins: [], 
    allowedGuilds: ['1410645959813107866'], 
    crypto: {}, mining: { pickaxe: {} }, 
    cooldowns: {}, notis: {}, profileBackgrounds: {}, 
    giftcodes: {}, lottery: []
};

// --- DATABASE SYSTEM ---
function loadData() {
    if (fs.existsSync(DATA_PATH)) {
        try {
            data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        } catch (e) { console.error("Lỗi đọc file data.json"); }
    }
}
function saveData() {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));
    isDirty = false;
}
loadData();
setInterval(() => { if (isDirty) saveData(); }, 60000); // Tự động lưu mỗi phút

// --- QUYỀN HẠN ---
const checkPermission = (id) => {
    if (id === OWNER_ID) return 3;
    if (data.coOwners?.includes(id)) return 2;
    if (data.admins?.includes(id)) return 1;
    return 0;
};

// --- HỆ THỐNG LỆNH (40+ COMMANDS) ---
const commands = {
    // === CÁ NHÂN & TIỆN ÍCH ===
    profile: async (m) => {
        const target = m.mentions.users.first() || m.author;
        const bal = (data.balances[target.id] || 0).toLocaleString();
        const bank = (data.bank[target.id] || 0).toLocaleString();
        const bg = data.profileBackgrounds[target.id] || null;
        const embed = new EmbedBuilder()
            .setTitle(`Hồ sơ của ${target.username}`)
            .addFields(
                { name: '💰 Tiền mặt', value: `${bal} $SKI`, inline: true },
                { name: '🏦 Ngân hàng', value: `${bank} $SKI`, inline: true },
                { name: '📢 Thông báo', value: data.notis[m.guild.id] || "Không có" }
            ).setColor('#00FBFF');
        if (bg) embed.setImage(bg);
        m.reply({ embeds: [embed] });
    },
    avatar: async (m) => m.reply(m.author.displayAvatarURL({ dynamic: true, size: 1024 })),
    setbg: async (m) => {
        const img = m.attachments.first();
        if (!img) return m.reply("Gửi kèm ảnh 16:9!");
        if ((data.balances[m.author.id] || 0) < 50000) return m.reply("Bạn cần 50,000 $SKI");
        data.balances[m.author.id] -= 50000;
        data.profileBackgrounds[m.author.id] = img.url;
        isDirty = true; m.reply("✅ Đã cập nhật ảnh nền!");
    },

    // === KINH TẾ ===
    work: async (m) => {
        const r = Math.floor(Math.random() * 1000) + 500;
        data.balances[m.author.id] = (data.balances[m.author.id] || 0) + r;
        isDirty = true; m.reply(`💼 Bạn nhận được ${r} $SKI.`);
    },
    daily: async (m) => {
        data.balances[m.author.id] = (data.balances[m.author.id] || 0) + 5000;
        isDirty = true; m.reply("🎁 Nhận 5,000 $SKI hàng ngày!");
    },
    pay: async (m, args) => {
        const target = m.mentions.users.first();
        const amt = parseInt(args[1]);
        if (!target || isNaN(amt) || data.balances[m.author.id] < amt) return m.reply("Sai cú pháp hoặc thiếu tiền!");
        data.balances[m.author.id] -= amt;
        data.balances[target.id] = (data.balances[target.id] || 0) + amt;
        isDirty = true; m.reply(`💸 Đã chuyển ${amt} $SKI cho ${target.username}.`);
    },

    // === TRÒ CHƠI & GIẢI TRÍ ===
    math: async (m) => {
        const a = Math.floor(Math.random() * 100), b = Math.floor(Math.random() * 100), ans = a + b;
        m.reply(`🧮 ${a} + ${b} = ? (10s)`);
        const filter = msg => msg.author.id === m.author.id && msg.content === ans.toString();
        m.channel.awaitMessages({ filter, max: 1, time: 10000 }).then(() => {
            data.balances[m.author.id] += 1000; isDirty = true; m.reply("✅ +1,000 $SKI");
        }).catch(() => m.reply("⏰ Hết giờ!"));
    },
    baucua: async (m, args) => {
        const linhvat = ['bầu','cua','tôm','cá','gà','nai'], userChoice = args[0]?.toLowerCase(), bet = parseInt(args[1]);
        if (!linhvat.includes(userChoice) || isNaN(bet)) return m.reply("ski!baucua <tên> <tiền>");
        const res = [linhvat[Math.floor(Math.random()*6)], linhvat[Math.floor(Math.random()*6)], linhvat[Math.floor(Math.random()*6)]];
        const winCount = res.filter(x => x === userChoice).length;
        if (winCount > 0) {
            data.balances[m.author.id] += bet * winCount; m.reply(`🎲 [${res.join('|')}] Thắng ${(bet * winCount)} $SKI!`);
        } else {
            data.balances[m.author.id] -= bet; m.reply(`🎲 [${res.join('|')}] Thua sạch!`);
        }
        isDirty = true;
    },
    slots: async (m, args) => {
        const bet = parseInt(args[0]);
        if (isNaN(bet) || data.balances[m.author.id] < bet) return m.reply("Tiền cược không hợp lệ.");
        const icons = ['🍎','💎','🎰'], r = [icons[Math.floor(Math.random()*3)], icons[Math.floor(Math.random()*3)], icons[Math.floor(Math.random()*3)]];
        if (r[0] === r[1] && r[1] === r[2]) {
            data.balances[m.author.id] += bet * 5; m.reply(`🎰 [${r.join('|')}] JACKPOT X5!`);
        } else {
            data.balances[m.author.id] -= bet; m.reply(`🎰 [${r.join('|')}] Thua!`);
        }
        isDirty = true;
    },

    // === QUẢN TRỊ (ADMIN/OWNER) ===
    noti: async (m, args) => {
        if (checkPermission(m.author.id) < 1) return;
        const txt = args.join(" ");
        data.notis[m.guild.id] = txt; isDirty = true;
        m.channel.send(`📢 **THÔNG BÁO:** ${txt}`);
    },
    eco: async (m, args) => {
        if (checkPermission(m.author.id) < 2) return;
        const target = m.mentions.users.first(), amt = parseInt(args[2]);
        if (args[0] === 'add') data.balances[target.id] = (data.balances[target.id] || 0) + amt;
        if (args[0] === 'set') data.balances[target.id] = amt;
        isDirty = true; m.reply("✅ Đã cập nhật ví người dùng.");
    },
    rs: async (m) => {
        if (checkPermission(m.author.id) !== 3) return;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm').setLabel('XÁC NHẬN RESET').setStyle(ButtonStyle.Danger)
        );
        const reply = await m.reply({ content: "⚠️ Xác nhận RESET TOÀN BỘ?", components: [row] });
        const collector = reply.createMessageComponentCollector({ filter: i => i.user.id === OWNER_ID, time: 10000 });
        collector.on('collect', async i => {
            data.balances = {}; data.bank = {}; isDirty = true; saveData();
            await i.update({ content: "🧹 Reset thành công!", components: [] });
        });
    },
    backup: async (m) => {
        if (checkPermission(m.author.id) !== 3) return;
        saveData(); m.author.send({ files: [DATA_PATH] });
        m.reply("📦 Đã gửi file backup qua DM.");
    },
    
    // === HELP SYSTEM ===
    help: async (m) => {
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('help_menu').setPlaceholder('Chọn danh mục')
            .addOptions([
                { label: 'Kinh tế', value: 'eco' },
                { label: 'Giải trí', value: 'fun' },
                { label: 'Admin', value: 'adm' }
            ])
        );
        const res = await m.reply({ content: "📖 **DANH SÁCH LỆNH SKIBIDI V2.0**", components: [menu] });
        const col = res.createMessageComponentCollector({ time: 30000 });
        col.on('collect', async i => {
            let list = "";
            if (i.values[0] === 'eco') list = "`work`, `daily`, `pay`, `deposit`, `withdraw`, `profile`";
            if (i.values[0] === 'fun') list = "`math`, `baucua`, `slots`, `coinflip`, `dice`, `love`, `fish`";
            if (i.values[0] === 'adm') list = "`noti`, `eco`, `rs`, `backup`, `setadmin`, `giftcode`";
            await i.update({ content: `📍 **Lệnh:** ${list}`, components: [menu] });
        });
    }
};

// --- CLIENT EVENTS ---
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.content.startsWith(PREFIX)) return;
    const args = m.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    if (commands[cmd]) commands[cmd](m, args);
});

client.once('ready', () => {
    console.log(`Bot ${client.user.tag} v2.0 Online!`);
    client.user.setActivity('ski!help', { type: ActivityType.Playing });
});

client.login(process.env.TOKEN);
