const fs = require('fs');
const path = './data.json';

module.exports = {
    // Hàm tải dữ liệu từ file
    loadData: (key) => {
        if (!fs.existsSync(path)) {
            // Nếu chưa có file, tạo file mới với cấu trúc rỗng
            fs.writeFileSync(path, JSON.stringify({ global: {} }, null, 4));
            return null;
        }
        try {
            const raw = fs.readFileSync(path);
            const data = JSON.parse(raw);
            return data[key] || null;
        } catch (e) {
            console.error("❌ Lỗi đọc file DB:", e);
            return null;
        }
    },

    // Hàm lưu dữ liệu vào file
    saveData: async (data, key) => {
        try {
            let currentData = {};
            if (fs.existsSync(path)) {
                currentData = JSON.parse(fs.readFileSync(path));
            }
            currentData[key] = data;
            fs.writeFileSync(path, JSON.stringify(currentData, null, 4));
            console.log("💾 Dữ liệu Skibidi Hub đã được sao lưu an toàn.");
            return true;
        } catch (e) {
            console.error("❌ Lỗi ghi file DB:", e);
            return false;
        }
    }
};
