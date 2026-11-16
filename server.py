#!/usr/bin/env python3
"""
Serveur local automatisé pour l'expérience IFT 6075
Sert les fichiers statiques du dossier code/ et sauvegarde automatiquement
les données expérimentales (JSON et CSV) dans data_output/.
"""

import os
import re
import sys
import json
import csv
import shutil
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PORT = 8080
HOST = '127.0.0.1'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CODE_DIR = os.path.join(BASE_DIR, 'code')
OUTPUT_DIR = os.path.join(BASE_DIR, 'data_output')
JSON_DIR = os.path.join(OUTPUT_DIR, 'raw_json')
BACKUP_DIR = os.path.join(JSON_DIR, 'backups')
CSV_DIR = os.path.join(OUTPUT_DIR, 'csv')
CONSENT_DIR = os.path.join(OUTPUT_DIR, 'consent_forms')
CONSENT_BACKUP_DIR = os.path.join(CONSENT_DIR, 'backups')

os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(CSV_DIR, exist_ok=True)
os.makedirs(CONSENT_DIR, exist_ok=True)
os.makedirs(CONSENT_BACKUP_DIR, exist_ok=True)

MASTER_CSV_FILE = os.path.join(CSV_DIR, 'all_participants_summary.csv')

CSV_HEADERS = [
    'Participant',
    'Age',
    'Genre',
    'Confort_Francais_1to5',
    'Confort_Revision_1to5',
    'Frequence_Lecture_1to5',
    'Block_Index',
    'Condition_Code',
    'Condition_Name',
    'TTS_Rate',
    'TTS_Volume',
    'TTS_Voice',
    'Text_ID',
    'Reading_Time_s',
    'Total_Words',
    'Planted_Errors',
    'True_Positives',
    'False_Positives',
    'False_Negatives',
    'Detection_Rate_pct',
    'Quiz_Retention_Score',
    'Quiz_Retention_Total',
    'Agreabilite_1to5',
    'Effort_1to5',
    'Trial_Comments',
    'Overall_Rank1',
    'Overall_Rank2',
    'Overall_Rank3',
    'Final_Comments',
    'Interview_Q1_Habitudes',
    'Interview_Q2_Usage_TTS_Passe',
    'Interview_Q3_Avantages_Inconvenients',
    'Interview_Q4_Demarquee',
    'Interview_Q5_Difficulte_Textes',
    'Interview_Q6_Ajout_Remarques',
    'Timestamp_Saved'
]


def write_csv_file(csv_path, rows):
    """Write semicolon-delimited UTF-8 BOM CSV using canonical headers."""
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(CSV_HEADERS)
        writer.writerows(rows)


def build_participant_csv_rows(session_data, pid, saved_timestamp):
    """Build CSV summary rows (one per trial) from a session payload."""
    precondition = session_data.get('precondition') or {}
    age = precondition.get('age', '')
    genre = precondition.get('genre', '')
    conf_fr = precondition.get('confort_francais', '')
    conf_rev = precondition.get('confort_revision', '')
    freq_lec = precondition.get('frequence_lecture', '')

    final_ranking = session_data.get('final_ranking') or {}
    rank_1 = final_ranking.get('rank_1', '')
    rank_2 = final_ranking.get('rank_2', '')
    rank_3 = final_ranking.get('rank_3', '')
    final_comment = final_ranking.get('comment', '')

    interview_answers = session_data.get('interview_answers') or {}
    intw_q1 = interview_answers.get('q1_habitudes', '')
    intw_q2 = interview_answers.get('q2_usage_tts_passe', '')
    intw_q3 = interview_answers.get('q3_avantages_inconvenients', '')
    intw_q4 = interview_answers.get('q4_demarquee', '')
    intw_q5 = interview_answers.get('q5_difficulte_textes', '')
    intw_q6 = interview_answers.get('q6_ajout_remarques', '')

    rows = []
    for trial in session_data.get('trials') or []:
        if not isinstance(trial, dict):
            continue
        rows.append([
            pid,
            age,
            genre,
            conf_fr,
            conf_rev,
            freq_lec,
            trial.get('block_index', ''),
            trial.get('condition_code', ''),
            trial.get('condition_name', ''),
            trial.get('tts_rate', ''),
            trial.get('tts_volume', ''),
            trial.get('tts_voice', ''),
            trial.get('text_id', ''),
            trial.get('reading_time_seconds', ''),
            trial.get('total_words', ''),
            trial.get('total_errors', ''),
            trial.get('true_positives', ''),
            trial.get('false_positives', ''),
            trial.get('false_negatives', ''),
            trial.get('detection_rate_percent', ''),
            trial.get('quiz_score', ''),
            trial.get('quiz_total', ''),
            trial.get('agreabilite', ''),
            trial.get('effort', ''),
            trial.get('comments', ''),
            rank_1,
            rank_2,
            rank_3,
            final_comment,
            intw_q1,
            intw_q2,
            intw_q3,
            intw_q4,
            intw_q5,
            intw_q6,
            saved_timestamp,
        ])
    return rows


def ensure_master_csv_headers():
    """Create master CSV or update header if file currently has no data rows."""
    if not os.path.exists(MASTER_CSV_FILE):
        write_csv_file(MASTER_CSV_FILE, [])
        return

    with open(MASTER_CSV_FILE, 'r', encoding='utf-8-sig', newline='') as f:
        rows = list(csv.reader(f, delimiter=';'))
    if len(rows) <= 1 and (not rows or rows[0] != CSV_HEADERS):
        write_csv_file(MASTER_CSV_FILE, [])


ensure_master_csv_headers()


def safe_participant_id(raw_pid):
    pid = os.path.basename(str(raw_pid or 'UNKNOWN')).strip()
    pid = re.sub(r'[^A-Za-z0-9_-]', '', pid)
    return pid or 'UNKNOWN'


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class ExperimentRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=CODE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for local convenience
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        path_only = self.path.split('?', 1)[0]

        if path_only == '/api/status':
            participants = {}
            for fname in sorted(os.listdir(JSON_DIR)):
                if not (fname.startswith('session_') and fname.endswith('.json')):
                    continue
                fpath = os.path.join(JSON_DIR, fname)
                if not os.path.isfile(fpath):
                    continue
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        sdata = json.load(f)
                    pid = safe_participant_id(sdata.get('participant_id') or fname[len('session_'):-len('.json')])
                    trials = [t for t in (sdata.get('trials') or []) if isinstance(t, dict)]
                    completed_trials = [
                        t for t in trials
                        if t.get('agreabilite') is not None and t.get('effort') is not None
                    ]
                    has_ranking = bool((sdata.get('final_ranking') or {}).get('rank_1'))
                    intw = sdata.get('interview_answers') or {}
                    has_interview = any(str(v).strip() for v in intw.values())
                    consent_json_path = os.path.join(CONSENT_DIR, f"FIC_{pid}.json")
                    participants[pid] = {
                        'exists': True,
                        'has_consent': bool(sdata.get('consent_confirmed')),
                        'has_consent_file': os.path.isfile(consent_json_path),
                        'trials_count': len(completed_trials),
                        'completed': len(completed_trials) >= 3 and has_ranking,
                        'has_ranking': has_ranking,
                        'interview_completed': bool(sdata.get('interview_completed')) or has_interview,
                        'has_interview': has_interview,
                        'start_time': sdata.get('start_time'),
                        'end_time': sdata.get('end_time'),
                        'updated_at': datetime.fromtimestamp(os.path.getmtime(fpath)).isoformat(timespec='seconds')
                    }
                except Exception:
                    continue

            self.send_json(200, {
                'status': 'ok',
                'server_mode': True,
                'participants': participants
            })
            return

        if path_only.startswith('/api/session/'):
            pid = safe_participant_id(path_only[len('/api/session/'):])
            json_path = os.path.join(JSON_DIR, f"session_{pid}.json")
            if not os.path.isfile(json_path):
                self.send_json(404, {'status': 'not_found', 'message': f'Aucune session trouvée pour {pid}'})
                return
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    sdata = json.load(f)
                self.send_json(200, {'status': 'ok', 'session': sdata})
            except Exception as e:
                self.send_json(500, {'status': 'error', 'message': str(e)})
            return

        if path_only.startswith('/api/consent/'):
            pid = safe_participant_id(path_only[len('/api/consent/'):])
            consent_json_path = os.path.join(CONSENT_DIR, f"FIC_{pid}.json")
            if not os.path.isfile(consent_json_path):
                self.send_json(404, {'status': 'not_found', 'message': f'Aucun FIC signé trouvé pour {pid}'})
                return
            try:
                with open(consent_json_path, 'r', encoding='utf-8') as f:
                    cdata = json.load(f)
                self.send_json(200, {'status': 'ok', 'consent': cdata})
            except Exception as e:
                self.send_json(500, {'status': 'error', 'message': str(e)})
            return

        super().do_GET()

    def do_POST(self):
        path_only = self.path.split('?', 1)[0]
        if path_only == '/api/save':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                session_data = json.loads(body.decode('utf-8'))

                pid = safe_participant_id(session_data.get('participant_id', 'UNKNOWN'))
                archive_previous = bool(session_data.pop('_archive_previous', False))
                now_str = datetime.now().strftime('%Y%m%d_%H%M%S')

                # 1. Backup existing JSON if starting a confirmed overwrite, then write raw session JSON
                json_filename = f"session_{pid}.json"
                json_path = os.path.join(JSON_DIR, json_filename)
                if archive_previous and os.path.isfile(json_path):
                    backup_name = f"session_{pid}_backup_{now_str}.json"
                    shutil.copy2(json_path, os.path.join(BACKUP_DIR, backup_name))

                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(session_data, f, ensure_ascii=False, indent=2)

                # 2. Save individual participant CSV (fixed filename per participant)
                part_csv_filename = f"summary_{pid}.csv"
                part_csv_path = os.path.join(CSV_DIR, part_csv_filename)
                new_rows = build_participant_csv_rows(session_data, pid, now_str)
                write_csv_file(part_csv_path, new_rows)

                # 3. Update master CSV without duplicating the participant
                master_warning = None
                try:
                    existing_rows = []
                    if os.path.exists(MASTER_CSV_FILE):
                        with open(MASTER_CSV_FILE, 'r', encoding='utf-8-sig', newline='') as f:
                            reader = list(csv.reader(f, delimiter=';'))
                            if len(reader) > 1:
                                existing_rows = [r for r in reader[1:] if r and r[0] != pid]

                    write_csv_file(MASTER_CSV_FILE, existing_rows + new_rows)
                except PermissionError:
                    master_warning = (
                        "all_participants_summary.csv est verrouillé (probablement ouvert dans Excel). "
                        f"Fermez-le puis réenregistrez ; {json_filename} et {part_csv_filename} ont bien été sauvegardés."
                    )

                print(f"[OK] Sauvegarde effectuée pour {pid} -> {json_filename} et {part_csv_filename}")

                response = {
                    'status': 'success',
                    'message': f'Données sauvegardées avec succès pour {pid}',
                    'json_file': json_filename,
                    'csv_file': part_csv_filename,
                    'master_csv': 'all_participants_summary.csv'
                }
                if master_warning:
                    response['warning'] = master_warning
                self.send_json(200, response)
            except Exception as e:
                print(f"[ERREUR] Échec de sauvegarde : {e}", file=sys.stderr)
                self.send_json(500, {'status': 'error', 'message': str(e)})
        elif path_only == '/api/save-consent':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode('utf-8'))

                consent_data = payload.get('consent') if isinstance(payload, dict) else None
                html_doc = payload.get('html') if isinstance(payload, dict) else ''
                if not isinstance(consent_data, dict):
                    self.send_json(400, {'status': 'error', 'message': 'Objet consent invalide'})
                    return

                pid = safe_participant_id(consent_data.get('participant_id', 'UNKNOWN'))
                archive_previous = bool(payload.get('_archive_previous', False))
                now_str = datetime.now().strftime('%Y%m%d_%H%M%S')

                consent_json_filename = f"FIC_{pid}.json"
                consent_html_filename = f"FIC_{pid}.html"
                consent_json_path = os.path.join(CONSENT_DIR, consent_json_filename)
                consent_html_path = os.path.join(CONSENT_DIR, consent_html_filename)

                if archive_previous:
                    if os.path.isfile(consent_json_path):
                        shutil.copy2(consent_json_path, os.path.join(CONSENT_BACKUP_DIR, f"FIC_{pid}_backup_{now_str}.json"))
                    if os.path.isfile(consent_html_path):
                        shutil.copy2(consent_html_path, os.path.join(CONSENT_BACKUP_DIR, f"FIC_{pid}_backup_{now_str}.html"))

                with open(consent_json_path, 'w', encoding='utf-8') as f:
                    json.dump(consent_data, f, ensure_ascii=False, indent=2)

                if isinstance(html_doc, str) and html_doc.strip():
                    with open(consent_html_path, 'w', encoding='utf-8') as f:
                        f.write(html_doc)

                print(f"[OK] FIC signé enregistré séparément pour {pid} -> {consent_html_filename}")
                self.send_json(200, {
                    'status': 'success',
                    'consent_json': consent_json_filename,
                    'consent_html': consent_html_filename
                })
            except Exception as e:
                print(f"[ERREUR] Échec sauvegarde FIC : {e}", file=sys.stderr)
                self.send_json(500, {'status': 'error', 'message': str(e)})
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    server_address = (HOST, PORT)
    httpd = ReusableThreadingHTTPServer(server_address, ExperimentRequestHandler)
    print(f"Serveur d'expérience IFT 6075 actif sur http://localhost:{PORT}")
    print(f"Répertoire servi : {CODE_DIR}")
    print(f"Sauvegarde automatique dans : {OUTPUT_DIR}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur.")
        httpd.server_close()
