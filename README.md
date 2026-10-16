# Guide Rapide — Expérience IHM (IFT 6075)

Guide d'utilisation concis pour lancer l'expérience, modifier les textes ou les questions, et retrouver les données collectées.

---

## 1. Comment Lancer l'Expérience

1. Ouvrez un terminal dans le dossier `experience/` :
   ```bash
   cd experience
   ```
2. Démarrez le serveur local :
   - **Mac / Linux :** `python3 server.py`
   - **Windows :** `python server.py`
3. Ouvrez votre navigateur sur : **`http://localhost:8080`**

*(Note : L'application peut aussi tourner sans serveur en ouvrant directement `code/index.html` dans le navigateur. Dans ce cas, les fichiers CSV/JSON se téléchargent dans votre dossier Téléchargements à la fin).*

---

## 2. Où Trouver et Modifier les Histoires et les Erreurs

Tous les textes et les fautes insérées sont centralisés dans un seul fichier :
👉 **[`code/build_experiment_data.py`](code/build_experiment_data.py)**

- Chaque histoire fait environ 300 mots et contient **6 erreurs insérées** (3 répétitions de mots + 3 fautes d'accord/grammaire).
- Pour modifier une histoire, ajouter ou changer une erreur, éditez directement le dictionnaire dans ce script Python.
- **Régénérer les données :** Après toute modification, exécutez simplement :
   ```bash
   python3 code/build_experiment_data.py
   ```
   Cela met à jour instantanément les fichiers `code/data/texts.json` et `code/data/data.js`.

---

## 3. Où Retrouver les Questions

- **Questions de compréhension des textes (3 questions par histoire) :**  
  Définies directement dans **[`code/build_experiment_data.py`](code/build_experiment_data.py)** sous la clé `"quiz"`.
- **Questionnaire pré-condition (âge, genre, aisance, habitudes de relecture) :**  
  Intégré dans le premier écran de l'application (**[`code/index.html`](code/index.html)**, bloc `#screen-precondition`).
- **Évaluation subjective post-bloc (agréabilité et effort mental) :**  
  Intégrée après chaque texte dans **[`code/index.html`](code/index.html)**, bloc `#screen-rating` (deux échelles de Likert 1 à 5).
- **Classement final des préférences (1ère, 2e, 3e place) :**  
  Écran dédié indépendant (**[`code/index.html`](code/index.html)**, bloc `#screen-ranking`), sans affichage préalable des résultats pour éviter tout biais expérimental.
- **Questions de l'entrevue finale (6 questions officielles Nagano) :**  
  Listées dans **[`interview.md`](interview.md)** pour mener l'échange à l'oral avec dictaphone (avec un formulaire de consignation optionnel pour l'expérimentateur sur l'écran final `#screen-finish`).

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
