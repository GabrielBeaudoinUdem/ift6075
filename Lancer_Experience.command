#!/bin/bash
cd "$(dirname "$0")" || exit 1

echo "=========================================="
echo "  IFT 6075 — Lancement de l'expérience"
echo "=========================================="

if curl -sf "http://127.0.0.1:8080/api/status" >/dev/null 2>&1; then
  echo "Le serveur est déjà actif sur http://localhost:8080 — ouverture du navigateur..."
  open "http://localhost:8080"
  exit 0
fi

echo "Démarrage du serveur local sur http://localhost:8080 ..."
echo "(Laissez cette fenêtre ouverte pendant toute la séance ; Ctrl+C pour arrêter.)"
(sleep 1 && open "http://localhost:8080") &
python3 server.py
