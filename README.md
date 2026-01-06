# Skibidi Bot — Repo scaffold (Railway-ready)

Mục tiêu:
- Deploy bot lên Railway (Dockerfile đảm bảo ffmpeg cho music)
- Sử dụng Postgres để lưu data (đảm bảo không mất khi redeploy)
- Dashboard giao tiếp qua internal REST API (protected by BOT_DASHBOARD_TOKEN)

Các file quan trọng:
- Dockerfile — base image + ffmpeg
- package.json — dependencies
- db.js — Postgres JSONB helper
- discord-bot-server.js — bot + express API

Environment variables cần cấu hình trên Railway:
- TOKEN (Discord bot token) — bắt buộc
- CLIENT_ID (Discord app client id) — optional cho slash commands
- OWNER_ID — optional
- BOT_DASHBOARD_TOKEN — shared secret cho dashboard (bắt buộc nếu bạn xài dashboard)
- DATABASE_URL — URL Postgres do Railway cung cấp (recommended)
- PGSSLMODE=require — nếu Railway Postgres yêu cầu SSL
- OPENAI_API_KEY — nếu dùng OpenAI
- PORT — optional (platform thường inject)
- SESSION_SECRET, DISCORD_CLIENT_SECRET, DISCORD_CALLBACK_URL — nếu bạn triển khai dashboard OAuth

Railway step-by-step (quick):
1. Tạo repo trên GitHub và đẩy các file ở repo này lên branch chính.
2. Đăng nhập vào Railway (https://railway.app) → New Project → Deploy from GitHub → chọn repo.
3. Railway sẽ build dựa trên Dockerfile.
4. (Recommended) Add Postgres plugin: Plugins → PostgreSQL → Railway sẽ tạo DATABASE_URL.
5. Project → Variables: set TOKEN, BOT_DASHBOARD_TOKEN, DATABASE_URL (Railway may auto-inject), PGSSLMODE=require.
6. Deploy → xem logs → bot online.
7. Invite bot to your server via Developer Portal invite (scopes bot + applications.commands). Ensure intents enabled.

Notes:
- Nếu không sử dụng DATABASE_URL, bot fallback sử dụng data.json (ephemeral).
- Nếu deploy không dùng Dockerfile, ffmpeg có thể không có -> music lỗi.
- Không commit TOKEN/SECRETS công khai.
