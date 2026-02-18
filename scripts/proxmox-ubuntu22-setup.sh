#!/usr/bin/env bash
set -Eeuo pipefail

# Rocket League Pick em - Full setup for Ubuntu 22.04 (Proxmox VM/LXC)
# What this script does:
# 1) Installs system dependencies + Node.js 22 + apache2
# 2) Installs app dependencies and builds frontend
# 3) Creates systemd services for API and frontend preview
# 4) Configures apache reverse proxy:
#    - /        -> frontend (localhost:4173)
#    - /api     -> backend  (localhost:4000)
#
# Usage:
#   sudo bash scripts/proxmox-ubuntu22-setup.sh --app-dir /var/www/html/rocketleague-pickem
#
# Optional:
#   --domain example.com
#   --app-user ubuntu
#   --api-port 4000
#   --web-port 4173
#   --node-major 22
#   --skip-apache

APP_DIR="/var/www/html/"
APP_USER="ubuntu"
DOMAIN="_"
API_PORT="4000"
WEB_PORT="4173"
NODE_MAJOR="22"
SKIP_APACHE="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir) APP_DIR="$2"; shift 2 ;;
    --app-user) APP_USER="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --api-port) API_PORT="$2"; shift 2 ;;
    --web-port) WEB_PORT="$2"; shift 2 ;;
    --node-major) NODE_MAJOR="$2"; shift 2 ;;
    --skip-apache) SKIP_APACHE="1"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script with sudo/root." >&2
  exit 1
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  echo "User '$APP_USER' does not exist. Create it first or pass --app-user." >&2
  exit 1
fi

echo "[1/7] Installing system packages..."
apt-get update -y
apt-get install -y \
  ca-certificates curl gnupg lsb-release \
  git build-essential unzip \
  sqlite3 apache2

echo "[2/7] Installing Node.js ${NODE_MAJOR}.x..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" != "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

echo "[3/7] Preparing app directory..."
mkdir -p "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "No package.json found in ${APP_DIR}."
  echo "Copy your project there first (git clone / rsync), then re-run this script."
  exit 1
fi

echo "[4/7] Installing npm deps + build..."
sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm install"

if [[ ! -f "${APP_DIR}/.env" && -f "${APP_DIR}/.env.example" ]]; then
  echo "Creating .env from .env.example..."
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
fi

if [[ -f "${APP_DIR}/.env" ]]; then
  sed -i "s|^PORT=.*|PORT=${API_PORT}|g" "${APP_DIR}/.env" || true
  sed -i "s|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=http://${DOMAIN:-localhost}|g" "${APP_DIR}/.env" || true
  sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://${DOMAIN:-localhost}/api|g" "${APP_DIR}/.env" || true
fi

sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm run build"

echo "[5/7] Creating systemd services..."
cat >/etc/systemd/system/rocketleague-pickem-api.service <<EOF
[Unit]
Description=Rocket League Pick em API
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run server
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/rocketleague-pickem-web.service <<EOF
[Unit]
Description=Rocket League Pick em Frontend
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run preview -- --host 127.0.0.1 --port ${WEB_PORT}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now rocketleague-pickem-api.service
systemctl enable --now rocketleague-pickem-web.service

if [[ "${SKIP_APACHE}" == "0" ]]; then
  echo "[6/7] Configuring apache reverse proxy..."
  a2enmod proxy proxy_http headers rewrite >/dev/null

  cat >/etc/apache2/sites-available/rocketleague-pickem.conf <<EOF
<VirtualHost *:80>
    ServerName ${DOMAIN}

    ProxyPreserveHost On
    ProxyRequests Off

    ProxyPass /api/ http://127.0.0.1:${API_PORT}/api/
    ProxyPassReverse /api/ http://127.0.0.1:${API_PORT}/api/

    ProxyPass / http://127.0.0.1:${WEB_PORT}/
    ProxyPassReverse / http://127.0.0.1:${WEB_PORT}/

    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
</VirtualHost>
EOF

  a2dissite 000-default >/dev/null || true
  a2ensite rocketleague-pickem.conf >/dev/null
  apache2ctl configtest
  systemctl enable --now apache2
  systemctl reload apache2
fi

echo "[7/7] Done."
echo "API service:    systemctl status rocketleague-pickem-api"
echo "WEB service:    systemctl status rocketleague-pickem-web"
if [[ "${SKIP_APACHE}" == "0" ]]; then
  echo "Open: http://${DOMAIN:-<server-ip>}"
else
  echo "Web: http://<server-ip>:${WEB_PORT} | API: http://<server-ip>:${API_PORT}/api/health"
fi
