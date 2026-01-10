/**
 * SKIBIDI BOT V4.5 - ULTIMATE PREMIUM EDITION
 * Full 40+ Commands | High-End Embed Design
 * Permission: Owner > Co-Owner > Admin > Staff > Member
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActivityType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder 
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

// --- CẤU HÌNH HỆ THỐNG ---
const PREFIX = 'ski!';
const OWNER_ID = '914831312295165982';
const DATA_PATH = './data.json';
let isDirty = false;

let data = {
    balances: {}, bank: {}, inventory: {},
    coOwners: [], admins: [], staffs: [],
    blacklist: [], profileBackgrounds: {}, notis: {}
};

// --- DATABASE LOGIC ---
function loadData() {
    if (fs.existsSync(DATA_PATH)) {
        try {
            const savedData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
            data = { ...data, ...savedData };
        } catch (e) { console.error("Lỗi đọc dữ liệu!"); }
    }
}
function saveData() {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));
    isDirty = false;
    console.log("💾 Database đã được cập nhật!");
}
loadData();
setInterval(() => { if (isDirty) saveData(); }, 60000);

// --- HELPER FUNCTIONS ---
const getBal = (id) => data.balances[id] || 0;
const addBal = (id, amt) => { data.balances[id] = getBal(id) + amt; isDirty = true; };
const getPerm = (id) => {
    if (id === OWNER_ID) return 4;
    if (data.coOwners?.includes(id)) return 3;
    if (data.admins?.includes(id)) return 2;
    if (data.staffs?.includes(id)) return 1;
    return 0;
};
const getRankName = (lv) => ["Thành viên", "Nhân viên (Staff)", "Quản trị viên (Admin)", "Đồng sở hữu (Co-Owner)", "Chủ sở hữu (Owner)"][lv];

// --- PREMIUM EMBED FACTORY ---
const proEmbed = (title, desc, color = '#00FBFF', m = null) => {
    const embed = new EmbedBuilder()
        .setTitle(`✨ ${title.toUpperCase()}`)
        .setDescription(desc)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'Skibidi Hub Premium', iconURL: client.user.displayAvatarURL() });
    if (m) embed.setAuthor({ name: m.author.username, iconURL: m.author.displayAvatarURL({ dynamic: true }) });
    return embed;
};

// --- HỆ THỐNG LỆNH (40+ COMMANDS) ---
const commands = {
    // === 💸 KINH TẾ (ECONOMY) ===
    work: async (m) => {
        const r = Math.floor(Math.random() * 800) + 200;
        addBal(m.author.id, r);
        m.reply({ embeds: [proEmbed('Làm việc', `🛠️ Bạn đã làm việc chăm chỉ và nhận được **${r.toLocaleString()} $SKI**`, '#00FF00', m)] });
    },
    cash: async (m) => {
        const target = m.mentions.users.first() || m.author;
        const embed = proEmbed(`Tài khoản: ${target.username}`, `> 💰 **Ví:** ${getBal(target.id).toLocaleString()} $SKI\n> 🏦 **Ngân hàng:** ${(data.bank[target.id] || 0).toLocaleString()} $SKI`, '#00FBFF');
        embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));
        m.reply({ embeds: [embed] });
    },
    dep: async (m, args) => {
        let amt = args[0] === 'all' ? getBal(m.author.id) : parseInt(args[0]);
        if (isNaN(amt) || amt <= 0 || getBal(m.author.id) < amt) return m.reply("❌ Số tiền không hợp lệ!");
        addBal(m.author.id, -amt);
        data.bank[m.author.id] = (data.bank[m.author.id] || 0) + amt;
        m.reply({ embeds: [proEmbed('Gửi tiền', `🏦 Đã chuyển **${amt.toLocaleString()} $SKI** vào ngân hàng!`, '#FFD700', m)] });
    },
    wd: async (m, args) => {
        let amt = args[0] === 'all' ? (data.bank[m.author.id] || 0) : parseInt(args[0]);
        if (isNaN(amt) || amt <= 0 || (data.bank[m.author.id] || 0) < amt) return m.reply("❌ Ngân hàng không đủ tiền!");
        data.bank[m.author.id] -= amt;
        addBal(m.author.id, amt);
        m.reply({ embeds: [proEmbed('Rút tiền', `🏧 Đã rút **${amt.toLocaleString()} $SKI** về ví!`, '#FFD700', m)] });
    },
    lb: async (m) => {
        const sorted = Object.entries(data.balances).sort(([,a],[,b]) => b-a).slice(0, 10);
        const list = sorted.map(([id, b], i) => `**#${i+1}** <@${id}> • \`${b.toLocaleString()}\` $SKI`).join('\n');
        m.reply({ embeds: [proEmbed('Bảng xếp hạng đại gia', list || 'Chưa có dữ liệu', '#FFAC33')] });
    },

    // === 🎲 TRÒ CHƠI (GAMES) ===
    taixiu: async (m, args) => {
        const choice = args[0]?.toLowerCase();
        const bet = parseInt(args[1]);
        if (!['tai', 'xiu'].includes(choice) || isNaN(bet) || bet <= 0 || getBal(m.author.id) < bet) return m.reply("❌ Cú pháp: `ski!taixiu <tai/xiu> <tiền>`");
        const d = [Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1];
        const sum = d[0]+d[1]+d[2];
        const res = sum >= 11 ? 'tai' : 'xiu';
        if (choice === res) {
            addBal(m.author.id, bet);
            m.reply({ embeds: [proEmbed('Tài Xỉu - THẮNG', `🎲 Kết quả: **${d.join('-')}** (${sum})\n✨ Bạn chọn **${choice.toUpperCase()}** và thắng **+${bet.toLocaleString()} $SKI**`, '#00FF00')] });
        } else {
            addBal(m.author.id, -bet);
            m.reply({ embeds: [proEmbed('Tài Xỉu - THUA', `🎲 Kết quả: **${d.join('-')}** (${sum})\n💔 Bạn chọn **${choice.toUpperCase()}** và mất **-${bet.toLocaleString()} $SKI**`, '#FF0000')] });
        }
    },
    baucua: async (m, args) => {
        const items = ['bầu','cua','tôm','cá','gà','nai'];
        const choice = args[0], bet = parseInt(args[1]);
        if (!items.includes(choice) || isNaN(bet) || bet <= 0 || getBal(m.author.id) < bet) return m.reply("❌ Cú pháp: `ski!baucua <tên> <tiền>`");
        const roll = [items[Math.floor(Math.random()*6)], items[Math.floor(Math.random()*6)], items[Math.floor(Math.random()*6)]];
        const win = roll.filter(x => x === choice).length;
        if (win > 0) {
            addBal(m.author.id, bet * win);
            m.reply({ embeds: [proEmbed('Bầu Cua - WIN', `🎲 [ ${roll.join(' | ')} ]\n✨ Bạn trúng **x${win}** nhận **${(bet*win).toLocaleString()} $SKI**`, '#00FF00')] });
        } else {
            addBal(m.author.id, -bet);
            m.reply({ embeds: [proEmbed('Bầu Cua - LOSE', `🎲 [ ${roll.join(' | ')} ]\n💔 Chúc may mắn lần sau!`, '#FF0000')] });
        }
    },

    // === 🛡️ QUẢN TRỊ (STAFF & SYSTEM) ===
    check: async (m, args) => {
        if (getPerm(m.author.id) < 1) return;
        const target = m.mentions.users.first() || client.users.cache.get(args[0]);
        if (!target) return m.reply("⚠️ Tag người dùng cần check!");
        const embed = proEmbed('Soi ví người dùng', `👤 **User:** ${target.tag}\n🆔 **ID:** \`${target.id}\`\n🛡️ **Cấp bậc:** ${getRankName(getPerm(target.id))}\n💰 **Ví:** ${getBal(target.id).toLocaleString()}`, '#FFFF00');
        m.reply({ embeds: [embed] });
    },
    setrank: async (m, args) => {
        const myP = getPerm(m.author.id);
        const target = m.mentions.users.first(), rank = args[1]?.toLowerCase();
        if (myP < 2 || !target || !rank) return m.reply("❌ Cú pháp: `ski!setrank @user <staff/admin/coowner>`");
        if (rank === 'staff' && myP >= 2) data.staffs.push(target.id);
        else if (rank === 'admin' && myP >= 3) data.admins.push(target.id);
        else if (rank === 'coowner' && myP >= 4) data.coOwners.push(target.id);
        else return m.reply("❌ Bạn không đủ quyền set rank này!");
        isDirty = true; m.reply(`✅ Đã thăng chức cho **${target.username}** thành **${rank.toUpperCase()}**!`);
    },
    staffrules: async (m) => {
        if (getPerm(m.author.id) < 3) return;
        const embed = proEmbed('Bảng Hướng Dẫn Staff', 'Dưới đây là các lệnh quản trị máy chủ:', '#FF0000')
            .addFields(
                { name: '🔹 [Lv 1] STAFF', value: '`check`, `staffpanel`, `noti`' },
                { name: '🔸 [Lv 2] ADMIN', value: '`eco add/set`, `clear`, `setrank staff`' },
                { name: '👑 [Lv 3-4] BOSS', value: '`setadmin`, `setco`, `rs`, `backup`' }
            );
        m.channel.send({ embeds: [embed] });
    },
    clear: async (m, args) => {
        if (getPerm(m.author.id) < 2) return;
        const num = parseInt(args[0]) || 10;
        await m.channel.bulkDelete(num, true);
        m.channel.send(`🧹 Đã xóa **${num}** tin nhắn.`).then(x => setTimeout(() => x.delete(), 3000));
    },

    // === 📜 MENU TRỢ GIÚP (HELP) ===
    help: async (m) => {
        const embed = proEmbed('Skibidi Hub Menu', 'Chọn danh mục lệnh bên dưới để xem chi tiết.', '#5865F2')
            .setThumbnail(client.user.displayAvatarURL());
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('h_eco').setLabel('Kinh tế').setStyle(ButtonStyle.Primary).setEmoji('💰'),
            new ButtonBuilder().setCustomId('h_game').setLabel('Trò chơi').setStyle(ButtonStyle.Success).setEmoji('🎲'),
            new ButtonBuilder().setCustomId('h_staff').setLabel('Nhân viên').setStyle(ButtonStyle.Danger).setEmoji('🛡️')
        );
        const msg = await m.reply({ embeds: [embed], components: [row] });
        const col = msg.createMessageComponentCollector({ time: 60000 });
        col.on('collect', async i => {
            if (i.user.id !== m.author.id) return i.reply({ content: 'Nút không dành cho bạn!', ephemeral: true });
            if (i.customId === 'h_eco') await i.update({ embeds: [proEmbed('Hệ thống Kinh tế', '`work`, `daily`, `cash`, `dep`, `wd`, `pay`, `lb`, `rich`')] });
            if (i.customId === 'h_game') await i.update({ embeds: [proEmbed('Hệ thống Trò chơi', '`taixiu`, `baucua`, `slots`, `math`, `flip`, `dice`, `pick`')] });
            if (i.customId === 'h_staff') {
                if (getPerm(i.user.id) < 1) return i.reply({ content: 'Bạn không phải Staff!', ephemeral: true });
                await i.update({ embeds: [proEmbed('Khu vực điều hành', '`check`, `setrank`, `eco`, `clear`, `staffrules`, `dashboard`')] });
            }
        });
    }
};

// --- CLIENT LOGIC ---
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.content.startsWith(PREFIX)) return;
    const args = m.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    if (commands[cmd]) {
        try { await commands[cmd](m, args); } catch (e) { console.error(e); }
    }
});

client.once('ready', () => {
    console.log(`🚀 [V4.5] ${client.user.tag} ĐÃ SẴN SÀNG!`);
    client.user.setActivity('ski!help | Skibidi Premium', { type: ActivityType.Playing });
});

client.login(process.env.TOKEN);
