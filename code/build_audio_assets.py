#!/usr/bin/env python3
"""
Génère les fichiers audio MP3 pré-enregistrés (voix macOS Amélie [fr_CA])
à partir des textes de code/data/texts.json et de la phrase d'étalonnage.

Prérequis (macOS) :
  - Voix française macOS "Amélie" installée (Réglages Système > Accessibilité > Contenu énoncé)
  - ffmpeg (libmp3lame) pour l'encodage MP3 CBR compatible tous navigateurs
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEXTS_JSON_PATH = os.path.join(BASE_DIR, 'data', 'texts.json')
AUDIO_DIR = os.path.join(BASE_DIR, 'audio')

VOICE_NAME = 'Amélie'
CALIBRATION_TEST_TEXT = (
    "Ceci est un test de synthèse vocale pour l'expérience IFT 6075. "
    "La vitesse et le volume sonore vous conviennent-ils ?"
)
TARGET_TEXT_IDS = ('text1', 'text2', 'text3')


def check_dependencies():
    if shutil.which('say') is None:
        raise RuntimeError("La commande macOS 'say' est requise pour générer les voix Amélie.")
    if shutil.which('ffmpeg') is None:
        raise RuntimeError("ffmpeg est requis pour convertir l'audio en MP3.")


def probe_duration_seconds(mp3_path):
    if shutil.which('ffprobe') is None:
        return None
    out = subprocess.check_output(
        [
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'json', mp3_path,
        ],
        text=True,
    )
    return float(json.loads(out)['format']['duration'])


def synthesize_mp3(text, out_mp3_path, tmp_dir, stem):
    aiff_path = os.path.join(tmp_dir, f"{stem}.aiff")
    subprocess.run(
        ['say', '-v', VOICE_NAME, '-o', aiff_path, text],
        check=True,
    )
    subprocess.run(
        [
            'ffmpeg', '-y', '-loglevel', 'error',
            '-i', aiff_path,
            '-ac', '1',
            '-ar', '44100',
            '-c:a', 'libmp3lame',
            '-b:a', '96k',
            '-write_xing', '0',
            out_mp3_path,
        ],
        check=True,
    )


def main():
    check_dependencies()
    os.makedirs(AUDIO_DIR, exist_ok=True)

    with open(TEXTS_JSON_PATH, 'r', encoding='utf-8') as f:
        texts_payload = json.load(f)

    texts_by_id = {t['id']: t for t in texts_payload.get('texts', []) if 'id' in t}

    jobs = [('calibration_test', CALIBRATION_TEST_TEXT, len(CALIBRATION_TEST_TEXT.split()))]
    for tid in TARGET_TEXT_IDS:
        doc = texts_by_id.get(tid)
        if not doc:
            raise RuntimeError(f"Texte '{tid}' introuvable dans {TEXTS_JSON_PATH}")
        jobs.append((tid, doc['rawText'], doc.get('wordCount') or len(doc['rawText'].split())))

    with tempfile.TemporaryDirectory() as tmp_dir:
        for stem, text, words in jobs:
            out_path = os.path.join(AUDIO_DIR, f"{stem}.mp3")
            synthesize_mp3(text, out_path, tmp_dir, stem)
            size_kb = os.path.getsize(out_path) / 1024.0
            dur = probe_duration_seconds(out_path)
            if dur:
                wpm = words / (dur / 60.0)
                print(f"[OK] {stem}.mp3 : {dur:.2f} s ({words} mots, {wpm:.1f} mpm), {size_kb:.1f} Ko")
            else:
                print(f"[OK] {stem}.mp3 : {size_kb:.1f} Ko")

    print(f"Fichiers audio générés dans : {AUDIO_DIR}")


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"[ERREUR] {exc}", file=sys.stderr)
        sys.exit(1)
