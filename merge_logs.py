#!/usr/bin/env python3
"""
Consolide les fichiers JSON de session (ex. téléchargés depuis GitHub Pages
ou copiés depuis plusieurs ordinateurs) dans data_output/ et régénère les CSV.

Exemples d'utilisation :
  python3 merge_logs.py
  python3 merge_logs.py ~/Downloads
  python3 merge_logs.py chemin/vers/session_P01.json chemin/vers/dossier/
"""

import argparse
import glob
import json
import os
import re
import shutil
import sys
import zipfile
from datetime import datetime

from server import (
    BACKUP_DIR,
    CSV_DIR,
    JSON_DIR,
    MASTER_CSV_FILE,
    build_participant_csv_rows,
    safe_participant_id,
    write_csv_file,
)


def parse_iso_sort_key(value):
    if not value:
        return ''
    return str(value)


def participant_sort_key(pid):
    match = re.fullmatch(r'P(\d+)', pid)
    if match:
        return (0, int(match.group(1)), pid)
    return (1, 0, pid)


def is_valid_session_payload(data):
    return (
        isinstance(data, dict)
        and bool(data.get('participant_id'))
        and isinstance(data.get('trials'), list)
    )


def session_completeness_key(data, mtime):
    trials = [t for t in (data.get('trials') or []) if isinstance(t, dict)]
    completed_trials = sum(
        1 for t in trials if t.get('agreabilite') is not None and t.get('effort') is not None
    )
    has_ranking = bool((data.get('final_ranking') or {}).get('rank_1'))
    intw = data.get('interview_answers') or {}
    has_interview = bool(data.get('interview_completed')) or any(str(v).strip() for v in intw.values())
    end_time = parse_iso_sort_key(data.get('end_time'))
    start_time = parse_iso_sort_key(data.get('start_time'))
    return (has_interview, has_ranking, completed_trials, len(trials), end_time, start_time, mtime)


def collect_source_files(sources):
    """Collect candidate session JSON or ZIP files from CLI arguments (excluding backups/)."""
    files = []
    for src in sources:
        expanded = os.path.expanduser(src)
        if os.path.isfile(expanded):
            files.append(expanded)
        elif os.path.isdir(expanded):
            for pat in ('session_*.json', 'all_sessions*.json', 'dossier_*.zip'):
                pattern = os.path.join(expanded, pat)
                for candidate in sorted(glob.glob(pattern)):
                    if os.path.isfile(candidate):
                        files.append(candidate)
        else:
            print(f"[AVERTISSEMENT] Source introuvable ignorée : {src}", file=sys.stderr)
    return files


def extract_session_candidates(data):
    """Return individual session dicts from a single-session or multi-session bundle JSON."""
    if isinstance(data, dict) and isinstance(data.get('sessions'), dict):
        return [v for v in data['sessions'].values() if is_valid_session_payload(v)]
    if is_valid_session_payload(data):
        return [data]
    return []


def iter_json_payloads_from_path(fpath, require_session_prefix=True):
    """Yield (source_label, real_file_path, parsed_json) from a .json or .zip file."""
    fname = os.path.basename(fpath)
    if fname.lower().endswith('.zip'):
        try:
            with zipfile.ZipFile(fpath, 'r') as zf:
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    inner_name = os.path.basename(info.filename)
                    if not inner_name.lower().endswith('.json'):
                        continue
                    if require_session_prefix and not inner_name.startswith('session_'):
                        continue
                    try:
                        raw_bytes = zf.read(info.filename)
                        yield f"{fpath}::{info.filename}", fpath, json.loads(raw_bytes.decode('utf-8'))
                    except Exception as exc:
                        print(f"[AVERTISSEMENT] Entrée JSON invalide dans ZIP ({fpath}::{info.filename}) : {exc}", file=sys.stderr)
        except Exception as exc:
            print(f"[AVERTISSEMENT] Archive ZIP invalide ignorée ({fpath}) : {exc}", file=sys.stderr)
        return

    if require_session_prefix and not (fname.startswith('session_') and fname.endswith('.json')):
        return
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            yield fpath, fpath, json.load(f)
    except Exception as exc:
        print(f"[AVERTISSEMENT] Fichier JSON invalide ignoré ({fpath}) : {exc}", file=sys.stderr)


def load_best_sessions(paths, require_session_prefix=True):
    """Load and deduplicate session payloads per participant_id."""
    best_by_pid = {}
    for fpath in paths:
        mtime = os.path.getmtime(fpath)
        for src_label, real_path, raw_data in iter_json_payloads_from_path(fpath, require_session_prefix=require_session_prefix):
            for data in extract_session_candidates(raw_data):
                pid = safe_participant_id(data.get('participant_id'))
                score = session_completeness_key(data, mtime)
                prev = best_by_pid.get(pid)
                if prev is None or score > prev[0]:
                    best_by_pid[pid] = (score, data, src_label, real_path)

    return {pid: (data, src_label, real_path) for pid, (_, data, src_label, real_path) in best_by_pid.items()}


def import_external_sessions(source_args):
    """Import valid external session JSON (or ZIP) files into data_output/raw_json/."""
    candidate_files = collect_source_files(source_args)
    if not candidate_files:
        return 0

    best_external = load_best_sessions(candidate_files, require_session_prefix=False)
    now_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    imported_count = 0

    for pid, (ext_data, ext_label, ext_real_path) in sorted(best_external.items(), key=lambda item: participant_sort_key(item[0])):
        dest_path = os.path.join(JSON_DIR, f"session_{pid}.json")
        if ext_label == ext_real_path and os.path.abspath(ext_real_path) == os.path.abspath(dest_path):
            continue

        ext_score = session_completeness_key(ext_data, os.path.getmtime(ext_real_path))
        if os.path.isfile(dest_path):
            try:
                with open(dest_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                if existing_data == ext_data:
                    continue
                existing_score = session_completeness_key(existing_data, os.path.getmtime(dest_path))
                if ext_score <= existing_score:
                    print(f"[INFO] {pid} : version existante dans raw_json/ conservée (au moins aussi récente que {os.path.basename(ext_real_path)}).")
                    continue
            except Exception:
                pass
            backup_name = f"session_{pid}_backup_{now_str}.json"
            shutil.copy2(dest_path, os.path.join(BACKUP_DIR, backup_name))

        with open(dest_path, 'w', encoding='utf-8') as f:
            json.dump(ext_data, f, ensure_ascii=False, indent=2)
        imported_count += 1
        print(f"[IMPORT] {pid} <- {ext_label} -> session_{pid}.json")

    return imported_count


def rebuild_all_csvs():
    """Rebuild individual summary_PXX.csv files and master all_participants_summary.csv."""
    raw_files = sorted(glob.glob(os.path.join(JSON_DIR, 'session_*.json')))
    sessions = load_best_sessions([p for p in raw_files if os.path.isfile(p)], require_session_prefix=True)

    all_rows = []
    now_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    count_participants = 0

    for pid in sorted(sessions.keys(), key=participant_sort_key):
        sdata, _, _ = sessions[pid]
        rows = build_participant_csv_rows(sdata, pid, now_str)
        part_csv_path = os.path.join(CSV_DIR, f"summary_{pid}.csv")
        try:
            write_csv_file(part_csv_path, rows)
        except PermissionError:
            print(
                f"[ERREUR] Impossible d'écrire {part_csv_path} (fichier ouvert dans Excel ?). Fermez-le puis relancez.",
                file=sys.stderr,
            )
            return 1
        all_rows.extend(rows)
        count_participants += 1

    try:
        write_csv_file(MASTER_CSV_FILE, all_rows)
    except PermissionError:
        print(
            f"[ERREUR] Impossible d'écrire {MASTER_CSV_FILE} (fichier ouvert dans Excel ?). Fermez-le puis relancez.",
            file=sys.stderr,
        )
        return 1

    print(
        f"[OK] Consolidation terminée : {count_participants} participant(s), "
        f"{len(all_rows)} ligne(s) -> {os.path.relpath(MASTER_CSV_FILE)}"
    )
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Consolide les logs session_PXX.json dans data_output/csv/."
    )
    parser.add_argument(
        'sources',
        nargs='*',
        help="Dossiers (ex. ~/Downloads) ou fichiers session_*.json externes à importer avant consolidation.",
    )
    args = parser.parse_args()

    if args.sources:
        import_external_sessions(args.sources)

    return rebuild_all_csvs()


if __name__ == '__main__':
    sys.exit(main())
