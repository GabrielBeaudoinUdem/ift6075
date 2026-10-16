# Directives de l'Expérience

- **1. Accueil :** Installer le participant dans une pièce calme avec le poste prêt (ordinateur branché, souris externe et casque d'écoute).
- **2. Consentement :** Faire lire et signer le formulaire papier d'information et de consentement ([nagano/Formulaire_consentement.pdf](../nagano/Formulaire_consentement.pdf)).
- **3. Interface logicielle (Passation dans l'app) :** Lancer l'application (`http://localhost:8080`), entrer l'identifiant (`P01` à `P12`) et tester le son au casque.
  - *Profil initial :* Le participant remplit le court questionnaire pré-condition (âge, habitudes de lecture).
  - *Entraînement :* Pratique rapide sur un texte court pour se familiariser avec le clic sur les erreurs.
  - *Les 3 textes :* Il révise 3 textes (~300 mots) selon les 3 modalités (silencieuse, voix haute, TTS au casque). Il clique sur chaque mot jugé erroné (surligné en rouge).
  - *Évaluations après chaque texte :* Il évalue l'agréabilité et l'effort mental perçu (échelles de 1 à 5) et répond à 3 questions de compréhension de l'histoire.
- **4. Post-Interview :**
  - Le participant classe ses préférences (1ère, 2e, 3e place) sur l'écran dédié de classement (sans voir ses scores pour éviter tout biais) et clique sur « Valider mon classement ».
  - L'écran final présente la synthèse à l'expérimentateur. L'expérimentateur mène l'entrevue semi-dirigée à l'oral avec les 6 questions de [interview.md](interview.md) au dictaphone (et peut consigner ses notes directement dans l'interface si souhaité).
- **5. Clôture :** Vérifier que les données sont bien enregistrées (fichiers CSV et JSON archivés dans `data_output/`), puis remercier le participant.
