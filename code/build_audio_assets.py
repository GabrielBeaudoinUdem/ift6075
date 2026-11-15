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
import wave

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEXTS_JSON_PATH = os.path.join(BASE_DIR, 'data', 'texts.json')
TIMINGS_JS_PATH = os.path.join(BASE_DIR, 'data', 'audio_timings.js')
AUDIO_DIR = os.path.join(BASE_DIR, 'audio')

VOICE_NAME = 'Amélie'
SAMPLE_RATE = 44100
INTER_SENTENCE_PAUSE_S = 0.28
SEEK_LEAD_IN_S = 0.10
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


def encode_mp3(input_audio_path, out_mp3_path):
    subprocess.run(
        [
            'ffmpeg', '-y', '-loglevel', 'error',
            '-i', input_audio_path,
            '-ac', '1',
            '-ar', str(SAMPLE_RATE),
            '-c:a', 'libmp3lame',
            '-b:a', '96k',
            '-write_xing', '0',
            out_mp3_path,
        ],
        check=True,
    )


def synthesize_mp3(text, out_mp3_path, tmp_dir, stem):
    aiff_path = os.path.join(tmp_dir, f"{stem}.aiff")
    subprocess.run(
        ['say', '-v', VOICE_NAME, '-o', aiff_path, text],
        check=True,
    )
    encode_mp3(aiff_path, out_mp3_path)


def split_tokens_into_sentences(doc):
    """Regroupe les tokens d'un texte en phrases exactes alignées sur tokens[i]."""
    tokens = doc.get('tokens') or []
    sentences = []
    start_idx = 0
    for idx, tok in enumerate(tokens):
        raw = tok.get('raw', '')
        if raw and raw[-1] in '.!?':
            sent_tokens = tokens[start_idx:idx + 1]
            sentences.append({
                'sentence_index': len(sentences),
                'token_start': start_idx,
                'token_end': idx,
                'text': ' '.join(t['raw'] for t in sent_tokens),
            })
            start_idx = idx + 1

    if start_idx < len(tokens):
        sent_tokens = tokens[start_idx:]
        sentences.append({
            'sentence_index': len(sentences),
            'token_start': start_idx,
            'token_end': len(tokens) - 1,
            'text': ' '.join(t['raw'] for t in sent_tokens),
        })
    return sentences


def synthesize_text_with_sentence_timings(doc, out_mp3_path, tmp_dir):
    """Synthétise phrase par phrase pour garantir des repères temporels exacts."""
    text_id = doc['id']
    sentences = split_tokens_into_sentences(doc)
    combined_wav = os.path.join(tmp_dir, f"{text_id}_combined.wav")
    pause_frames = int(round(INTER_SENTENCE_PAUSE_S * SAMPLE_RATE))
    silence_bytes = b'\x00\x00' * pause_frames

    timings = []
    cumulative_frames = 0

    with wave.open(combined_wav, 'wb') as out_wf:
        out_wf.setnchannels(1)
        out_wf.setsampwidth(2)
        out_wf.setframerate(SAMPLE_RATE)

        for idx, sent in enumerate(sentences):
            if idx > 0:
                out_wf.writeframes(silence_bytes)
                cumulative_frames += pause_frames

            seg_aiff = os.path.join(tmp_dir, f"{text_id}_s{idx}.aiff")
            seg_wav = os.path.join(tmp_dir, f"{text_id}_s{idx}.wav")
            subprocess.run(
                ['say', '-v', VOICE_NAME, '-o', seg_aiff, sent['text']],
                check=True,
            )
            subprocess.run(
                [
                    'ffmpeg', '-y', '-loglevel', 'error',
                    '-i', seg_aiff,
                    '-ac', '1',
                    '-ar', str(SAMPLE_RATE),
                    '-c:a', 'pcm_s16le',
                    seg_wav,
                ],
                check=True,
            )

            with wave.open(seg_wav, 'rb') as in_wf:
                if in_wf.getnchannels() != 1 or in_wf.getsampwidth() != 2 or in_wf.getframerate() != SAMPLE_RATE:
                    raise RuntimeError(f"Format WAV inattendu pour {seg_wav}")
                n_frames = in_wf.getnframes()
                pcm_bytes = in_wf.readframes(n_frames)

            speech_start_s = cumulative_frames / SAMPLE_RATE
            out_wf.writeframes(pcm_bytes)
            cumulative_frames += n_frames
            speech_end_s = cumulative_frames / SAMPLE_RATE

            seek_s = 0.0 if idx == 0 else max(0.0, speech_start_s - SEEK_LEAD_IN_S)
            timings.append({
                'sentence_index': sent['sentence_index'],
                'token_start': sent['token_start'],
                'token_end': sent['token_end'],
                'start_s': round(seek_s, 3),
                'speech_start_s': round(speech_start_s, 3),
                'end_s': round(speech_end_s, 3),
            })

    encode_mp3(combined_wav, out_mp3_path)
    return timings


def main():
    check_dependencies()
    os.makedirs(AUDIO_DIR, exist_ok=True)

    with open(TEXTS_JSON_PATH, 'r', encoding='utf-8') as f:
        texts_payload = json.load(f)

    texts_by_id = {t['id']: t for t in texts_payload.get('texts', []) if 'id' in t}
    all_timings = {}

    with tempfile.TemporaryDirectory() as tmp_dir:
        cal_out = os.path.join(AUDIO_DIR, 'calibration_test.mp3')
        cal_words = len(CALIBRATION_TEST_TEXT.split())
        synthesize_mp3(CALIBRATION_TEST_TEXT, cal_out, tmp_dir, 'calibration_test')
        cal_kb = os.path.getsize(cal_out) / 1024.0
        cal_dur = probe_duration_seconds(cal_out)
        if cal_dur:
            print(f"[OK] calibration_test.mp3 : {cal_dur:.2f} s ({cal_words} mots, {cal_words / (cal_dur / 60.0):.1f} mpm), {cal_kb:.1f} Ko")
        else:
            print(f"[OK] calibration_test.mp3 : {cal_kb:.1f} Ko")

        for tid in TARGET_TEXT_IDS:
            doc = texts_by_id.get(tid)
            if not doc:
                raise RuntimeError(f"Texte '{tid}' introuvable dans {TEXTS_JSON_PATH}")
            words = doc.get('wordCount') or len(doc['rawText'].split())
            out_path = os.path.join(AUDIO_DIR, f"{tid}.mp3")
            timings = synthesize_text_with_sentence_timings(doc, out_path, tmp_dir)
            all_timings[tid] = timings

            size_kb = os.path.getsize(out_path) / 1024.0
            dur = probe_duration_seconds(out_path)
            if dur:
                wpm = words / (dur / 60.0)
                print(f"[OK] {tid}.mp3 : {dur:.2f} s ({len(timings)} phrases, {words} mots, {wpm:.1f} mpm), {size_kb:.1f} Ko")
            else:
                print(f"[OK] {tid}.mp3 : {len(timings)} phrases, {size_kb:.1f} Ko")

    with open(TIMINGS_JS_PATH, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated by build_audio_assets.py — sentence start/end timestamps (seconds)\n')
        f.write('window.EMBEDDED_AUDIO_TIMINGS = ')
        json.dump(all_timings, f, ensure_ascii=False, indent=2)
        f.write(';\n')

    print(f"Fichiers audio générés dans : {AUDIO_DIR}")
    print(f"Repères de phrases enregistrés dans : {TIMINGS_JS_PATH}")


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"[ERREUR] {exc}", file=sys.stderr)
        sys.exit(1)
