# Qikzo VPS Deploy Guide

Realistic capacity for this configuration (code-only optimizations, single Node process, self-hosted Mongo on same VPS):

**~2,000–3,000 concurrent users + ~500–1,000 concurrent riders** on 4-8 vCPU / 16 GB RAM VPS with NVMe SSD.

For 5-10k+, you MUST add Redis (socket adapter + rate-limit-redis + BullMQ) and switch to PM2 cluster mode. This document covers the current single-process setup.

---

## 1. VPS specs (recommended)

| Users | vCPU | RAM  | Disk    | Provider examples |
|-------|------|------|---------|--------------------|
| 500   | 2    | 4 GB | 40 GB   | Hetzner CPX21, DO 2vCPU |
| 2k    | 4    | 8 GB | 80 GB   | Hetzner CPX31, Contabo VPS L |
| 5k    | 8    | 16 GB| 160 GB  | Hetzner CPX41 + separate Mongo VPS |

Always NVMe SSD. Never spinning disk for Mongo.

## 2. OS prep (Ubuntu 22.04)

```bash
# Non-root user
adduser qikzo && usermod -aG sudo qikzo

# File descriptors — sockets need this
sudo tee -a /etc/security/limits.conf <<EOF
qikzo soft nofile 65535
qikzo hard nofile 65535
EOF

# Kernel TCP tuning
sudo tee -a /etc/sysctl.conf <<EOF
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_local_port_range = 10000 65535
EOF
sudo sysctl -p

# Firewall
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## 3. Install Node 20 + PM2 + Nginx + Mongo

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm i -g pm2

# MongoDB 7.0
wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | sudo tee /etc/apt/trusted.gpg.d/mongo.asc
echo "deb [arch=amd64] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

## 4. Mongo hardening

Edit `/etc/mongod.conf`:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 6    # ≈ RAM / 2 on a 16GB box
net:
  bindIp: 127.0.0.1
security:
  authorization: enabled
```

Create admin user, then app user:

```bash
mongosh
> use admin
> db.createUser({user:"root", pwd:"STRONG_PW", roles:["root"]})
> use qikzo
> db.createUser({user:"qikzo_app", pwd:"STRONG_PW", roles:[{role:"readWrite", db:"qikzo"}]})
```

Then in `.env`: `MONGO_URI=mongodb://qikzo_app:STRONG_PW@127.0.0.1:27017/qikzo?authSource=qikzo`

Daily backup cron:

```bash
sudo tee /etc/cron.daily/qikzo-backup <<'EOF'
#!/bin/bash
D=$(date +%F)
mongodump --uri "$MONGO_URI" --out /var/backups/qikzo/$D
find /var/backups/qikzo -mtime +14 -exec rm -rf {} +
EOF
sudo chmod +x /etc/cron.daily/qikzo-backup
```

## 5. App deploy

```bash
cd /home/qikzo
git clone <repo> qikzo && cd qikzo/qikzo-server
npm ci
npm run build   # or bun run build
```

`.env` (production):

```
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb://qikzo_app:...@127.0.0.1:27017/qikzo?authSource=qikzo
JWT_SECRET=<64+ random chars>
CORS_ORIGIN=https://admin.qikzo.com,https://qikzo.com
LOG_LEVEL=warn
RUN_MIGRATIONS_ON_BOOT=true   # First boot only; flip to false afterwards
```

Start with PM2 (SINGLE instance — do NOT use `-i max` cluster mode without Redis, sockets will break):

```bash
pm2 start dist/server.js --name qikzo-api --max-memory-restart 1500M --time
pm2 save && pm2 startup
```

After first successful boot, edit `.env` → `RUN_MIGRATIONS_ON_BOOT=false` and `pm2 restart qikzo-api`.

## 6. Nginx reverse proxy + SSL

`/etc/nginx/sites-available/qikzo`:

```nginx
upstream qikzo_api { server 127.0.0.1:4000 keepalive 64; }

server {
    listen 80;
    server_name api.qikzo.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.qikzo.com;

    # Certs from certbot
    ssl_certificate     /etc/letsencrypt/live/api.qikzo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.qikzo.com/privkey.pem;

    gzip on;
    gzip_types application/json text/plain application/javascript text/css;
    client_max_body_size 10m;

    location / {
        proxy_pass http://qikzo_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade (Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/qikzo /etc/nginx/sites-enabled/
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.qikzo.com
sudo systemctl reload nginx
```

## 7. Monitoring

- `pm2 monit` — live CPU/mem
- `pm2 logs qikzo-api --lines 200`
- `mongotop` and `mongostat` — DB pressure
- UptimeRobot / BetterStack — external ping on `/health` every 60s

## 8. What this setup handles

✅ 2-3k concurrent users comfortably  
✅ Location throttling (only 1 DB write per rider per 4s)  
✅ Compound & 2dsphere indexes for all hot queries  
✅ Double-tap booking dedup (Idempotency-Key + 5-min LRU)  
✅ Per-user booking rate limit (5/min)  
✅ Graceful shutdown (no socket drops on `pm2 reload`)  
✅ Weak ETags for 304 replays on repeat GETs

## 9. What still needs Redis (for 5-10k+)

❌ Multi-process Socket.IO fanout — install Redis + `@socket.io/redis-adapter`  
❌ Cross-process rate limiting — `rate-limit-redis`  
❌ Background push queue — BullMQ  
❌ Multi-instance session/cache

All above are additive — the code doesn't fight you when you're ready.
