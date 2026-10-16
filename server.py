#!/usr/bin/env python3
"""
Serveur local automatisé pour l'expérience IFT 6075
Sert les fichiers statiques du dossier code/ et sauvegarde automatiquement
les données expérimentales (JSON et CSV) dans data_output/.
"""

import os
import sys
import json
import csv
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CODE_DIR = os.path.join(BASE_DIR, 'code')
OUTPUT_DIR = os.path.join(BASE_DIR, 'data_output')
JSON_DIR = os.path.join(OUTPUT_DIR, 'raw_json')
CSV_DIR = os.path.join(OUTPUT_DIR, 'csv')

os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(CSV_DIR, exist_ok=True)

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

# Ensure master CSV exists with headers
if not os.path.exists(MASTER_CSV_FILE):
    with open(MASTER_CSV_FILE, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(CSV_HEADERS)


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

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/save':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                session_data = json.loads(body.decode('utf-8'))

                pid = session_data.get('participant_id', 'UNKNOWN')
                now_str = datetime.now().strftime('%Y%m%d_%H%M%S')
                
                # 1. Save raw session JSON (fixed filename per participant to overwrite intermediate saves)
                json_filename = f"session_{pid}.json"
                json_path = os.path.join(JSON_DIR, json_filename)
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(session_data, f, ensure_ascii=False, indent=2)

                # 2. Save individual participant CSV (fixed filename per participant)
                part_csv_filename = f"summary_{pid}.csv"
                part_csv_path = os.path.join(CSV_DIR, part_csv_filename)

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

                new_rows = []
                for trial in session_data.get('trials', []):
                    row = [
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
                        now_str
                    ]
                    new_rows.append(row)

                # Write individual CSV
                with open(part_csv_path, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.writer(f, delimiter=';')
                    writer.writerow(CSV_HEADERS)
                    writer.writerows(new_rows)

                # 3. Update master CSV without duplicating the participant
                existing_rows = []
                if os.path.exists(MASTER_CSV_FILE):
                    with open(MASTER_CSV_FILE, 'r', encoding='utf-8-sig', newline='') as f:
                        reader = list(csv.reader(f, delimiter=';'))
                        if len(reader) > 1:
                            existing_rows = [r for r in reader[1:] if r and r[0] != pid]

                with open(MASTER_CSV_FILE, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.writer(f, delimiter=';')
                    writer.writerow(CSV_HEADERS)
                    writer.writerows(existing_rows + new_rows)

                print(f"[OK] Sauvegarde effectuée pour {pid} -> {json_filename} et {part_csv_filename}")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'status': 'success',
                    'message': f'Données sauvegardées avec succès pour {pid}',
                    'json_file': json_filename,
                    'csv_file': part_csv_filename,
                    'master_csv': 'all_participants_summary.csv'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                print(f"[ERREUR] Échec de sauvegarde : {e}", file=sys.stderr)
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ExperimentRequestHandler)
    print(f"Serveur d'expérience IFT 6075 actif sur http://localhost:{PORT}")
    print(f"Répertoire servi : {CODE_DIR}")
    print(f"Sauvegarde automatique dans : {OUTPUT_DIR}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur.")
        httpd.server_close()
