/**
 * IFT 6075 — Expérience Relecture & Modalités
 * Moteur d'expérimentation automatisé avec étalonnage audio et transitions pas-à-pas
 */

(function () {
  'use strict';

  // State
  let latinSquareData = null;
  let textsData = null;
  let selectedParticipant = null;
  let participantConfig = null;
  let includePractice = true;

  let currentBlockIndex = 0; // 0, 1, 2
  let currentStage = 'setup'; // 'setup', 'audioCalibration', 'practiceIntro', 'practice', 'practiceQuizIntro', 'practiceQuiz', 'practiceFinish', 'instruction', 'trial', 'trialQuizIntro', 'quiz', 'ratingIntro', 'rating', 'interblock', 'finish'

  let trialStartTime = null;
  let timerInterval = null;
  let selectedTokenIndices = new Set();
  let selectedPracticeIndices = new Set();
  let currentTrialClicks = [];
  let currentPracticeClicks = [];

  let ttsUtterance = null;
  let ttsVoices = [];
  let selectedVoice = null;
  let isTtsPaused = false;
  let currentTtsRate = 1.0;
  let currentTtsVolume = 1.0;

  // Session Results
  let sessionData = {
    participant_id: null,
    start_time: null,
    end_time: null,
    precondition: null,
    practice_results: null,
    trials: [],
    final_ranking: null,
    interview_answers: null
  };

  // DOM Screens
  const screens = {
    setup: document.getElementById('screen-setup'),
    precondition: document.getElementById('screen-precondition'),
    audioCalibration: document.getElementById('screen-audio-calibration'),
    practiceIntro: document.getElementById('screen-practice-intro'),
    practice: document.getElementById('screen-practice'),
    practiceQuizIntro: document.getElementById('screen-practice-quiz-intro'),
    practiceQuiz: document.getElementById('screen-practice-quiz'),
    practiceFinish: document.getElementById('screen-practice-finish'),
    instruction: document.getElementById('screen-instruction'),
    trial: document.getElementById('screen-trial'),
    trialQuizIntro: document.getElementById('screen-trial-quiz-intro'),
    quiz: document.getElementById('screen-quiz'),
    ratingIntro: document.getElementById('screen-rating-intro'),
    rating: document.getElementById('screen-rating'),
    interblock: document.getElementById('screen-interblock'),
    ranking: document.getElementById('screen-ranking'),
    finish: document.getElementById('screen-finish')
  };

  const headerParticipant = document.getElementById('header-participant');
  const headerStep = document.getElementById('header-step');
  const footerStatus = document.getElementById('footer-status');

  // Setup elements
  const selectParticipant = document.getElementById('select-participant');
  const setupDetails = document.getElementById('setup-details');
  const setupOrderList = document.getElementById('setup-order-list');
  const checkPractice = document.getElementById('check-practice');
  const btnStartExperiment = document.getElementById('btn-start-experiment');

  // Audio calibration elements
  const ttsVolumeSlider = document.getElementById('tts-volume-slider');
  const ttsVolumeVal = document.getElementById('tts-volume-val');
  const ttsSpeedSlider = document.getElementById('tts-speed-slider');
  const ttsSpeedVal = document.getElementById('tts-speed-val');
  const speedPresetsContainer = document.getElementById('speed-presets-container');
  const selectTtsVoice = document.getElementById('select-tts-voice');
  const btnTestTts = document.getElementById('btn-test-tts');
  const ttsTestStatus = document.getElementById('tts-test-status');
  const btnStartFromCalibration = document.getElementById('btn-start-from-calibration');

  // Practice elements
  const btnStartPracticeReading = document.getElementById('btn-start-practice-reading');
  const practiceTitle = document.getElementById('practice-title');
  const practiceReadingArea = document.getElementById('practice-reading-area');
  const practiceCounter = document.getElementById('practice-counter');
  const btnFinishPractice = document.getElementById('btn-finish-practice');
  const btnStartPracticeQuiz = document.getElementById('btn-start-practice-quiz');
  const practiceQuizForm = document.getElementById('practice-quiz-form');
  const practiceQuizContainer = document.getElementById('practice-quiz-container');
  const practiceDebriefStats = document.getElementById('practice-debrief-stats');
  const btnStartOfficialExperiment = document.getElementById('btn-start-official-experiment');

  // Instruction elements
  const instructionBlockIndicator = document.getElementById('instruction-block-indicator');
  const instructionConditionTitle = document.getElementById('instruction-condition-title');
  const instructionHeading = document.getElementById('instruction-heading');
  const instructionBody = document.getElementById('instruction-body');
  const instructionTtsNotice = document.getElementById('instruction-tts-notice');
  const btnLaunchTrial = document.getElementById('btn-launch-trial');

  // Trial elements
  const trialBlockTag = document.getElementById('trial-block-tag');
  const trialConditionTag = document.getElementById('trial-condition-tag');
  const trialTimer = document.getElementById('trial-timer');
  const ttsControlBar = document.getElementById('tts-control-bar');
  const ttsAudioIndicator = document.getElementById('tts-audio-indicator');
  const ttsAudioDetail = document.getElementById('tts-audio-detail');
  const ttsTrialSpeedBadge = document.getElementById('tts-trial-speed-badge');
  const btnTtsPause = document.getElementById('btn-tts-pause');
  const btnTtsRestart = document.getElementById('btn-tts-restart');
  const trialTextTitle = document.getElementById('trial-text-title');
  const trialReadingArea = document.getElementById('trial-reading-area');
  const trialCounter = document.getElementById('trial-counter');
  const btnFinishTrial = document.getElementById('btn-finish-trial');

  // Quiz elements
  const trialQuizIntroIndicator = document.getElementById('trial-quiz-intro-indicator');
  const btnStartTrialQuiz = document.getElementById('btn-start-trial-quiz');
  const quizBlockIndicator = document.getElementById('quiz-block-indicator');
  const trialQuizForm = document.getElementById('trial-quiz-form');
  const trialQuizContainer = document.getElementById('trial-quiz-container');

  // Rating elements
  const ratingIntroIndicator = document.getElementById('rating-intro-indicator');
  const ratingIntroTitle = document.getElementById('rating-intro-title');
  const btnStartRating = document.getElementById('btn-start-rating');
  const ratingBlockIndicator = document.getElementById('rating-block-indicator');
  const ratingConditionTitle = document.getElementById('rating-condition-title');
  const ratingForm = document.getElementById('rating-form');

  // Interblock pause elements
  const interblockStepIndicator = document.getElementById('interblock-step-indicator');
  const interblockTitle = document.getElementById('interblock-title');
  const interblockMessage = document.getElementById('interblock-message');
  const btnNextBlock = document.getElementById('btn-next-block');

  // Ranking & Finish elements
  const rankingForm = document.getElementById('ranking-form');
  const pref1 = document.getElementById('pref-1');
  const pref2 = document.getElementById('pref-2');
  const pref3 = document.getElementById('pref-3');
  const prefComments = document.getElementById('pref-comments');
  const rankingErrorMsg = document.getElementById('ranking-error-msg');
  const btnSaveRanking = document.getElementById('btn-save-ranking');
  const rankingRecapText = document.getElementById('ranking-recap-text');
  const summaryTableBody = document.getElementById('summary-table-body');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnResetSession = document.getElementById('btn-reset-session');

  // Interview elements (optional in-app notes)
  const intwQ1 = document.getElementById('intw-q1');
  const intwQ2 = document.getElementById('intw-q2');
  const intwQ3 = document.getElementById('intw-q3');
  const intwQ4 = document.getElementById('intw-q4');
  const intwQ5 = document.getElementById('intw-q5');
  const intwQ6 = document.getElementById('intw-q6');
  const btnSaveInterview = document.getElementById('btn-save-interview');
  const interviewSaveStatus = document.getElementById('interview-save-status');

  // ==========================================================
  // INITIALIZATION & DATA LOADING
  // ==========================================================
  async function init() {
    try {
      footerStatus.textContent = 'Chargement des données...';
      if (window.EMBEDDED_EXPERIMENT_DATA) {
        textsData = window.EMBEDDED_EXPERIMENT_DATA.texts;
        latinSquareData = window.EMBEDDED_EXPERIMENT_DATA.latin;
      } else {
        const [resTexts, resLatin] = await Promise.all([
          fetch('data/texts.json'),
          fetch('data/latin_square.json')
        ]);
        textsData = await resTexts.json();
        latinSquareData = await resLatin.json();
      }

      footerStatus.textContent = 'Prêt';
      initSpeechSynthesis();
      initEventListeners();
    } catch (err) {
      console.error('Erreur lors du chargement des fichiers JSON:', err);
      footerStatus.textContent = 'Erreur de chargement (veuillez vérifier les fichiers data/)';
    }
  }

  // ==========================================================
  // TTS (WEB SPEECH API)
  // ==========================================================
  function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      if (ttsTestStatus) ttsTestStatus.textContent = 'Synthèse vocale non supportée par ce navigateur.';
      return;
    }

    function populateVoices() {
      const allVoices = (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || [];

      // Filtrer toutes les voix françaises disponibles (cross-platform : Windows, Mac, Linux, ChromeOS)
      ttsVoices = allVoices.filter(v => {
        const lang = (v.lang || '').toLowerCase();
        return lang.startsWith('fr') || lang.includes('french');
      });

      // Si aucune voix fr n'est explicitement marquée par lang, chercher par nom
      if (ttsVoices.length === 0 && allVoices.length > 0) {
        ttsVoices = allVoices.filter(v => {
          const name = (v.name || '').toLowerCase();
          return name.includes('french') || name.includes('français') || name.includes('francais');
        });
      }

      // Tri intelligent : voix naturelles françaises en tête
      ttsVoices.sort((a, b) => {
        const getRank = (v) => {
          const n = (v.name || '').toLowerCase();
          const l = (v.lang || '').toLowerCase();
          if (n.includes('google')) return 1;
          if (l.includes('ca')) return 2; // Français Canada
          if (n.includes('thomas') || n.includes('amélie') || n.includes('amelie')) return 3;
          if (n.includes('paul') || n.includes('hortense') || n.includes('julie') || n.includes('mathieu')) return 4;
          if (l.startsWith('fr')) return 5;
          return 6;
        };
        return getRank(a) - getRank(b);
      });

      if (selectTtsVoice) {
        selectTtsVoice.innerHTML = '';
        if (ttsVoices.length === 0) {
          const opt = document.createElement('option');
          opt.value = 0;
          opt.textContent = "Voix française standard du système";
          selectTtsVoice.appendChild(opt);
          selectedVoice = null;
        } else {
          ttsVoices.forEach((voice, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            let label = voice.name;
            if (voice.lang) {
              label += ` [${voice.lang}]`;
            }
            opt.textContent = label;
            selectTtsVoice.appendChild(opt);
          });
          selectedVoice = ttsVoices[0];
        }
      }
    }

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    if (selectTtsVoice) {
      selectTtsVoice.addEventListener('change', () => {
        const idx = parseInt(selectTtsVoice.value, 10);
        selectedVoice = ttsVoices[idx] || null;
      });
    }

    if (btnTestTts) {
      btnTestTts.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        const testMsg = new SpeechSynthesisUtterance("Ceci est un test de synthèse vocale pour l'expérience IFT 6075. La vitesse et le volume sonore vous conviennent-ils ?");
        testMsg.lang = selectedVoice ? selectedVoice.lang : 'fr-CA';
        testMsg.rate = currentTtsRate;
        testMsg.volume = currentTtsVolume;
        if (selectedVoice) {
          testMsg.voice = selectedVoice;
        }
        if (ttsTestStatus) ttsTestStatus.textContent = 'Lecture en cours au casque...';
        testMsg.onend = () => {
          if (ttsTestStatus) ttsTestStatus.textContent = 'Test audio complété.';
        };
        testMsg.onerror = () => {
          if (ttsTestStatus) ttsTestStatus.textContent = 'Erreur lors de la lecture audio.';
        };
        window.speechSynthesis.speak(testMsg);
      });
    }
  }

  function updateTtsSpeed(newRate) {
    currentTtsRate = Math.round(parseFloat(newRate) * 100) / 100;

    // Mise à jour de l'affichage du curseur
    if (ttsSpeedSlider) ttsSpeedSlider.value = currentTtsRate;
    if (ttsSpeedVal) {
      let desc = 'Normal';
      if (currentTtsRate < 0.85) desc = 'Lent';
      else if (currentTtsRate < 0.98) desc = 'Modéré';
      else if (currentTtsRate === 1.0) desc = 'Normal';
      else if (currentTtsRate <= 1.15) desc = 'Dynamique';
      else if (currentTtsRate <= 1.35) desc = 'Rapide';
      else desc = 'Très rapide';
      ttsSpeedVal.textContent = `${currentTtsRate.toFixed(2).replace(/\.?0+$/, '')}x (${desc})`;
    }

    // Mise à jour visuelle des boutons de raccourci
    if (speedPresetsContainer) {
      speedPresetsContainer.querySelectorAll('.btn-speed-preset').forEach(btn => {
        const bSpeed = parseFloat(btn.dataset.speed);
        if (Math.abs(bSpeed - currentTtsRate) < 0.03) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Note: TTS speed is calibrated before trials to protect timing measurement validity
  }

  function updateTtsVolume(newVol) {
    currentTtsVolume = Math.round(parseFloat(newVol) * 100) / 100;
    if (ttsVolumeSlider) ttsVolumeSlider.value = currentTtsVolume;
    if (ttsVolumeVal) {
      ttsVolumeVal.textContent = `${Math.round(currentTtsVolume * 100)}%`;
    }
  }

  // Keep-alive heartbeat for Web Speech API in Chromium browsers on long texts
  let ttsKeepAliveTimer = null;
  function startTtsKeepAlive() {
    clearInterval(ttsKeepAliveTimer);
    ttsKeepAliveTimer = setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking && !isTtsPaused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }
  function stopTtsKeepAlive() {
    clearInterval(ttsKeepAliveTimer);
    ttsKeepAliveTimer = null;
  }

  function startTtsReading(text, onCompleteCallback) {
    stopTtsReading();
    if (!('speechSynthesis' in window)) return;

    ttsUtterance = new SpeechSynthesisUtterance(text);
    ttsUtterance.lang = selectedVoice ? selectedVoice.lang : 'fr-CA';
    ttsUtterance.rate = currentTtsRate;
    ttsUtterance.volume = currentTtsVolume;
    if (selectedVoice) {
      ttsUtterance.voice = selectedVoice;
    }

    ttsAudioIndicator.textContent = 'Lecture en cours';
    ttsAudioIndicator.className = 'tts-indicator playing';
    if (ttsAudioDetail) ttsAudioDetail.textContent = `Synthèse vocale active (${currentTtsRate}x)`;
    if (ttsTrialSpeedBadge) ttsTrialSpeedBadge.textContent = `Vitesse : ${currentTtsRate.toFixed(2).replace(/\.?0+$/, '')}x`;
    btnTtsPause.textContent = 'Pause';
    isTtsPaused = false;

    ttsUtterance.onend = () => {
      stopTtsKeepAlive();
      ttsAudioIndicator.textContent = 'Terminé';
      ttsAudioIndicator.className = 'tts-indicator';
      if (ttsAudioDetail) ttsAudioDetail.textContent = 'Lecture audio terminée. Vous pouvez poursuivre ou valider.';
      btnTtsPause.textContent = 'Pause';
      if (onCompleteCallback) onCompleteCallback();
    };

    ttsUtterance.onerror = (e) => {
      stopTtsKeepAlive();
      console.warn('TTS Error:', e);
      ttsAudioIndicator.textContent = 'Arrêté';
      ttsAudioIndicator.className = 'tts-indicator';
    };

    window.speechSynthesis.speak(ttsUtterance);
    startTtsKeepAlive();
  }

  function stopTtsReading() {
    stopTtsKeepAlive();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    ttsUtterance = null;
    isTtsPaused = false;
    if (ttsAudioIndicator) {
      ttsAudioIndicator.textContent = 'Arrêté';
      ttsAudioIndicator.className = 'tts-indicator';
    }
  }

  // ==========================================================
  // NAVIGATION & SCREEN SWITCHING
  // ==========================================================
  function showScreen(screenKey) {
    Object.values(screens).forEach(sc => {
      if (sc) sc.classList.remove('active');
    });
    if (screens[screenKey]) {
      screens[screenKey].classList.add('active');
      currentStage = screenKey;
      window.scrollTo(0, 0);
    }
    updateHeader();
  }

  function updateHeader() {
    if (selectedParticipant) {
      headerParticipant.textContent = `Participant : ${selectedParticipant}`;
    } else {
      headerParticipant.textContent = 'Aucun participant';
    }

    switch (currentStage) {
      case 'setup':
        headerStep.textContent = 'Configuration';
        break;
      case 'precondition':
        headerStep.textContent = 'Questionnaire Pré-Condition';
        break;
      case 'audioCalibration':
        headerStep.textContent = 'Accueil & Réglages audio';
        break;
      case 'practiceIntro':
      case 'practice':
      case 'practiceQuizIntro':
      case 'practiceQuiz':
      case 'practiceFinish':
        headerStep.textContent = 'Entraînement';
        break;
      case 'instruction':
      case 'trial':
      case 'trialQuizIntro':
      case 'quiz':
      case 'ratingIntro':
      case 'rating':
        headerStep.textContent = `Bloc ${currentBlockIndex + 1} / 3`;
        break;
      case 'interblock':
        headerStep.textContent = `Pause (Bloc ${currentBlockIndex + 1} / 3)`;
        break;
      case 'ranking':
        headerStep.textContent = 'Classement des préférences';
        break;
      case 'finish':
        headerStep.textContent = 'Synthèse expérimentateur & Export';
        break;
      default:
        headerStep.textContent = '';
        break;
    }
  }

  // ==========================================================
  // EVENT LISTENERS SETUP
  // ==========================================================
  function initEventListeners() {
    // 1. Participant Selection in Setup
    selectParticipant.addEventListener('change', () => {
      const pid = selectParticipant.value;
      if (!pid) {
        selectedParticipant = null;
        participantConfig = null;
        setupDetails.classList.add('hidden');
        btnStartExperiment.disabled = true;
        return;
      }

      selectedParticipant = pid;
      participantConfig = latinSquareData.participants.find(p => p.participant_id === pid);

      if (participantConfig) {
        setupOrderList.innerHTML = '';
        participantConfig.condition_order.forEach((condCode, idx) => {
          const cond = latinSquareData.conditions[condCode];
          const textId = participantConfig.text_order[idx];
          const textDoc = textsData.texts.find(t => t.id === textId);
          const li = document.createElement('li');
          li.innerHTML = `<strong>Bloc ${idx + 1} :</strong> ${cond.name} (<em>Texte : ${textDoc ? textDoc.title : textId}</em>)`;
          setupOrderList.appendChild(li);
        });
        setupDetails.classList.remove('hidden');
        btnStartExperiment.disabled = false;
      }
    });

    // 2. From Setup to Precondition Questionnaire Screen
    btnStartExperiment.addEventListener('click', () => {
      if (!selectedParticipant || !participantConfig) return;

      includePractice = checkPractice.checked;
      sessionData.participant_id = selectedParticipant;
      sessionData.start_time = new Date().toISOString();
      sessionData.trials = [];
      currentBlockIndex = 0;

      showScreen('precondition');
    });

    // 2b. From Precondition Form to Audio Calibration Screen
    const preconditionForm = document.getElementById('precondition-form');
    if (preconditionForm) {
      preconditionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ageVal = document.getElementById('precond-age').value;
        const genreVal = preconditionForm.querySelector('input[name="precond-genre"]:checked');
        const confFrVal = preconditionForm.querySelector('input[name="precond-confort-fr"]:checked');
        const confRevVal = preconditionForm.querySelector('input[name="precond-confort-rev"]:checked');
        const freqLecVal = preconditionForm.querySelector('input[name="precond-freq-lecture"]:checked');

        sessionData.precondition = {
          age: parseInt(ageVal, 10),
          genre: genreVal ? genreVal.value : '',
          confort_francais: confFrVal ? parseInt(confFrVal.value, 10) : null,
          confort_revision: confRevVal ? parseInt(confRevVal.value, 10) : null,
          frequence_lecture: freqLecVal ? parseInt(freqLecVal.value, 10) : null
        };

        autoSaveSession();
        showScreen('audioCalibration');
      });
    }

    // 3. Audio Calibration Controls
    if (ttsVolumeSlider) {
      ttsVolumeSlider.addEventListener('input', (e) => {
        updateTtsVolume(e.target.value);
      });
    }

    if (ttsSpeedSlider) {
      ttsSpeedSlider.addEventListener('input', (e) => {
        updateTtsSpeed(e.target.value);
      });
    }

    if (speedPresetsContainer) {
      speedPresetsContainer.querySelectorAll('.btn-speed-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          const speed = parseFloat(btn.dataset.speed);
          updateTtsSpeed(speed);
        });
      });
    }

    // 4. Start Button from Audio Calibration
    btnStartFromCalibration.addEventListener('click', () => {
      stopTtsReading();
      if (includePractice) {
        showScreen('practiceIntro');
      } else {
        startBlockInstruction(0);
      }
    });

    // 5. Practice Intro -> Practice Reading
    if (btnStartPracticeReading) {
      btnStartPracticeReading.addEventListener('click', () => {
        startPracticeReading();
      });
    }

    // 6. Finish Practice Reading -> Practice Quiz Intro
    btnFinishPractice.addEventListener('click', () => {
      finishPracticeReading();
    });

    // 7. Practice Quiz Intro -> Practice Quiz Form
    if (btnStartPracticeQuiz) {
      btnStartPracticeQuiz.addEventListener('click', () => {
        showScreen('practiceQuiz');
      });
    }

    // 8. Practice Quiz Submit -> Practice Debrief Screen
    practiceQuizForm.addEventListener('submit', (e) => {
      e.preventDefault();
      validatePracticeQuiz();
    });

    // 9. Practice Finish Screen -> Start Official Experiment
    if (btnStartOfficialExperiment) {
      btnStartOfficialExperiment.addEventListener('click', () => {
        startBlockInstruction(0);
      });
    }

    // 10. Instruction Screen -> Launch Trial Reading
    btnLaunchTrial.addEventListener('click', () => {
      launchTrial(currentBlockIndex);
    });

    // 11. TTS Pause / Resume Button
    btnTtsPause.addEventListener('click', () => {
      if (!('speechSynthesis' in window)) return;
      if (isTtsPaused) {
        window.speechSynthesis.resume();
        isTtsPaused = false;
        btnTtsPause.textContent = 'Pause';
        ttsAudioIndicator.textContent = 'Lecture en cours';
        ttsAudioIndicator.className = 'tts-indicator playing';
        if (ttsAudioDetail) ttsAudioDetail.textContent = `Synthèse vocale active (${currentTtsRate}x)`;
      } else {
        window.speechSynthesis.pause();
        isTtsPaused = true;
        btnTtsPause.textContent = 'Reprendre';
        ttsAudioIndicator.textContent = 'En pause';
        ttsAudioIndicator.className = 'tts-indicator paused';
        if (ttsAudioDetail) ttsAudioDetail.textContent = 'Audio suspendu (cliquez sur Reprendre pour continuer)';
      }
    });

    // 13. TTS Restart Button
    btnTtsRestart.addEventListener('click', () => {
      const textId = participantConfig.text_order[currentBlockIndex];
      const textDoc = textsData.texts.find(t => t.id === textId);
      if (textDoc) {
        startTtsReading(textDoc.rawText);
      }
    });

    // 14. Finish Trial Reading -> Trial Quiz Intro
    btnFinishTrial.addEventListener('click', () => {
      finishTrialReading();
    });

    // 15. Trial Quiz Intro -> Trial Quiz Screen
    if (btnStartTrialQuiz) {
      btnStartTrialQuiz.addEventListener('click', () => {
        showScreen('quiz');
      });
    }

    // 16. Trial Quiz Submit -> Rating Intro Screen
    trialQuizForm.addEventListener('submit', (e) => {
      e.preventDefault();
      validateTrialQuiz();
    });

    // 17. Rating Intro -> Rating Form Screen
    if (btnStartRating) {
      btnStartRating.addEventListener('click', () => {
        showScreen('rating');
      });
    }

    // 18. Rating Form Submit -> Inter-block Pause OR Finish Screen
    ratingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      validateTrialRating();
    });

    // 19. Interblock Pause -> Next Block Instruction
    if (btnNextBlock) {
      btnNextBlock.addEventListener('click', () => {
        currentBlockIndex++;
        startBlockInstruction(currentBlockIndex);
      });
    }

    // 20. Final Ranking Form Submit
    if (rankingForm) {
      rankingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveFinalRanking(e);
      });
    } else if (btnSaveRanking) {
      btnSaveRanking.addEventListener('click', (e) => {
        saveFinalRanking(e);
      });
    }

    // 20b. Interview Notes Save (Optional Experimenter Form)
    if (btnSaveInterview) {
      btnSaveInterview.addEventListener('click', () => {
        saveInterviewNotes();
      });
    }

    // 21. Download JSON
    btnDownloadJson.addEventListener('click', () => {
      downloadJsonData();
    });

    // 22. Download CSV
    btnDownloadCsv.addEventListener('click', () => {
      downloadCsvData();
    });

    // 23. Reset Session
    btnResetSession.addEventListener('click', () => {
      if (confirm("Êtes-vous sûr de vouloir commencer une nouvelle session ? Assurez-vous d'avoir téléchargé les données.")) {
        resetSession();
      }
    });
  }

  // ==========================================================
  // PRACTICE WORKFLOW
  // ==========================================================
  function startPracticeReading() {
    const practiceDoc = textsData.texts.find(t => t.id === 'practice');
    if (!practiceDoc) {
      console.warn("Texte d'entraînement introuvable, passage au bloc 1.");
      startBlockInstruction(0);
      return;
    }

    selectedPracticeIndices.clear();
    currentPracticeClicks = [];
    practiceTitle.textContent = practiceDoc.title;
    renderTextTokens(practiceDoc, practiceReadingArea, selectedPracticeIndices, (count) => {
      practiceCounter.textContent = `${count} mot${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
    });

    practiceCounter.textContent = '0 mot sélectionné';
    trialStartTime = performance.now();
    showScreen('practice');
  }

  function finishPracticeReading() {
    trialStartTime = null;
    const practiceDoc = textsData.texts.find(t => t.id === 'practice');
    const detectedErrorIds = new Set();
    const detectedErrorsList = [];
    const falsePositivesList = [];

    selectedPracticeIndices.forEach(idx => {
      const tok = practiceDoc.tokens[idx];
      if (!tok) return;

      if (tok.is_error && tok.error_id) {
        if (!detectedErrorIds.has(tok.error_id)) {
          detectedErrorIds.add(tok.error_id);
          detectedErrorsList.push({
            error_id: tok.error_id,
            index: tok.index,
            word: tok.raw
          });
        }
      } else {
        falsePositivesList.push({
          index: tok.index,
          word: tok.raw
        });
      }
    });

    const totalErrors = practiceDoc.errorCount || 2;
    const tp = detectedErrorIds.size;
    const fp = falsePositivesList.length;

    sessionData.practice_results = {
      selected_count: selectedPracticeIndices.size,
      true_positives: tp,
      false_positives: fp,
      false_negatives: Math.max(0, totalErrors - tp),
      total_errors: totalErrors,
      detected_errors: detectedErrorsList,
      false_positives_list: falsePositivesList,
      click_events: [...currentPracticeClicks]
    };

    // Render practice quiz questions and prepare intro screen
    renderQuizForm(practiceDoc.quiz, practiceQuizContainer);
    showScreen('practiceQuizIntro');
  }

  function validatePracticeQuiz() {
    const practiceDoc = textsData.texts.find(t => t.id === 'practice');
    let quizScore = 0;
    practiceDoc.quiz.forEach((q, qIdx) => {
      const selected = practiceQuizForm.querySelector(`input[name="quiz_q_${qIdx}"]:checked`);
      if (selected && parseInt(selected.value, 10) === q.correct_index) {
        quizScore++;
      }
    });

    sessionData.practice_results.quiz_score = quizScore;
    sessionData.practice_results.quiz_total = practiceDoc.quiz.length;

    // Populate debrief stats screen smoothly without alerts
    if (practiceDebriefStats) {
      practiceDebriefStats.innerHTML = `
        <ul style="padding-left: 20px; line-height: 1.8; margin-top: 8px;">
          <li><strong>Erreurs d'entraînement repérées :</strong> ${sessionData.practice_results.true_positives} / ${sessionData.practice_results.total_errors}</li>
          <li><strong>Faux positifs (mots corrects sélectionnés par erreur) :</strong> ${sessionData.practice_results.false_positives}</li>
          <li><strong>Score au questionnaire de compréhension :</strong> ${quizScore} / ${practiceDoc.quiz.length}</li>
        </ul>
      `;
    }

    showScreen('practiceFinish');
  }

  // ==========================================================
  // TRIAL WORKFLOW (INSTRUCTION -> READING -> QUIZ -> RATING)
  // ==========================================================
  function startBlockInstruction(blockIdx) {
    currentBlockIndex = blockIdx;
    const condCode = participantConfig.condition_order[blockIdx];
    const cond = latinSquareData.conditions[condCode];

    instructionBlockIndicator.textContent = `Bloc ${blockIdx + 1} sur 3 — Consignes`;
    instructionConditionTitle.textContent = cond.name;
    instructionHeading.textContent = `Consigne pour la ${cond.name} :`;
    instructionBody.textContent = cond.instructions;

    if (cond.tts_active) {
      instructionTtsNotice.classList.remove('hidden');
    } else {
      instructionTtsNotice.classList.add('hidden');
    }

    showScreen('instruction');
  }

  function launchTrial(blockIdx) {
    const condCode = participantConfig.condition_order[blockIdx];
    const cond = latinSquareData.conditions[condCode];
    const textId = participantConfig.text_order[blockIdx];
    const textDoc = textsData.texts.find(t => t.id === textId);

    if (!textDoc) {
      alert(`Erreur : texte ${textId} introuvable.`);
      return;
    }

    selectedTokenIndices.clear();
    currentTrialClicks = [];

    trialBlockTag.textContent = `Bloc ${blockIdx + 1}/3`;
    trialConditionTag.textContent = cond.name;
    trialTextTitle.textContent = textDoc.title;
    trialCounter.textContent = '0 mot sélectionné';

    if (ttsTrialSpeedBadge) {
      ttsTrialSpeedBadge.textContent = `Vitesse : ${currentTtsRate.toFixed(2).replace(/\.?0+$/, '')}x`;
    }

    // Render interactive clickable tokens
    renderTextTokens(textDoc, trialReadingArea, selectedTokenIndices, (count) => {
      trialCounter.textContent = `${count} mot${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
    });

    // TTS Setup
    if (cond.tts_active) {
      ttsControlBar.classList.remove('hidden');
      startTtsReading(textDoc.rawText);
    } else {
      ttsControlBar.classList.add('hidden');
      stopTtsReading();
    }

    // High precision timer start
    trialStartTime = performance.now();
    startTimerDisplay();

    showScreen('trial');
  }

  function startTimerDisplay() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!trialStartTime) return;
      const elapsedMs = performance.now() - trialStartTime;
      const totalSec = Math.floor(elapsedMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      trialTimer.textContent = `Temps : ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }, 500);
  }

  function stopTimerDisplay() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function finishTrialReading() {
    stopTimerDisplay();
    stopTtsReading();

    const elapsedSeconds = ((performance.now() - trialStartTime) / 1000).toFixed(2);
    trialStartTime = null;
    const condCode = participantConfig.condition_order[currentBlockIndex];
    const cond = latinSquareData.conditions[condCode];
    const textId = participantConfig.text_order[currentBlockIndex];
    const textDoc = textsData.texts.find(t => t.id === textId);

    // Compute error detection metrics grouping by error_id
    const detectedErrorIds = new Set();
    const detectedErrorsList = [];
    const falsePositivesList = [];

    selectedTokenIndices.forEach(idx => {
      const tok = textDoc.tokens[idx];
      if (!tok) return;

      if (tok.is_error && tok.error_id) {
        if (!detectedErrorIds.has(tok.error_id)) {
          detectedErrorIds.add(tok.error_id);
          detectedErrorsList.push({
            error_id: tok.error_id,
            first_clicked_index: tok.index,
            word: tok.raw,
            error_type: tok.error_data ? tok.error_data.error_type : 'unknown',
            error_subtype: tok.error_data ? tok.error_data.error_subtype : '',
            explanation: tok.error_data ? tok.error_data.explanation : ''
          });
        }
        // If already in detectedErrorIds, it is a click on another acceptable word of the same error
        // (e.g. 2nd word of "pour pour" or "travaillé" in "a travaillé") -> NOT a false positive.
      } else {
        falsePositivesList.push({
          index: tok.index,
          word: tok.raw
        });
      }
    });

    const totalErrors = textDoc.errorCount || 6;
    const truePositives = detectedErrorIds.size;
    const falsePositives = falsePositivesList.length;
    const falseNegatives = Math.max(0, totalErrors - truePositives);
    const detectionRate = totalErrors > 0 ? ((truePositives / totalErrors) * 100).toFixed(1) : '0.0';

    // Record initial trial object
    const trialRecord = {
      block_index: currentBlockIndex + 1,
      condition_code: condCode,
      condition_name: cond.name,
      tts_rate: cond.tts_active ? currentTtsRate : null,
      tts_volume: cond.tts_active ? currentTtsVolume : null,
      text_id: textId,
      text_title: textDoc.title,
      reading_time_seconds: parseFloat(elapsedSeconds),
      total_words: textDoc.wordCount,
      total_errors: totalErrors,
      selected_tokens_count: selectedTokenIndices.size,
      true_positives: truePositives,
      false_positives: falsePositives,
      false_negatives: falseNegatives,
      detection_rate_percent: parseFloat(detectionRate),
      detected_errors: detectedErrorsList,
      false_positives_list: falsePositivesList,
      click_events: [...currentTrialClicks],
      quiz_score: 0,
      quiz_total: 3,
      quiz_answers: [],
      agreabilite: null,
      effort: null,
      comments: ''
    };

    sessionData.trials[currentBlockIndex] = trialRecord;
    autoSaveSession();

    // Prepare Quiz Screen and Transition
    if (trialQuizIntroIndicator) {
      trialQuizIntroIndicator.textContent = `Bloc ${currentBlockIndex + 1} sur 3 — Relecture terminée (${cond.name})`;
    }
    quizBlockIndicator.textContent = `Bloc ${currentBlockIndex + 1} sur 3 — Quiz de rétention (${cond.name})`;
    renderQuizForm(textDoc.quiz, trialQuizContainer);
    
    // Smooth transition screen before quiz
    showScreen('trialQuizIntro');
  }

  function validateTrialQuiz() {
    const textId = participantConfig.text_order[currentBlockIndex];
    const textDoc = textsData.texts.find(t => t.id === textId);
    let quizScore = 0;
    const answersList = [];

    textDoc.quiz.forEach((q, qIdx) => {
      const selected = trialQuizForm.querySelector(`input[name="quiz_q_${qIdx}"]:checked`);
      const val = selected ? parseInt(selected.value, 10) : null;
      const isCorrect = (val === q.correct_index);
      if (isCorrect) quizScore++;
      answersList.push({
        question_id: q.id,
        selected_index: val,
        correct_index: q.correct_index,
        is_correct: isCorrect
      });
    });

    sessionData.trials[currentBlockIndex].quiz_score = quizScore;
    sessionData.trials[currentBlockIndex].quiz_total = textDoc.quiz.length;
    sessionData.trials[currentBlockIndex].quiz_answers = answersList;
    autoSaveSession();

    // Prepare Rating Transition Screen
    const condCode = participantConfig.condition_order[currentBlockIndex];
    const cond = latinSquareData.conditions[condCode];

    if (ratingIntroIndicator) {
      ratingIntroIndicator.textContent = `Bloc ${currentBlockIndex + 1} sur 3 — Évaluation subjective`;
    }
    if (ratingIntroTitle) {
      ratingIntroTitle.textContent = `Vos impressions sur : ${cond.name}`;
    }

    ratingBlockIndicator.textContent = `Bloc ${currentBlockIndex + 1} sur 3 — Évaluation subjective`;
    if (ratingConditionTitle) {
      ratingConditionTitle.textContent = `Évaluation : ${cond.name}`;
    }
    if (ratingForm && typeof ratingForm.reset === 'function') {
      ratingForm.reset();
    }

    showScreen('ratingIntro');
  }

  function validateTrialRating() {
    const agreabiliteVal = ratingForm.querySelector('input[name="agreabilite"]:checked');
    const effortVal = ratingForm.querySelector('input[name="effort"]:checked');
    const commentsVal = document.getElementById('rating-comments').value.trim();

    sessionData.trials[currentBlockIndex].agreabilite = parseInt(agreabiliteVal.value, 10);
    sessionData.trials[currentBlockIndex].effort = parseInt(effortVal.value, 10);
    sessionData.trials[currentBlockIndex].comments = commentsVal;
    autoSaveSession();

    // Check if more blocks remain
    if (currentBlockIndex < 2) {
      // Show Inter-block Pause Screen
      if (interblockStepIndicator) {
        interblockStepIndicator.textContent = `Pause entre les blocs (${currentBlockIndex + 1} / 3)`;
      }
      if (interblockTitle) {
        interblockTitle.textContent = `Bloc ${currentBlockIndex + 1} sur 3 complété !`;
      }
      if (interblockMessage) {
        interblockMessage.textContent = `Lorsque vous êtes prêt à continuer vers le bloc ${currentBlockIndex + 2}, cliquez ci-dessous pour découvrir la nouvelle modalité.`;
      }
      if (btnNextBlock) {
        btnNextBlock.textContent = `Passer au bloc ${currentBlockIndex + 2}`;
      }
      showScreen('interblock');
    } else {
      // Finished all 3 blocks -> Go to Participant Ranking Screen first (no results shown)
      sessionData.end_time = new Date().toISOString();
      autoSaveSession();
      goToRankingScreen();
    }
  }

  // ==========================================================
  // FINAL RANKING & EXPORT WORKFLOW
  // ==========================================================
  function goToRankingScreen() {
    if (rankingForm && typeof rankingForm.reset === 'function') {
      rankingForm.reset();
    }
    if (pref1) pref1.value = '';
    if (pref2) pref2.value = '';
    if (pref3) pref3.value = '';
    if (prefComments) prefComments.value = '';
    if (rankingErrorMsg) rankingErrorMsg.classList.add('hidden');
    showScreen('ranking');
  }

  function saveFinalRanking(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const r1 = pref1 ? pref1.value : '';
    const r2 = pref2 ? pref2.value : '';
    const r3 = pref3 ? pref3.value : '';
    const comment = prefComments ? prefComments.value.trim() : '';

    if (!r1 || !r2 || !r3) {
      if (rankingErrorMsg) {
        rankingErrorMsg.textContent = "Veuillez choisir une modalité pour chacune des trois places (1ère, 2e et 3e place).";
        rankingErrorMsg.classList.remove('hidden');
      }
      return;
    }

    if (r1 === r2 || r1 === r3 || r2 === r3) {
      if (rankingErrorMsg) {
        rankingErrorMsg.textContent = "Attention : chaque place (1ère, 2e, 3e) doit avoir une modalité différente.";
        rankingErrorMsg.classList.remove('hidden');
      }
      return;
    }

    if (rankingErrorMsg) rankingErrorMsg.classList.add('hidden');

    sessionData.final_ranking = {
      rank_1: r1,
      rank_2: r2,
      rank_3: r3,
      comment: comment
    };
    sessionData.end_time = new Date().toISOString();

    const conditionLabels = {
      SIL: 'Lecture silencieuse',
      HAUTE: 'Lecture à voix haute',
      TTS: 'TTS bimodal (synthèse vocale + écran)'
    };

    if (rankingRecapText) {
      rankingRecapText.innerHTML = `
        <strong>1ère place :</strong> ${conditionLabels[r1] || r1} &nbsp;|&nbsp;
        <strong>2e place :</strong> ${conditionLabels[r2] || r2} &nbsp;|&nbsp;
        <strong>3e place :</strong> ${conditionLabels[r3] || r3}
        ${comment ? `<br><span style="color:#555; display:inline-block; margin-top:5px;">Commentaire du participant : <em>« ${comment} »</em></span>` : ''}
      `;
    }

    autoSaveSession();
    renderSummaryTable();
    showScreen('finish');
  }

  function saveInterviewNotes() {
    sessionData.interview_answers = {
      q1_habitudes: intwQ1 ? intwQ1.value.trim() : '',
      q2_usage_tts_passe: intwQ2 ? intwQ2.value.trim() : '',
      q3_avantages_inconvenients: intwQ3 ? intwQ3.value.trim() : '',
      q4_demarquee: intwQ4 ? intwQ4.value.trim() : '',
      q5_difficulte_textes: intwQ5 ? intwQ5.value.trim() : '',
      q6_ajout_remarques: intwQ6 ? intwQ6.value.trim() : ''
    };
    autoSaveSession();
    if (interviewSaveStatus) {
      interviewSaveStatus.textContent = "Notes d'entrevue enregistrées avec succès dans le CSV et JSON.";
      setTimeout(() => {
        interviewSaveStatus.textContent = '';
      }, 4000);
    }
  }

  function renderSummaryTable() {
    summaryTableBody.innerHTML = '';
    sessionData.trials.forEach(trial => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>Bloc ${trial.block_index}</strong></td>
        <td>${trial.condition_name} (${trial.condition_code})</td>
        <td>${trial.text_id}</td>
        <td>${(typeof trial.reading_time_seconds === 'number' ? trial.reading_time_seconds : parseFloat(trial.reading_time_seconds || 0)).toFixed(1)} s</td>
        <td><strong>${trial.true_positives}</strong> / ${trial.total_errors}</td>
        <td>${trial.false_positives}</td>
        <td>${trial.detection_rate_percent}%</td>
        <td>${trial.quiz_score} / ${trial.quiz_total}</td>
        <td>${trial.agreabilite || '-'} / 5</td>
        <td>${trial.effort || '-'} / 5</td>
      `;
      summaryTableBody.appendChild(tr);
    });
  }

  async function autoSaveSession() {
    try {
      if (selectedParticipant) {
        // 1. Sauvegarde locale dans le navigateur
        localStorage.setItem(`IFT6075_${selectedParticipant}`, JSON.stringify(sessionData));

        const allKey = 'IFT6075_ALL_PARTICIPANTS';
        let allLog = {};
        try {
          allLog = JSON.parse(localStorage.getItem(allKey)) || {};
        } catch (_) {}
        allLog[selectedParticipant] = sessionData;
        localStorage.setItem(allKey, JSON.stringify(allLog));

        // 2. Envoi automatique au serveur local pour écriture disque dans data_output/
        try {
          const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
          });
          if (res.ok) {
            const data = await res.json();
            footerStatus.textContent = `Sauvegarde automatique OK : ${data.json_file}`;
          }
        } catch (_) {
          // Mode autonome hors serveur (file:///)
          footerStatus.textContent = `Sauvegarde locale OK (${selectedParticipant})`;
        }
      }
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde:', e);
    }
  }

  function downloadJsonData() {
    const filename = `session_${sessionData.participant_id || 'PXX'}.json`;
    const jsonStr = JSON.stringify(sessionData, null, 2);
    downloadBlob(jsonStr, filename, 'application/json');
  }

  function downloadCsvData() {
    const headers = [
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
    ];

    const rows = [];
    rows.push(headers.join(';'));

    const pre = sessionData.precondition || {};
    const rank = sessionData.final_ranking || {};
    const intw = sessionData.interview_answers || {};
    const saveTime = new Date().toISOString();

    sessionData.trials.forEach(trial => {
      const escape = (val) => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
      const row = [
        escape(sessionData.participant_id),
        pre.age || '',
        escape(pre.genre),
        pre.confort_francais || '',
        pre.confort_revision || '',
        pre.frequence_lecture || '',
        trial.block_index,
        escape(trial.condition_code),
        escape(trial.condition_name),
        trial.tts_rate || '',
        trial.tts_volume || '',
        escape(trial.text_id),
        trial.reading_time_seconds,
        trial.total_words,
        trial.total_errors,
        trial.true_positives,
        trial.false_positives,
        trial.false_negatives,
        trial.detection_rate_percent,
        trial.quiz_score,
        trial.quiz_total,
        trial.agreabilite || '',
        trial.effort || '',
        escape(trial.comments),
        escape(rank.rank_1),
        escape(rank.rank_2),
        escape(rank.rank_3),
        escape(rank.comment),
        escape(intw.q1_habitudes),
        escape(intw.q2_usage_tts_passe),
        escape(intw.q3_avantages_inconvenients),
        escape(intw.q4_demarquee),
        escape(intw.q5_difficulte_textes),
        escape(intw.q6_ajout_remarques),
        saveTime
      ];
      rows.push(row.join(';'));
    });

    const csvContent = "\uFEFF" + rows.join('\r\n'); // UTF-8 BOM for Excel compatibility
    const filename = `summary_${sessionData.participant_id || 'PXX'}.csv`;
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function resetSession() {
    stopTimerDisplay();
    stopTtsReading();
    selectedParticipant = null;
    participantConfig = null;
    currentBlockIndex = 0;
    trialStartTime = null;
    currentTrialClicks = [];
    currentPracticeClicks = [];
    sessionData = {
      participant_id: null,
      start_time: null,
      end_time: null,
      precondition: null,
      practice_results: null,
      trials: [],
      final_ranking: null,
      interview_answers: null
    };
    selectParticipant.value = '';
    setupDetails.classList.add('hidden');
    btnStartExperiment.disabled = true;

    if (document.getElementById('precondition-form')) {
      document.getElementById('precondition-form').reset();
    }
    if (rankingForm && typeof rankingForm.reset === 'function') {
      rankingForm.reset();
    }
    if (prefComments) prefComments.value = '';
    if (rankingRecapText) rankingRecapText.textContent = '';
    if (intwQ1) intwQ1.value = '';
    if (intwQ2) intwQ2.value = '';
    if (intwQ3) intwQ3.value = '';
    if (intwQ4) intwQ4.value = '';
    if (intwQ5) intwQ5.value = '';
    if (intwQ6) intwQ6.value = '';
    if (interviewSaveStatus) interviewSaveStatus.textContent = '';

    showScreen('setup');
  }

  // ==========================================================
  // HELPER RENDERING FUNCTIONS
  // ==========================================================
  function renderTextTokens(doc, containerElement, selectionSet, onCountChange) {
    containerElement.innerHTML = '';
    doc.tokens.forEach(tok => {
      const span = document.createElement('span');
      span.className = 'word-token';
      span.textContent = tok.raw;
      span.dataset.index = tok.index;

      if (selectionSet.has(tok.index)) {
        span.classList.add('selected');
      }

      span.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasSelected = selectionSet.has(tok.index);
        if (wasSelected) {
          selectionSet.delete(tok.index);
          span.classList.remove('selected');
        } else {
          selectionSet.add(tok.index);
          span.classList.add('selected');
        }

        // Millisecond precision click event logging
        const clickEvent = {
          timestamp_iso: new Date().toISOString(),
          timestamp_ms: Date.now(),
          relative_time_ms: trialStartTime ? Math.max(0, Math.round(performance.now() - trialStartTime)) : null,
          token_index: tok.index,
          word: tok.raw,
          action: wasSelected ? 'deselect' : 'select',
          is_error: !!tok.is_error,
          error_id: tok.error_id || null
        };
        if (doc.isPractice) {
          currentPracticeClicks.push(clickEvent);
        } else {
          currentTrialClicks.push(clickEvent);
        }

        if (onCountChange) {
          onCountChange(selectionSet.size);
        }
      });

      containerElement.appendChild(span);
      // Append a space between tokens for natural typography
      containerElement.appendChild(document.createTextNode(' '));
    });
  }

  function renderQuizForm(quizList, containerElement) {
    containerElement.innerHTML = '';
    quizList.forEach((q, qIdx) => {
      const card = document.createElement('div');
      card.className = 'quiz-question-card';

      const title = document.createElement('div');
      title.className = 'quiz-question-title';
      title.textContent = `Question ${qIdx + 1} : ${q.question}`;
      card.appendChild(title);

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'quiz-options';

      q.options.forEach((optText, optIdx) => {
        const label = document.createElement('label');
        label.className = 'quiz-option-label';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `quiz_q_${qIdx}`;
        radio.value = optIdx;
        radio.required = true;

        const spanText = document.createElement('span');
        spanText.textContent = optText;

        label.appendChild(radio);
        label.appendChild(spanText);
        optionsDiv.appendChild(label);
      });

      card.appendChild(optionsDiv);
      containerElement.appendChild(card);
    });
  }

  // Run on load
  document.addEventListener('DOMContentLoaded', init);

})();
