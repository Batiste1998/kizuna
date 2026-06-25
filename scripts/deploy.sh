#!/usr/bin/env bash
# Déploiement de Kizuna en production.
# Exécuté SUR le serveur AWS via SSH par le workflow GitHub Actions « Deploy »
# (piped: `ssh … 'bash -s' < scripts/deploy.sh`). Voir .github/workflows/deploy.yml.
set -euo pipefail

cd /srv/kizuna

echo "▶ Récupération de origin/main"
git fetch --depth 1 origin main
git reset --hard origin/main

echo "▶ Rebuild + (re)démarrage des conteneurs"
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f

echo "▶ Vérification de santé de l'API"
for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/health)" = "200" ]; then
    echo "✓ API saine — déploiement OK"
    exit 0
  fi
  sleep 2
done

echo "✗ L'API ne répond pas 200 sur /health après le déploiement" >&2
exit 1
