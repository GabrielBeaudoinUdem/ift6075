# Guide Rapide — Expérience IHM (IFT 6075)

Guide d'utilisation concis pour lancer l'expérience, modifier les textes ou les questions, et retrouver les données collectées.

---

## 1. Comment Lancer l'Expérience

### Option A — En local sur votre Mac (sauvegarde automatique directe dans `data_output/`)
- **Lancement rapide (Mac) :** Double-cliquez sur [`Lancer_Experience.command`](Lancer_Experience.command) — cela démarre le serveur local et ouvre automatiquement `http://localhost:8080` dans votre navigateur.
- **Via le terminal :**
  1. Ouvrez un terminal à la racine du dépôt (`ift6075/`) :
     ```bash
     cd ~/Desktop/IHM/ift6075
     ```
  2. Démarrez le serveur local :
     ```bash
     python3 server.py
     ```
  3. Ouvrez votre navigateur sur : **`http://localhost:8080`**

*(Note : Vérifiez le bandeau vert « Serveur local connecté » sur l'écran d'accueil. L'écran d'accueil indique aussi automatiquement quels participants `P01`–`P12` sont complétés, en attente d'entrevue finale ou en cours, avec reprise possible et archivage automatique dans `data_output/raw_json/backups/` en cas de réinitialisation d'un participant.)*

### Option B — En ligne via GitHub Pages (depuis n'importe quel ordinateur, logs 100 % locaux)
- Tous les fichiers front-end nécessaires sont autonomes et en chemins relatifs dans [`code/`](code/) (`index.html`, `styles.css`, `app.js`, `data/data.js` et `audio/*.mp3`), avec une redirection automatique depuis [`index.html`](index.html) à la racine.
- **Activer GitHub Pages sur ce dépôt (`GabrielBeaudoinUdem/ift6075`) :**
  1. Sur GitHub : **Settings → Pages → Source : Deploy from a branch** → branche **`main`** et dossier **`/ (root)`** → **Save**.
  2. Ouvrez ensuite **`https://gabrielbeaudoinudem.github.io/ift6075/`** dans Google Chrome (redirige automatiquement vers `/code/`).
- **Fonctionnement en ligne :**
  - L'application détecte automatiquement l'hébergement statique `.github.io` (bandeau bleu *« Mode en ligne (hébergement statique / GitHub Pages) »*) et n'envoie **aucune** donnée sur Internet (conforme aux exigences locales CERSES).
  - À la fin de l'étape d'entrevue post-expérience, les fichiers complets `session_PXX.json` et `summary_PXX.csv` se téléchargent automatiquement sur l'ordinateur utilisé (autorisez les téléchargements multiples si Chrome le demande), et des boutons sur l'écran final permettent aussi d'exporter toutes les sessions enregistrées dans ce navigateur (`all_sessions_complete_browser.json` et `all_participants_summary_browser.csv`).
  - Pour rassembler les logs collectés sur plusieurs ordinateurs dans [`data_output/csv/all_participants_summary.csv`](data_output/csv/all_participants_summary.csv), copiez vos `session_PXX.json` ou `all_sessions_complete_browser.json` dans `data_output/raw_json/` (ou passez leur dossier en argument) et exécutez :
    ```bash
    python3 merge_logs.py
    # ou directement depuis Téléchargements :
    python3 merge_logs.py ~/Downloads
    ```

*(Audio identique sur tout poste : les lectures TTS utilisent les fichiers MP3 pré-enregistrés de la voix `Amélie [fr-CA]` dans `code/audio/`, ce qui garantit exactement la même voix et le même rythme sur Mac, Windows et Linux.)*

---

## 2. Où Trouver et Modifier les Histoires et les Erreurs

Tous les textes et les fautes insérées sont centralisés dans un seul fichier :
👉 **[`code/build_experiment_data.py`](code/build_experiment_data.py)**

- Chaque histoire fait environ 300 mots et contient **6 erreurs insérées** (3 répétitions de mots + 3 fautes d'accord/grammaire).
- Pour modifier une histoire, ajouter ou changer une erreur, éditez directement le dictionnaire dans ce script Python.
- **Régénérer les données et les pistes audio :** Après toute modification, exécutez depuis la racine du dépôt :
   ```bash
   python3 code/build_experiment_data.py
   python3 code/build_audio_assets.py
   ```
   Cela met à jour `code/data/texts.json`, `code/data/data.js` et les fichiers MP3 dans `code/audio/` (nécessite macOS avec la voix `Amélie` et `ffmpeg`).

---

## 3. Parcours Guidé et Où Retrouver les Questions

- **Étape 1 — Consentement (FIC) (`#screen-consent`) :** Rappel obligatoire de faire signer le formulaire papier/PDF (`PXX`) et de préparer casque + dictaphone avant de continuer.
- **Étape 2 — Questionnaire pré-condition (`#screen-precondition`) :** Intégré dans **[`code/index.html`](code/index.html)** (âge, genre, aisance, habitudes de relecture).
- **Étape 3 — Calibration audio (`#screen-audio-calibration`) :** Test du volume et de la vitesse avec l'extrait `audio/calibration_test.mp3` avant l'entraînement.
- **Questions de compréhension des textes (3 questions par histoire) :** Définies dans **[`code/build_experiment_data.py`](code/build_experiment_data.py)** sous la clé `"quiz"`.
- **Évaluation subjective post-bloc (`#screen-rating`) :** Agréabilité et effort mental perçu sur échelles de Likert 1 à 5 après chaque texte.
- **Classement final (`#screen-ranking`) :** Ordre de préférence globale (1ère, 2e, 3e place), sans révéler les scores.
- **Entrevue post-expérience guidée (`#screen-interview-guide`) :** S'affiche après le classement (scores toujours masqués) pour rappeler le dictaphone et les 6 questions de **[`interview.md`](interview.md)** (avec panneau repliable optionnel pour notes écrites) avant la clôture et le téléchargement complet sur `#screen-finish`.

---

## 4. Où Sont Sauvegardées les Données

Toutes les données de passation sont automatiquement écrites dans le dossier :
👉 **[`data_output/`](data_output/)**

1. **Tableau consolidé CSV (pour vos analyses et graphiques) :**  
   - **[`data_output/csv/all_participants_summary.csv`](data_output/csv/all_participants_summary.csv)**  
   - Chaque participant y génère exactement 3 lignes (une par condition testée, sans doublon lors des sauvegardes intermédiaires). Ce fichier regroupe l'âge, les temps de relecture, les erreurs détectées (vrais positifs), les faux positifs, les faux négatifs, les scores de compréhension (quiz), l'agréabilité, l'effort perçu, le classement final et les notes d'entrevue.
2. **Fichier CSV individuel par participant :**  
   - **`data_output/csv/summary_PXX.csv`**
3. **Données brutes détaillées JSON :**  
   - **`data_output/raw_json/session_PXX.json`**  
   - Contient l'historique complet de la session, incluant chaque mot cliqué avec son horodatage précis à la milliseconde (`click_events`).

---

## 5. Comment Fonctionne le Carré Latin

L'application attribue automatiquement à chaque participant (`P01` à `P12`) la bonne combinaison de modalités (Lecture silencieuse, Lecture à voix haute, TTS bimodal) et de textes (T1, T2, T3) selon le fichier :
- **[`code/data/latin_square.json`](code/data/latin_square.json)** (généré via `python3 code/build_latin_square.py`)

L'expérimentateur a uniquement besoin d'entrer l'identifiant du participant (`P01` à `P12`) au départ, l'application s'occupe de tout le reste.
