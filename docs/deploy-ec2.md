# Deploy TaskFlow API lên EC2 dùng chung PostgreSQL của CV-Online

Kiến trúc production:

- Frontend Next.js chạy trên Vercel.
- API Express/Socket.IO chạy trong container `taskflow-api` trên EC2.
- TaskFlow có database và user riêng trong PostgreSQL container của CV-Online.
- Nginx public API qua HTTPS tại hostname `sslip.io`.
- Port `3001` chỉ bind vào `127.0.0.1`; không mở port này trong EC2 Security Group.

## 1. Xác định network và PostgreSQL container

Trên EC2:

```bash
docker network ls
docker ps --format 'table {{.Names}}\t{{.Networks}}'
```

Mặc định cấu hình dùng network `cv-online_default` và service alias `postgres`. Nếu tên network khác, cập nhật `CV_ONLINE_NETWORK` trong `.env.production`.

## 2. Tạo database và user riêng

Tạo mật khẩu mạnh, sau đó vào PostgreSQL của CV-Online:

```bash
cd ~/CV-Online
docker compose exec postgres psql -U cvonline -d postgres
```

Chạy SQL, thay mật khẩu trước khi thực thi:

```sql
CREATE USER taskflow_user WITH PASSWORD 'REPLACE_WITH_A_STRONG_PASSWORD';
CREATE DATABASE taskflow OWNER taskflow_user;
\q
```

Không dùng database `cvonline` cho TaskFlow.

## 3. Chuẩn bị API

```bash
cd ~
git clone https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git task-management
cd ~/task-management
cp .env.production.example .env.production
nano .env.production
```

Các giá trị bắt buộc:

```env
DATABASE_URL=postgresql://taskflow_user:PASSWORD@postgres:5432/taskflow?schema=public
CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app
JWT_SECRET=RANDOM_SECRET_AT_LEAST_64_HEX_CHARACTERS
CV_ONLINE_NETWORK=cv-online_default
```

Nếu mật khẩu database có ký tự đặc biệt, URL-encode mật khẩu trong `DATABASE_URL`.

Tạo JWT secret:

```bash
openssl rand -hex 64
```

Deploy:

```bash
chmod +x deploy/ec2/deploy.sh
./deploy/ec2/deploy.sh
curl http://127.0.0.1:3001/health
```

## 4. Tạo hostname sslip.io và Nginx

Giả sử Elastic IP là `203.0.113.10`, hostname có thể là:

```text
taskflow.203.0.113.10.sslip.io
```

Tạo file Nginx từ template:

```bash
sudo cp deploy/nginx/taskflow.sslip.io.conf.template /etc/nginx/sites-available/taskflow
sudo sed -i 's/__SSLIP_HOST__/taskflow.203.0.113.10.sslip.io/g' /etc/nginx/sites-available/taskflow
sudo ln -s /etc/nginx/sites-available/taskflow /etc/nginx/sites-enabled/taskflow
sudo nginx -t
sudo systemctl reload nginx
```

Cấp HTTPS:

```bash
sudo certbot --nginx -d taskflow.203.0.113.10.sslip.io
curl https://taskflow.203.0.113.10.sslip.io/health
```

Security Group chỉ cần public `80`, `443`; không mở `3001`.

## 5. Cấu hình Vercel

Đặt biến production theo hostname thật:

```env
NEXT_PUBLIC_API_URL=https://taskflow.203.0.113.10.sslip.io
```

Đồng thời đặt `CORS_ORIGIN` trong `.env.production` trên EC2 bằng URL Vercel chính xác rồi recreate API:

```bash
./deploy/ec2/deploy.sh
```

## 6. Kiểm tra và rollback

```bash
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 api
docker stats --no-stream taskflow-api
free -h
df -h /
```

Nếu API không ổn định, dừng riêng TaskFlow mà không ảnh hưởng CV-Online:

```bash
docker compose --env-file .env.production -f compose.production.yml down
```

## 7. GitHub Actions deploy tự động

Workflow `.github/workflows/deploy-api.yml` build thử image trước, sau đó SSH vào EC2 và deploy khi nhánh `main` thành công. Tạo bốn repository secrets:

```text
EC2_HOST
EC2_USER
EC2_SSH_KEY
EC2_KNOWN_HOSTS
```

Lấy host key từ máy cá nhân đã tin cậy kết nối EC2, kiểm tra fingerprint trước khi lưu:

```bash
ssh-keyscan -H YOUR_ELASTIC_IP
```

`EC2_KNOWN_HOSTS` nên chứa output đầy đủ; không tạo host key động ngay trong workflow.
