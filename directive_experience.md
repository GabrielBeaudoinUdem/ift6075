# Directives de l'Expérience

- **1. Accueil :** Installer le participant dans une pièce calme avec le poste prêt (Mac branché, souris externe et casque d'écoute).
- **2. Consentement :** Préparer le formulaire papier/PDF d'information et de consentement ([nagano/FIC_sans_surlignage.docx](../nagano/FIC_sans_surlignage.docx) ou [Protocol/materiels/Formulaire_Information_Consentement_FIC.docx](../Protocol/materiels/Formulaire_Information_Consentement_FIC.docx)). L'application vous le rappellera dès la première étape.
- **3. Interface logicielle (parcours guidé de bout en bout) :**
  - *En local (Mac) :* Double-cliquer sur [Lancer_Experience.command](Lancer_Experience.command) (ou lancer `python3 server.py` et ouvrir `http://localhost:8080`), vérifier que le bandeau vert *« Serveur local connecté »* est affiché.
  - *En ligne (GitHub Pages) :* Ouvrir l'URL publiée (bandeau bleu *« Mode en ligne »*), entrer l'identifiant (`P01` à `P12`).
  - *Étape 1 — Consentement (FIC) :* L'écran d'acceptation rappelle de faire signer le formulaire papier (code `PXX`) et de préparer casque + dictaphone avant de cocher la confirmation et cliquer sur *Suivant*.
  - *Étape 2 — Profil initial :* Le participant remplit directement dans l'app le questionnaire pré-condition (âge, genre, confort et habitudes de lecture).
  - *Étape 3 — Réglage audio :* Le participant ajuste le volume et la vitesse de la synthèse vocale (TTS pré-enregistrée `Amélie [fr-CA]`) au casque sur l'écran d'étalonnage.
  - *Entraînement :* Pratique rapide sur un texte court (65 mots, 2 erreurs) suivie de 2 questions d'exemple pour se familiariser avec l'interface.
  - *Les 3 textes :* Il révise 3 textes (~300 mots) selon les 3 modalités (silencieuse, voix haute, TTS au casque). Il clique sur chaque mot jugé erroné (surligné en rouge).
  - *Évaluations après chaque texte :* Le texte est masqué, le participant répond à 3 questions de compréhension de l'histoire, puis évalue l'agréabilité et l'effort mental perçu (échelles de 1 à 5).
- **4. Classement final & Post-Interview guidée :**
  - Le participant classe ses préférences (1ère, 2e, 3e place) sur l'écran dédié de classement (sans voir ses scores pour éviter tout biais) et clique sur « Valider mon classement ».
  - L'écran **Entrevue post-expérience** s'ouvre automatiquement (toujours sans révéler les scores) pour vous rappeler de démarrer le dictaphone et poser les 6 questions de [interview.md](interview.md) (avec possibilité optionnelle de saisir des notes écrites). Une fois l'entrevue cochée comme réalisée, cliquez sur **« Suivant — Terminer l'expérience et télécharger toutes les données »**.
- **5. Clôture :** Sur l'écran final, la checklist confirme que toutes les étapes sont complètes, les fichiers complets (`session_PXX.json` et `summary_PXX.csv`) sont sauvegardés/téléchargés automatiquement (avec bouton d'export global du navigateur si besoin), et l'encadré repliable **« Espace Expérimentateur »** permet de consulter les résultats détaillés.
