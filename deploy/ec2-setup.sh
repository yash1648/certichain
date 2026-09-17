#!/usr/bin/env bash
# CertiChain EC2 setup — run on the instance from the deploy/ directory.
# Prereq: ../certchain (backend source) and .env (cp env.production.example .env) exist.
set -euo pipefail

if [ ! -f .env ]; then
  echo "Missing .env — copy env.production.example to .env and fill it in first."
  exit 1
fi

if [ ! -d ../certchain ]; then
  echo "Missing ../certchain — the backend source must sit next to deploy/."
  echo "From your laptop, run:"
  echo "  rsync -av --exclude target --exclude .idea -e 'ssh -i KEY.pem' certchain/ ubuntu@<EC2_IP>:~/certchain/"
  exit 1
fi

# Install Docker + compose plugin (Ubuntu)
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi
sudo systemctl enable --now docker

sudo docker compose -f docker-compose.prod.yml up -d --build
sudo docker compose -f docker-compose.prod.yml ps