# Sử dụng Node.js bản 20
FROM node:20-slim

# Tạo thư mục làm việc
WORKDIR /app

# Chỉ copy package.json để cài đặt trước (tối ưu build)
COPY package*.json ./

# Cài đặt thư viện
RUN npm install

# Copy toàn bộ code còn lại
COPY . .

# Mở cổng 8000 (khớp với code của bạn)
EXPOSE 8000

# Lệnh khởi chạy
CMD ["node", "index.js"]
