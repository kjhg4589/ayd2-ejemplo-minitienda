#!/usr/bin/env bash
# Prepara una EC2 nueva para recibir los deploys del pipeline. Se corre UNA sola vez:
#
#   scp -i llave.pem deploy/setup-ec2.sh ubuntu@<IP>:~
#   ssh -i llave.pem ubuntu@<IP> 'bash setup-ec2.sh'
#
# Funciona en Ubuntu 22.04/24.04 y Amazon Linux 2023.
set -euo pipefail

APP_DIR=/opt/tienda
DATA_DIR=/var/lib/tienda
APP_USER=$(whoami)

echo "==> Instalando Node.js 24, nginx y rsync"
if command -v apt-get >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs nginx rsync build-essential
  sudo rm -f /etc/nginx/sites-enabled/default
elif command -v dnf >/dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
  sudo dnf install -y nodejs nginx rsync gcc-c++ make
else
  echo "Distribución no soportada" >&2
  exit 1
fi

echo "==> Carpetas de la app ($APP_DIR) y de la base de datos ($DATA_DIR)"
sudo mkdir -p "$APP_DIR" "$DATA_DIR"
sudo chown "$APP_USER":"$APP_USER" "$APP_DIR" "$DATA_DIR"

echo "==> Servicio systemd: mantiene la app viva y la reinicia si se cae"
sudo tee /etc/systemd/system/tienda.service >/dev/null <<EOF
[Unit]
Description=Mini Tienda
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DB_PATH=$DATA_DIR/tienda.db
ExecStart=$(command -v node) src/server.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable tienda

echo "==> nginx como proxy inverso: puerto 80 -> 3000"
sudo tee /etc/nginx/conf.d/tienda.conf >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
# En Amazon Linux con SELinux en modo enforcing, nginx necesita permiso para conectarse a la app
if command -v setsebool >/dev/null; then sudo setsebool -P httpd_can_network_connect 1 || true; fi
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo
echo "Listo. El primer deploy lo hace GitHub Actions al hacer push a main."
