/**
 * IFT 6075 — Expérience Relecture & Modalités
 * Moteur d'expérimentation automatisé avec étalonnage audio, reprise de session et garde-fous
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
  let currentStage = 'setup';

  let trialStartTime = null;
  let timerInterval = null;
  let selectedTokenIndices = new Set();
  let selectedPracticeIndices = new Set();
  let currentTrialClicks = [];
  let currentPracticeClicks = [];

  // Server & session recovery state
  let isServerConnected = false;
  let serverStatusParticipants = {};
  let pendingArchiveOnFirstSave = false;

  // Audio TTS state (pre-recorded MP3 files — Amélie [fr-CA])
  const PRE_RECORDED_VOICE_LABEL = 'Amélie [fr-CA] (pré-enregistré MP3)';
  const AUDIO_TRACKS = {
    calibration: 'audio/calibration_test.mp3',
    text1: 'audio/text1.mp3',
    text2: 'audio/text2.mp3',
    text3: 'audio/text3.mp3'
  };
  const audioTimings = window.EMBEDDED_AUDIO_TIMINGS || {};
  const preloadedAudio = {};
  let activeAudio = null;
  let activeTrackKey = null;
  let audioSessionId = 0;
  let isTtsPaused = false;
  let currentTtsRate = 1.0;
  let currentTtsVolume = 1.0;
  let ttsState = 'idle'; // 'idle' | 'playing' | 'paused' | 'ended' | 'error'
  let currentTtsEvents = [];
  let isTestTtsPlaying = false;
  let isSeekingSlider = false;
  let currentSentenceTimingList = [];
  let sentenceBtnByIndex = [];
  let interviewAutoSaveTimer = null;

  // Session Results
  function createEmptySessionData() {
    return {
      participant_id: null,
      start_time: null,
      end_time: null,
      consent_confirmed: false,
      consent_confirmed_at: null,
      environment: {
        user_agent: navigator.userAgent || '',
        platform: navigator.platform || ''
      },
      calibration: null,
      precondition: null,
      practice_results: null,
      trials: [],
      final_ranking: null,
      ranking_completed_at: null,
      interview_completed: false,
      interview_completed_at: null,
      interview_answers: null
    };
  }

  let sessionData = createEmptySessionData();

  // DOM Screens
  const screens = {
    setup: document.getElementById('screen-setup'),
    consent: document.getElementById('screen-consent'),
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
    interviewHandoff: document.getElementById('screen-interview-handoff'),
    interviewGuide: document.getElementById('screen-interview-guide'),
    finish: document.getElementById('screen-finish')
  };

  const headerParticipant = document.getElementById('header-participant');
  const headerStep = document.getElementById('header-step');
  const footerStatus = document.getElementById('footer-status');

  // Setup elements
  const serverStatusBanner = document.getElementById('server-status-banner');
  const selectParticipant = document.getElementById('select-participant');
  const setupProgressSummary = document.getElementById('setup-progress-summary');
  const setupDetails = document.getElementById('setup-details');
  const setupOrderList = document.getElementById('setup-order-list');
  const existingSessionBanner = document.getElementById('existing-session-banner');
  const existingSessionMsg = document.getElementById('existing-session-msg');
  const btnResumeSession = document.getElementById('btn-resume-session');
  const btnOpenFinish = document.getElementById('btn-open-finish');
  const btnSetupDownloadJson = document.getElementById('btn-setup-download-json');
  const btnSetupDownloadCsv = document.getElementById('btn-setup-download-csv');
  const btnClearExistingSession = document.getElementById('btn-clear-existing-session');
  const checkPractice = document.getElementById('check-practice');
  const btnStartExperiment = document.getElementById('btn-start-experiment');

  // Consent elements
  const consentParticipantCode = document.getElementById('consent-participant-code');
  const consentParticipantCodeInline = document.getElementById('consent-participant-code-inline');
  const consentParticipantCodeConfirm = document.getElementById('consent-participant-code-confirm');
  const checkConsentSigned = document.getElementById('check-consent-signed');
  const btnConsentBack = document.getElementById('btn-consent-back');
  const btnConsentNext = document.getElementById('btn-consent-next');

  // Audio calibration elements
  const ttsVolumeSlider = document.getElementById('tts-volume-slider');
  const ttsVolumeVal = document.getElementById('tts-volume-val');
  const ttsSpeedSlider = document.getElementById('tts-speed-slider');
  const ttsSpeedVal = document.getElementById('tts-speed-val');
  const speedPresetsContainer = document.getElementById('speed-presets-container');
  const ttsActiveVoiceLabel = document.getElementById('tts-active-voice-label');
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
  const trialModeReminder = document.getElementById('trial-mode-reminder');
  const ttsControlBar = document.getElementById('tts-control-bar');
  const ttsAudioIndicator = document.getElementById('tts-audio-indicator');
  const ttsAudioDetail = document.getElementById('tts-audio-detail');
  const ttsTrialSpeedSelect = document.getElementById('tts-trial-speed-select');
  const ttsSeekSlider = document.getElementById('tts-seek-slider');
  const ttsTimeCurrent = document.getElementById('tts-time-current');
  const ttsTimeDuration = document.getElementById('tts-time-duration');
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
  // Interview handoff, guide & Finish elements
  const handoffParticipantCode = document.getElementById('handoff-participant-code');
  const handoffParticipantCodeInline = document.getElementById('handoff-participant-code-inline');
  const btnStartInterviewGuide = document.getElementById('btn-start-interview-guide');
  const interviewParticipantCode = document.getElementById('interview-participant-code');
  const interviewParticipantCodeInline = document.getElementById('interview-participant-code-inline');
  const interviewParticipantCodeConfirm = document.getElementById('interview-participant-code-confirm');
  const checkInterviewDone = document.getElementById('check-interview-done');
  const btnFinishInterview = document.getElementById('btn-finish-interview');
  const finishChecklist = document.getElementById('finish-checklist');
  const finalSaveStatus = document.getElementById('final-save-status');
  const finalSaveDetail = document.getElementById('final-save-detail');
  const experimenterPanel = document.getElementById('experimenter-panel');
  const rankingRecapText = document.getElementById('ranking-recap-text');
  const summaryTableBody = document.getElementById('summary-table-body');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnDownloadAllJson = document.getElementById('btn-download-all-json');
  const btnDownloadAllCsv = document.getElementById('btn-download-all-csv');
  const btnBackToInterview = document.getElementById('btn-back-to-interview');
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

  const CONDITION_LABELS = {
    SIL: 'Lecture silencieuse',
    HAUTE: 'Lecture à voix haute',
    TTS: 'TTS bimodal (synthèse vocale + écran)'
  };

  function escapeHtml(str) {
    return String(str !== null && str !== undefined ? str : '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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
      initPreRecordedAudio();
      initEventListeners();
      updateCalibrationButtonLabel();
      await refreshSetupStatus();
    } catch (err) {
      console.error('Erreur lors du chargement des fichiers JSON:', err);
      footerStatus.textContent = 'Erreur de chargement (veuillez vérifier les fichiers data/)';
    }
  }

  // ==========================================================
  // SERVER STATUS & PARTICIPANT RECOVERY
  // ==========================================================
  function isStaticHostingHost() {
    const host = (window.location.hostname || '').toLowerCase();
    return host.endsWith('.github.io') || host === 'github.io';
  }

  async function refreshSetupStatus() {
    if (window.location.protocol === 'file:' || isStaticHostingHost()) {
      isServerConnected = false;
      serverStatusParticipants = {};
    } else {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          isServerConnected = Boolean(data && data.server_mode);
          serverStatusParticipants = (data && data.participants) || {};
        } else {
          isServerConnected = false;
          serverStatusParticipants = {};
        }
      } catch (_) {
        isServerConnected = false;
        serverStatusParticipants = {};
      }
    }

    if (serverStatusBanner) {
      if (isServerConnected) {
        serverStatusBanner.className = 'info-box status-banner-ok';
        serverStatusBanner.innerHTML =
          '<strong>Serveur local connecté :</strong> la sauvegarde automatique vers <code>data_output/</code> (JSON et CSV) est active.';
      } else if (window.location.protocol !== 'file:') {
        serverStatusBanner.className = 'info-box status-banner-info';
        serverStatusBanner.innerHTML =
          '<strong>Mode en ligne (hébergement statique / GitHub Pages) :</strong> aucune donnée n\'est envoyée sur Internet. Le fichier complet (<code>session_PXX.json</code>) reste 100 % local et sera téléchargé automatiquement à la fin de l\'entrevue (avec export CSV en 1 clic).';
      } else {
        serverStatusBanner.className = 'info-box status-banner-warn';
        serverStatusBanner.innerHTML =
          '<strong>Mode fichier local (<code>file://</code>) :</strong> la session reste sauvegardée dans le navigateur (<code>localStorage</code>) et téléchargera <code>session_PXX.json</code> à la fin. Pour l\'écriture automatique dans <code>data_output/</code>, lancez <code>Lancer_Experience.command</code> (ou <code>python3 server.py</code>).';
      }
    }

    updateParticipantDropdownLabels();
    if (selectedParticipant) {
      updateExistingSessionNotice(selectedParticipant);
    }
  }

  function getLocalSession(pid) {
    try {
      const raw = localStorage.getItem(`IFT6075_${pid}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function hasNonEmptyInterviewNotes(session) {
    const intw = (session && session.interview_answers) || {};
    return Object.values(intw).some(v => String(v || '').trim().length > 0);
  }

  function getExistingSessionSummary(pid) {
    const srv = serverStatusParticipants[pid];
    if (srv && srv.exists) {
      return {
        source: 'server',
        trialsCount: srv.trials_count || 0,
        completed: Boolean(srv.completed),
        hasConsent: Boolean(srv.has_consent),
        hasRanking: Boolean(srv.has_ranking),
        interviewCompleted: Boolean(srv.interview_completed),
        hasPrecondition: true,
        updatedAt: srv.updated_at || srv.start_time || ''
      };
    }

    const local = getLocalSession(pid);
    if (local && (local.consent_confirmed || local.precondition || (local.trials && local.trials.length > 0) || local.final_ranking || local.interview_completed)) {
      const completedTrials = (local.trials || []).filter(
        t => t && t.agreabilite !== null && t.agreabilite !== undefined && t.effort !== null && t.effort !== undefined
      );
      const hasRanking = Boolean(local.final_ranking && local.final_ranking.rank_1);
      const interviewCompleted = Boolean(local.interview_completed);
      return {
        source: 'localStorage',
        trialsCount: completedTrials.length,
        completed: completedTrials.length >= 3 && hasRanking,
        hasConsent: Boolean(local.consent_confirmed),
        hasRanking,
        interviewCompleted,
        hasPrecondition: Boolean(local.precondition),
        updatedAt: local.end_time || local.start_time || ''
      };
    }
    return null;
  }

  function renderSetupProgressSummary(doneIds, inProgressIds, totalCount) {
    if (!setupProgressSummary) return;
    if (doneIds.length === 0 && inProgressIds.length === 0) {
      setupProgressSummary.classList.add('hidden');
      setupProgressSummary.innerHTML = '';
      return;
    }

    const todoCount = Math.max(0, totalCount - doneIds.length - inProgressIds.length);
    const pillsHtml = [
      `<span class="status-pill done">${doneIds.length} complété${doneIds.length > 1 ? 's' : ''}</span>`,
      inProgressIds.length > 0 ? `<span class="status-pill progress">${inProgressIds.length} en cours</span>` : '',
      `<span class="status-pill todo">${todoCount} restant${todoCount > 1 ? 's' : ''}</span>`
    ].filter(Boolean).join(' ');

    const detailsParts = [];
    if (doneIds.length > 0) {
      detailsParts.push(`<strong>Déjà complétés :</strong> ${doneIds.map(escapeHtml).join(', ')}`);
    }
    if (inProgressIds.length > 0) {
      detailsParts.push(`<strong>À terminer / reprendre :</strong> ${inProgressIds.map(escapeHtml).join(', ')}`);
    }

    setupProgressSummary.innerHTML = `
      <div><strong>Suivi sur cet appareil :</strong> ${pillsHtml}</div>
      ${detailsParts.length > 0 ? `<div style="margin-top: 4px;">${detailsParts.join(' &nbsp;|&nbsp; ')}</div>` : ''}
    `;
    setupProgressSummary.classList.remove('hidden');
  }

  function updateParticipantDropdownLabels() {
    if (!selectParticipant) return;
    const doneIds = [];
    const inProgressIds = [];
    let totalParticipants = 0;

    Array.from(selectParticipant.options).forEach(opt => {
      const pid = opt.value;
      if (!pid) return;
      totalParticipants++;
      const summary = getExistingSessionSummary(pid);
      if (!summary) {
        opt.textContent = pid;
      } else if (summary.completed && summary.interviewCompleted) {
        opt.textContent = `${pid} — ✓ Complété (3/3 + entrevue)`;
        doneIds.push(pid);
      } else if (summary.completed) {
        opt.textContent = `${pid} — ⏳ Entrevue à compléter (3/3)`;
        inProgressIds.push(pid);
      } else {
        opt.textContent = `${pid} — ⚠ En cours (${summary.trialsCount}/3)`;
        inProgressIds.push(pid);
      }
    });

    renderSetupProgressSummary(doneIds, inProgressIds, totalParticipants);
  }

  function updateExistingSessionNotice(pid) {
    if (!existingSessionBanner) return;
    const summary = pid ? getExistingSessionSummary(pid) : null;
    if (!summary) {
      existingSessionBanner.classList.add('hidden');
      if (btnResumeSession) btnResumeSession.classList.add('hidden');
      if (btnOpenFinish) btnOpenFinish.classList.add('hidden');
      if (btnSetupDownloadJson) btnSetupDownloadJson.classList.add('hidden');
      if (btnSetupDownloadCsv) btnSetupDownloadCsv.classList.add('hidden');
      if (btnClearExistingSession) btnClearExistingSession.classList.add('hidden');
      if (btnStartExperiment) {
        btnStartExperiment.textContent = 'Suivant — Étape 1 : Consentement (FIC)';
      }
      return;
    }

    existingSessionBanner.classList.remove('hidden');
    if (btnSetupDownloadJson) {
      btnSetupDownloadJson.textContent = `Télécharger JSON (${pid})`;
      btnSetupDownloadJson.classList.remove('hidden');
    }
    if (btnSetupDownloadCsv) {
      btnSetupDownloadCsv.textContent = `Télécharger CSV (${pid})`;
      btnSetupDownloadCsv.classList.toggle('hidden', summary.trialsCount <= 0);
    }
    if (btnClearExistingSession) {
      btnClearExistingSession.textContent = `Effacer et remettre ${pid} à zéro`;
      btnClearExistingSession.classList.toggle('hidden', Boolean(isServerConnected));
    }

    if (summary.completed) {
      if (summary.interviewCompleted) {
        existingSessionMsg.innerHTML =
          `<strong>Participant ${escapeHtml(pid)} déjà complété</strong> (${summary.trialsCount}/3 blocs, classement et entrevue enregistrés). Vous pouvez re-télécharger ses données ci-dessous, consulter sa synthèse, ou recommencer cet identifiant depuis le début.`;
        if (btnOpenFinish) btnOpenFinish.textContent = `Ouvrir la synthèse / notes (${pid})`;
      } else {
        existingSessionMsg.innerHTML =
          `<strong>Partie ordinateur complétée pour ${escapeHtml(pid)}</strong> (${summary.trialsCount}/3 blocs et classement enregistrés — <strong>entrevue finale à compléter</strong>).`;
        if (btnOpenFinish) btnOpenFinish.textContent = `Compléter l'entrevue finale (${pid})`;
      }
      if (btnResumeSession) btnResumeSession.classList.add('hidden');
      if (btnOpenFinish) btnOpenFinish.classList.remove('hidden');
    } else {
      existingSessionMsg.innerHTML =
        `<strong>Session en cours trouvée pour ${escapeHtml(pid)}</strong> (${summary.trialsCount}/3 blocs complétés). Reprenez là où vous étiez rendu ou recommencez depuis le début.`;
      if (btnResumeSession) btnResumeSession.classList.remove('hidden');
      if (btnOpenFinish) btnOpenFinish.classList.add('hidden');
    }

    if (btnStartExperiment) {
      btnStartExperiment.textContent = isServerConnected
        ? 'Recommencer du début (archiver l\'ancienne session)'
        : 'Recommencer du début (nouvelle passation)';
    }
  }

  async function fetchFullSessionForParticipant(pid) {
    if (isServerConnected) {
      try {
        const res = await fetch(`/api/session/${encodeURIComponent(pid)}`, { cache: 'no-store' });
        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.session) return payload.session;
        }
      } catch (_) {}
    }
    return getLocalSession(pid);
  }

  function applyLoadedCalibration(loadedSession) {
    const cal = (loadedSession && loadedSession.calibration) || {};
    const lastTtsTrial = ((loadedSession && loadedSession.trials) || []).find(t => t && t.tts_rate);
    const rate = cal.tts_rate || (lastTtsTrial && lastTtsTrial.tts_rate) || 1.0;
    const vol = cal.tts_volume || (lastTtsTrial && lastTtsTrial.tts_volume) || 1.0;

    updateTtsSpeed(rate);
    updateTtsVolume(vol);
  }

  function openConsentScreen() {
    const pid = sessionData.participant_id || selectedParticipant || 'PXX';
    if (consentParticipantCode) consentParticipantCode.textContent = pid;
    if (consentParticipantCodeInline) consentParticipantCodeInline.textContent = pid;
    if (consentParticipantCodeConfirm) consentParticipantCodeConfirm.textContent = pid;
    if (checkConsentSigned) {
      checkConsentSigned.checked = Boolean(sessionData.consent_confirmed);
    }
    if (btnConsentNext) {
      btnConsentNext.disabled = !(checkConsentSigned && checkConsentSigned.checked);
    }
    showScreen('consent');
  }

  function populateInterviewFieldsFromSession(loaded) {
    const pid = (loaded && loaded.participant_id) || selectedParticipant || 'PXX';
    if (interviewParticipantCode) interviewParticipantCode.textContent = pid;
    if (interviewParticipantCodeInline) interviewParticipantCodeInline.textContent = pid;
    if (interviewParticipantCodeConfirm) interviewParticipantCodeConfirm.textContent = pid;

    const intw = (loaded && loaded.interview_answers) || {};
    if (intwQ1) intwQ1.value = intw.q1_habitudes || '';
    if (intwQ2) intwQ2.value = intw.q2_usage_tts_passe || '';
    if (intwQ3) intwQ3.value = intw.q3_avantages_inconvenients || '';
    if (intwQ4) intwQ4.value = intw.q4_demarquee || '';
    if (intwQ5) intwQ5.value = intw.q5_difficulte_textes || '';
    if (intwQ6) intwQ6.value = intw.q6_ajout_remarques || '';
  }

  function openInterviewHandoffScreen() {
    const pid = sessionData.participant_id || selectedParticipant || 'PXX';
    if (handoffParticipantCode) handoffParticipantCode.textContent = pid;
    if (handoffParticipantCodeInline) handoffParticipantCodeInline.textContent = pid;
    showScreen('interviewHandoff');
  }

  function openInterviewGuideScreen() {
    populateInterviewFieldsFromSession(sessionData);
    if (interviewSaveStatus) interviewSaveStatus.textContent = '';
    if (checkInterviewDone) {
      checkInterviewDone.checked = Boolean(sessionData.interview_completed);
    }
    if (btnFinishInterview) {
      btnFinishInterview.disabled = !(checkInterviewDone && checkInterviewDone.checked);
    }
    showScreen('interviewGuide');
  }

  function updateDownloadButtonLabels(pid) {
    const labelPid = pid || 'PXX';
    if (btnDownloadJson) {
      btnDownloadJson.textContent = `Télécharger tout le test (JSON — ${labelPid})`;
    }
    if (btnDownloadCsv) {
      btnDownloadCsv.textContent = `Télécharger le résumé (CSV — ${labelPid})`;
    }
  }

  function renderFinishChecklist(loaded) {
    if (!finishChecklist) return;
    const s = loaded || sessionData;
    const trialsCount = (s.trials || []).length;
    const hasRanking = Boolean(s.final_ranking && s.final_ranking.rank_1);
    const hasInterview = Boolean(s.interview_completed) || hasNonEmptyInterviewNotes(s);
    const items = [
      { done: Boolean(s.consent_confirmed), text: s.consent_confirmed ? '✓ Consentement (FIC)' : '○ Consentement (FIC) non coché' },
      { done: Boolean(s.precondition), text: s.precondition ? '✓ Pré-condition' : '○ Pré-condition manquant' },
      { done: Boolean(s.calibration), text: s.calibration ? '✓ Calibration audio' : '○ Calibration par défaut' },
      { done: trialsCount >= 3, text: trialsCount >= 3 ? '✓ 3/3 blocs + questionnaires' : `⚠ ${trialsCount}/3 blocs complétés` },
      { done: hasRanking, text: hasRanking ? '✓ Classement final' : '○ Classement manquant' },
      { done: hasInterview, text: hasInterview ? '✓ Entrevue effectuée' : '○ Entrevue à confirmer' }
    ];
    finishChecklist.innerHTML = items
      .map(item => `<span class="completion-badge${item.done ? '' : ' pending'}">${escapeHtml(item.text)}</span>`)
      .join('');
  }

  async function resumeExistingSession() {
    if (!selectedParticipant || !participantConfig) return;
    const loaded = await fetchFullSessionForParticipant(selectedParticipant);
    if (!loaded) {
      alert(`Impossible de charger la session de ${selectedParticipant}.`);
      return;
    }

    pendingArchiveOnFirstSave = false;
    includePractice = checkPractice.checked;
    sessionData = Object.assign(createEmptySessionData(), loaded);
    sessionData.participant_id = selectedParticipant;
    sessionData.trials = (sessionData.trials || []).filter(
      t => t && t.agreabilite !== null && t.agreabilite !== undefined && t.effort !== null && t.effort !== undefined
    );

    applyLoadedCalibration(sessionData);
    updateCalibrationButtonLabel();

    if (!sessionData.consent_confirmed && !sessionData.precondition) {
      openConsentScreen();
      return;
    }

    if (!sessionData.precondition) {
      showScreen('precondition');
      return;
    }

    if (sessionData.trials.length >= 3) {
      if (sessionData.final_ranking && sessionData.final_ranking.rank_1) {
        if (sessionData.interview_completed) {
          openLoadedFinishScreen(sessionData, false);
        } else if (hasNonEmptyInterviewNotes(sessionData)) {
          openInterviewGuideScreen();
        } else {
          openInterviewHandoffScreen();
        }
      } else {
        goToRankingScreen();
      }
      return;
    }

    startBlockInstruction(sessionData.trials.length);
  }

  async function openCompletedSessionFinish() {
    if (!selectedParticipant || !participantConfig) return;
    const loaded = await fetchFullSessionForParticipant(selectedParticipant);
    if (!loaded) {
      alert(`Impossible de charger la session de ${selectedParticipant}.`);
      return;
    }
    pendingArchiveOnFirstSave = false;
    sessionData = Object.assign(createEmptySessionData(), loaded);
    sessionData.participant_id = selectedParticipant;
    applyLoadedCalibration(sessionData);
    if (sessionData.interview_completed) {
      openLoadedFinishScreen(sessionData, true);
    } else if (hasNonEmptyInterviewNotes(sessionData)) {
      openInterviewGuideScreen();
    } else {
      openInterviewHandoffScreen();
    }
  }

  function openLoadedFinishScreen(loaded, openExperimenterPanel) {
    const rank = loaded.final_ranking || {};
    if (rankingRecapText) {
      if (rank.rank_1) {
        rankingRecapText.innerHTML = `
          <strong>1ère place :</strong> ${escapeHtml(CONDITION_LABELS[rank.rank_1] || rank.rank_1)} &nbsp;|&nbsp;
          <strong>2e place :</strong> ${escapeHtml(CONDITION_LABELS[rank.rank_2] || rank.rank_2)} &nbsp;|&nbsp;
          <strong>3e place :</strong> ${escapeHtml(CONDITION_LABELS[rank.rank_3] || rank.rank_3)}
          ${rank.comment ? `<br><span style="color:#555; display:inline-block; margin-top:5px;">Commentaire du participant : <em>« ${escapeHtml(rank.comment)} »</em></span>` : ''}
        `;
      } else {
        rankingRecapText.textContent = 'Classement non enregistré.';
      }
    }

    populateInterviewFieldsFromSession(loaded);
    renderFinishChecklist(loaded);
    updateDownloadButtonLabels(loaded.participant_id);
    renderSummaryTable();

    const pidCode = escapeHtml(loaded.participant_id || 'PXX');
    if (isServerConnected) {
      updateFinalSaveDisplay(
        `<strong>Sauvegarde automatique :</strong> Session de <code>${pidCode}</code> chargée depuis le disque.`,
        getServerSaveDetailHtml(loaded.participant_id)
      );
    } else {
      updateFinalSaveDisplay(
        `<strong>Sauvegarde locale :</strong> Session de <code>${pidCode}</code> chargée depuis <code>localStorage</code>.`,
        getOfflineSaveDetailHtml(loaded.participant_id)
      );
    }
    if (experimenterPanel) {
      experimenterPanel.open = Boolean(openExperimenterPanel);
    }
    showScreen('finish');
  }

  // ==========================================================
  // AUDIO TTS PRÉ-ENREGISTRÉ (MP3 AMÉLIE [fr-CA] — MULTI-PLATEFORME)
  // ==========================================================
  function getActiveVoiceLabel() {
    return PRE_RECORDED_VOICE_LABEL;
  }

  function getAudioTrackSrc(trackKey) {
    return AUDIO_TRACKS[trackKey] || null;
  }

  function formatSpeedBadge(rate) {
    return `${rate.toFixed(2).replace(/\.?0+$/, '')}x`;
  }

  function formatAudioTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const whole = Math.floor(seconds);
    const min = Math.floor(whole / 60);
    const sec = whole % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function syncTrialSpeedSelect(rate) {
    if (!ttsTrialSpeedSelect) return;
    const normalized = String(Math.round(rate * 100) / 100);
    let matched = false;
    for (let i = 0; i < ttsTrialSpeedSelect.options.length; i++) {
      if (Math.abs(parseFloat(ttsTrialSpeedSelect.options[i].value) - rate) < 0.005) {
        ttsTrialSpeedSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const opt = document.createElement('option');
      opt.value = normalized;
      opt.textContent = formatSpeedBadge(rate);
      ttsTrialSpeedSelect.appendChild(opt);
      ttsTrialSpeedSelect.value = normalized;
    }
  }

  function clearActiveSentenceHighlight() {
    sentenceBtnByIndex.forEach(btn => {
      if (btn) btn.classList.remove('active-sentence');
    });
  }

  function updateTtsProgressUi() {
    const cur = activeAudio && Number.isFinite(activeAudio.currentTime) ? activeAudio.currentTime : 0;
    const dur = activeAudio && Number.isFinite(activeAudio.duration) ? activeAudio.duration : 0;

    if (ttsTimeCurrent && !isSeekingSlider) {
      ttsTimeCurrent.textContent = formatAudioTime(cur);
    }
    if (ttsTimeDuration) {
      ttsTimeDuration.textContent = formatAudioTime(dur);
    }
    if (ttsSeekSlider && !isSeekingSlider) {
      if (dur > 0) {
        ttsSeekSlider.max = dur.toFixed(2);
        ttsSeekSlider.value = Math.min(dur, cur).toFixed(2);
        ttsSeekSlider.disabled = false;
      } else {
        ttsSeekSlider.value = 0;
        ttsSeekSlider.disabled = true;
      }
    }

    if (!currentSentenceTimingList.length || ttsState === 'idle' || ttsState === 'ended' || ttsState === 'error') {
      clearActiveSentenceHighlight();
      return;
    }

    let activeIdx = 0;
    for (let i = 0; i < currentSentenceTimingList.length; i++) {
      if (currentSentenceTimingList[i].start_s <= cur + 0.04) {
        activeIdx = currentSentenceTimingList[i].sentence_index;
      } else {
        break;
      }
    }
    sentenceBtnByIndex.forEach((btn, idx) => {
      if (!btn) return;
      if (idx === activeIdx) btn.classList.add('active-sentence');
      else btn.classList.remove('active-sentence');
    });
  }

  function applyAudioSettings(audio) {
    if (!audio) return;
    audio.volume = currentTtsVolume;
    audio.playbackRate = currentTtsRate;
    if ('preservesPitch' in audio) audio.preservesPitch = true;
    if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = true;
    if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;
  }

  function preloadAudioTrack(trackKey) {
    const src = getAudioTrackSrc(trackKey);
    if (!src || typeof Audio !== 'function') return null;
    if (!preloadedAudio[trackKey]) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      preloadedAudio[trackKey] = audio;
    }
    return preloadedAudio[trackKey];
  }

  function initPreRecordedAudio() {
    if (ttsActiveVoiceLabel) {
      ttsActiveVoiceLabel.textContent = PRE_RECORDED_VOICE_LABEL;
    }
    preloadAudioTrack('calibration');

    if (btnTestTts) {
      btnTestTts.addEventListener('click', () => {
        if (isTestTtsPlaying) {
          stopTtsReading();
          if (ttsTestStatus) ttsTestStatus.textContent = 'Test arrêté.';
          return;
        }

        stopTtsReading();
        const audio = preloadAudioTrack('calibration');
        if (!audio) {
          if (ttsTestStatus) ttsTestStatus.textContent = 'Lecture audio non supportée par ce navigateur.';
          return;
        }

        const mySession = audioSessionId;
        activeAudio = audio;
        activeTrackKey = 'calibration';
        isTestTtsPlaying = true;
        ttsState = 'playing';

        if (audio.readyState > 0) {
          audio.currentTime = 0;
        }
        applyAudioSettings(audio);

        btnTestTts.textContent = 'Arrêter le test';
        if (ttsTestStatus) ttsTestStatus.textContent = 'Lecture en cours au casque...';

        audio.onended = () => {
          if (mySession !== audioSessionId || activeAudio !== audio) return;
          isTestTtsPlaying = false;
          ttsState = 'ended';
          activeAudio = null;
          activeTrackKey = null;
          btnTestTts.textContent = 'Écouter un extrait de test au casque';
          if (ttsTestStatus) ttsTestStatus.textContent = 'Test audio complété.';
        };

        audio.onerror = () => {
          if (mySession !== audioSessionId || activeAudio !== audio) return;
          isTestTtsPlaying = false;
          ttsState = 'error';
          activeAudio = null;
          activeTrackKey = null;
          btnTestTts.textContent = 'Écouter un extrait de test au casque';
          if (ttsTestStatus) ttsTestStatus.textContent = 'Erreur lors du chargement de audio/calibration_test.mp3.';
        };

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            if (mySession !== audioSessionId || activeAudio !== audio) return;
            console.warn('Test audio play rejected:', err);
            isTestTtsPlaying = false;
            ttsState = 'error';
            btnTestTts.textContent = 'Écouter un extrait de test au casque';
            if (ttsTestStatus) ttsTestStatus.textContent = 'Impossible de démarrer l\'extrait audio.';
          });
        }
      });
    }
  }

  function setTtsPlayingUi() {
    isTtsPaused = false;
    ttsState = 'playing';
    if (ttsAudioIndicator) {
      ttsAudioIndicator.textContent = 'Lecture en cours';
      ttsAudioIndicator.className = 'tts-indicator playing';
    }
    if (ttsAudioDetail) {
      ttsAudioDetail.textContent = `Audio pré-enregistré actif (${formatSpeedBadge(currentTtsRate)})`;
    }
    syncTrialSpeedSelect(currentTtsRate);
    if (btnTtsPause) {
      btnTtsPause.textContent = 'Pause';
      btnTtsPause.disabled = false;
    }
  }

  function updateTtsSpeed(newRate) {
    const previousRate = currentTtsRate;
    currentTtsRate = Math.round(parseFloat(newRate) * 100) / 100;

    if (ttsSpeedSlider) ttsSpeedSlider.value = currentTtsRate;
    if (ttsSpeedVal) {
      let desc = 'Normal';
      if (currentTtsRate < 0.85) desc = 'Lent';
      else if (currentTtsRate < 0.98) desc = 'Modéré';
      else if (currentTtsRate === 1.0) desc = 'Normal';
      else if (currentTtsRate <= 1.15) desc = 'Dynamique';
      else if (currentTtsRate <= 1.35) desc = 'Rapide';
      else desc = 'Très rapide';
      ttsSpeedVal.textContent = `${formatSpeedBadge(currentTtsRate)} (${desc})`;
    }

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

    syncTrialSpeedSelect(currentTtsRate);
    applyAudioSettings(activeAudio);

    if (trialStartTime && activeTrackKey && activeTrackKey !== 'calibration') {
      if (ttsAudioDetail && ttsState === 'playing') {
        ttsAudioDetail.textContent = `Audio pré-enregistré actif (${formatSpeedBadge(currentTtsRate)})`;
      }
      if (Math.abs(currentTtsRate - previousRate) > 0.001) {
        logTtsEvent('speed_change', {
          previous_rate: previousRate,
          new_rate: currentTtsRate
        });
      }
    }
  }

  function updateTtsVolume(newVol) {
    currentTtsVolume = Math.round(parseFloat(newVol) * 100) / 100;
    if (ttsVolumeSlider) ttsVolumeSlider.value = currentTtsVolume;
    if (ttsVolumeVal) {
      ttsVolumeVal.textContent = `${Math.round(currentTtsVolume * 100)}%`;
    }
    applyAudioSettings(activeAudio);
  }

  function logTtsEvent(eventName, extra) {
    if (!trialStartTime) return;
    const curTime = activeAudio && Number.isFinite(activeAudio.currentTime)
      ? Math.round(activeAudio.currentTime * 100) / 100
      : null;
    const durTime = activeAudio && Number.isFinite(activeAudio.duration)
      ? Math.round(activeAudio.duration * 100) / 100
      : null;
    currentTtsEvents.push(Object.assign({
      event: eventName,
      timestamp_iso: new Date().toISOString(),
      relative_time_ms: Math.max(0, Math.round(performance.now() - trialStartTime)),
      audio_file: activeTrackKey ? getAudioTrackSrc(activeTrackKey) : null,
      audio_time_s: curTime,
      audio_duration_s: durTime
    }, extra || {}));
  }

  function startTtsReading(textId, onCompleteCallback) {
    stopTtsReading();
    const audio = preloadAudioTrack(textId);
    if (!audio) {
      ttsState = 'error';
      if (ttsAudioIndicator) {
        ttsAudioIndicator.textContent = 'Erreur audio';
        ttsAudioIndicator.className = 'tts-indicator';
      }
      if (ttsAudioDetail) {
        ttsAudioDetail.textContent = 'Piste audio introuvable pour ce texte.';
      }
      if (btnTtsPause) {
        btnTtsPause.textContent = 'Pause';
        btnTtsPause.disabled = true;
      }
      logTtsEvent('error', { error: 'missing_track', text_id: textId });
      return;
    }

    const mySession = audioSessionId;
    activeAudio = audio;
    activeTrackKey = textId;
    setTtsPlayingUi();

    if (audio.readyState > 0) {
      audio.currentTime = 0;
    }
    applyAudioSettings(audio);
    updateTtsProgressUi();

    audio.onloadedmetadata = () => {
      if (mySession !== audioSessionId || activeAudio !== audio) return;
      updateTtsProgressUi();
    };

    audio.ontimeupdate = () => {
      if (mySession !== audioSessionId || activeAudio !== audio) return;
      updateTtsProgressUi();
    };

    audio.onended = () => {
      if (mySession !== audioSessionId || activeAudio !== audio) return;
      ttsState = 'ended';
      isTtsPaused = false;
      if (ttsAudioIndicator) {
        ttsAudioIndicator.textContent = 'Terminé';
        ttsAudioIndicator.className = 'tts-indicator';
      }
      if (ttsAudioDetail) {
        ttsAudioDetail.textContent = 'Lecture audio terminée. Vous pouvez poursuivre, cliquer sur ▶ ou valider.';
      }
      if (btnTtsPause) {
        btnTtsPause.textContent = 'Pause';
        btnTtsPause.disabled = true;
      }
      updateTtsProgressUi();
      logTtsEvent('ended');
      if (onCompleteCallback) onCompleteCallback();
    };

    audio.onerror = () => {
      if (mySession !== audioSessionId || activeAudio !== audio) return;
      ttsState = 'error';
      isTtsPaused = false;
      if (ttsAudioIndicator) {
        ttsAudioIndicator.textContent = 'Erreur audio';
        ttsAudioIndicator.className = 'tts-indicator';
      }
      if (ttsAudioDetail) {
        ttsAudioDetail.textContent = "Erreur de chargement du fichier audio. Cliquez sur Recommencer l'audio.";
      }
      if (btnTtsPause) {
        btnTtsPause.textContent = 'Pause';
        btnTtsPause.disabled = true;
      }
      logTtsEvent('error', { error: 'audio_element_error' });
    };

    logTtsEvent('started');
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        if (mySession !== audioSessionId || activeAudio !== audio) return;
        console.warn('Audio play blocked or failed:', err);
        isTtsPaused = true;
        ttsState = 'paused';
        if (ttsAudioIndicator) {
          ttsAudioIndicator.textContent = 'Prêt à lire';
          ttsAudioIndicator.className = 'tts-indicator paused';
        }
        if (ttsAudioDetail) {
          ttsAudioDetail.textContent = 'Cliquez sur « Lire l\'audio » pour démarrer la lecture.';
        }
        if (btnTtsPause) {
          btnTtsPause.textContent = "Lire l'audio";
          btnTtsPause.disabled = false;
        }
        logTtsEvent('autoplay_blocked', { error: err && err.name ? err.name : 'play_rejected' });
      });
    }
  }

  function seekAudioAndPlay(targetTimeSec, eventName, eventExtra) {
    const textId = participantConfig && participantConfig.text_order[currentBlockIndex];
    if (!textId || !getAudioTrackSrc(textId)) return;

    if (!activeAudio || activeTrackKey !== textId || ttsState === 'error') {
      startTtsReading(textId);
    }
    const audio = activeAudio;
    if (!audio) return;

    const mySession = audioSessionId;
    const applySeek = () => {
      if (mySession !== audioSessionId || activeAudio !== audio) return;
      const maxDur = Number.isFinite(audio.duration) ? audio.duration : targetTimeSec;
      const clamped = Math.max(0, Math.min(targetTimeSec, Math.max(0, maxDur - 0.05)));
      try {
        audio.currentTime = clamped;
      } catch (_) {}
      updateTtsProgressUi();
    };

    if (audio.readyState > 0) {
      applySeek();
    } else {
      audio.addEventListener('loadedmetadata', applySeek, { once: true });
    }

    setTtsPlayingUi();
    applyAudioSettings(audio);
    updateTtsProgressUi();
    logTtsEvent(eventName, Object.assign({
      target_time_s: Math.round(targetTimeSec * 100) / 100
    }, eventExtra || {}));

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        if (mySession !== audioSessionId || activeAudio !== audio) return;
        console.warn('Seek audio play rejected:', err);
        isTtsPaused = true;
        ttsState = 'paused';
        if (btnTtsPause) btnTtsPause.textContent = 'Reprendre';
        if (ttsAudioIndicator) {
          ttsAudioIndicator.textContent = 'En pause';
          ttsAudioIndicator.className = 'tts-indicator paused';
        }
      });
    }
  }

  function stopTtsReading() {
    audioSessionId++;
    isSeekingSlider = false;
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.ontimeupdate = null;
      activeAudio.onloadedmetadata = null;
      try {
        activeAudio.pause();
        if (activeAudio.readyState > 0) {
          activeAudio.currentTime = 0;
        }
      } catch (_) {}
      activeAudio = null;
    }
    activeTrackKey = null;
    ttsState = 'idle';
    isTtsPaused = false;
    isTestTtsPlaying = false;
    clearActiveSentenceHighlight();
    if (ttsSeekSlider) {
      ttsSeekSlider.value = 0;
      ttsSeekSlider.disabled = true;
    }
    if (ttsTimeCurrent) ttsTimeCurrent.textContent = '00:00';
    if (ttsTimeDuration) ttsTimeDuration.textContent = '00:00';
    if (btnTestTts) {
      btnTestTts.textContent = 'Écouter un extrait de test au casque';
    }
    if (ttsAudioIndicator) {
      ttsAudioIndicator.textContent = 'Arrêté';
      ttsAudioIndicator.className = 'tts-indicator';
    }
    if (btnTtsPause) {
      btnTtsPause.textContent = 'Pause';
      btnTtsPause.disabled = false;
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
      case 'consent':
        headerStep.textContent = 'Étape 1 : Consentement (FIC)';
        break;
      case 'precondition':
        headerStep.textContent = 'Étape 2 : Questionnaire Pré-Condition';
        break;
      case 'audioCalibration':
        headerStep.textContent = 'Étape 3 : Accueil & Réglages audio';
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
      case 'interviewHandoff':
        headerStep.textContent = "Remise à l'intervieweur";
        break;
      case 'interviewGuide':
        headerStep.textContent = 'Entrevue & Prise de notes';
        break;
      case 'finish':
        headerStep.textContent = 'Clôture & Téléchargement complet';
        break;
      default:
        headerStep.textContent = '';
        break;
    }
  }

  function updateCalibrationButtonLabel() {
    if (!btnStartFromCalibration) return;
    const withPractice = checkPractice ? checkPractice.checked : includePractice;
    btnStartFromCalibration.textContent = withPractice
      ? 'Continuer vers l\'entraînement'
      : 'Commencer l\'expérience';
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
        updateExistingSessionNotice(null);
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
          li.innerHTML = `<strong>Bloc ${idx + 1} :</strong> ${escapeHtml(cond.name)} (<em>Texte : ${escapeHtml(textDoc ? textDoc.title : textId)}</em>)`;
          setupOrderList.appendChild(li);
        });
        setupDetails.classList.remove('hidden');
        btnStartExperiment.disabled = false;
        updateExistingSessionNotice(pid);
      }
    });

    if (checkPractice) {
      checkPractice.addEventListener('change', updateCalibrationButtonLabel);
    }

    if (btnResumeSession) {
      btnResumeSession.addEventListener('click', resumeExistingSession);
    }

    if (btnOpenFinish) {
      btnOpenFinish.addEventListener('click', openCompletedSessionFinish);
    }

    if (btnSetupDownloadJson) {
      btnSetupDownloadJson.addEventListener('click', async () => {
        if (!selectedParticipant) return;
        const loaded = await fetchFullSessionForParticipant(selectedParticipant);
        if (!loaded) {
          alert(`Impossible de charger les données de ${selectedParticipant}.`);
          return;
        }
        downloadJsonForSession(loaded);
      });
    }

    if (btnSetupDownloadCsv) {
      btnSetupDownloadCsv.addEventListener('click', async () => {
        if (!selectedParticipant) return;
        const loaded = await fetchFullSessionForParticipant(selectedParticipant);
        if (!loaded) {
          alert(`Impossible de charger les données de ${selectedParticipant}.`);
          return;
        }
        downloadCsvForSession(loaded);
      });
    }

    if (btnClearExistingSession) {
      btnClearExistingSession.addEventListener('click', () => {
        if (!selectedParticipant) return;
        clearLocalParticipantSession(selectedParticipant);
      });
    }

    // 2. From Setup to Consent Checklist Screen (Étape 1)
    btnStartExperiment.addEventListener('click', () => {
      if (!selectedParticipant || !participantConfig) return;

      const existing = getExistingSessionSummary(selectedParticipant);
      if (existing) {
        const msg = isServerConnected
          ? `Des données existent déjà pour ${selectedParticipant} (${existing.trialsCount}/3 blocs).\n\nVoulez-vous archiver l'ancienne session dans backups/ et recommencer du début ?`
          : `Des données existent déjà dans ce navigateur pour ${selectedParticipant} (${existing.trialsCount}/3 blocs).\n\nVoulez-vous recommencer du début ? (L'ancienne session locale sera remplacée dès la validation du consentement.)`;
        if (!confirm(msg)) {
          return;
        }
        pendingArchiveOnFirstSave = Boolean(isServerConnected);
      } else {
        pendingArchiveOnFirstSave = false;
      }

      includePractice = checkPractice.checked;
      sessionData = createEmptySessionData();
      sessionData.participant_id = selectedParticipant;
      sessionData.start_time = new Date().toISOString();
      currentBlockIndex = 0;
      if (document.getElementById('precondition-form')) {
        document.getElementById('precondition-form').reset();
      }
      updateCalibrationButtonLabel();
      openConsentScreen();
    });

    // 2a. Consent Checklist Controls (Étape 1 -> Étape 2 Precondition)
    if (checkConsentSigned) {
      checkConsentSigned.addEventListener('change', () => {
        if (btnConsentNext) {
          btnConsentNext.disabled = !checkConsentSigned.checked;
        }
      });
    }

    if (btnConsentBack) {
      btnConsentBack.addEventListener('click', () => {
        pendingArchiveOnFirstSave = false;
        showScreen('setup');
      });
    }

    if (btnConsentNext) {
      btnConsentNext.addEventListener('click', () => {
        if (!checkConsentSigned || !checkConsentSigned.checked) return;
        sessionData.consent_confirmed = true;
        sessionData.consent_confirmed_at = new Date().toISOString();
        autoSaveSession();
        showScreen('precondition');
      });
    }

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
      sessionData.calibration = {
        tts_rate: currentTtsRate,
        tts_volume: currentTtsVolume,
        tts_voice: PRE_RECORDED_VOICE_LABEL,
        tts_voice_lang: 'fr-CA',
        audio_mode: 'prerecorded_mp3'
      };
      autoSaveSession();

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

    // 11. TTS Live Speed & Timeline Controls
    if (ttsTrialSpeedSelect) {
      ttsTrialSpeedSelect.addEventListener('change', (e) => {
        updateTtsSpeed(e.target.value);
      });
    }

    if (ttsSeekSlider) {
      ttsSeekSlider.addEventListener('input', (e) => {
        isSeekingSlider = true;
        if (ttsTimeCurrent) {
          ttsTimeCurrent.textContent = formatAudioTime(parseFloat(e.target.value));
        }
      });
      ttsSeekSlider.addEventListener('change', (e) => {
        isSeekingSlider = false;
        const target = parseFloat(e.target.value);
        if (Number.isFinite(target)) {
          seekAudioAndPlay(target, 'seek_timeline', { trigger: 'slider' });
        }
      });
    }

    // 12. TTS Pause / Resume Button
    btnTtsPause.addEventListener('click', () => {
      if (!activeAudio) return;
      if (ttsState === 'ended' || ttsState === 'idle' || ttsState === 'error') return;

      if (isTtsPaused || ttsState === 'paused') {
        setTtsPlayingUi();
        applyAudioSettings(activeAudio);
        updateTtsProgressUi();
        logTtsEvent('resume');

        const playPromise = activeAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            console.warn('Audio resume rejected:', err);
            isTtsPaused = true;
            ttsState = 'paused';
            btnTtsPause.textContent = 'Reprendre';
            ttsAudioIndicator.textContent = 'En pause';
            ttsAudioIndicator.className = 'tts-indicator paused';
            updateTtsProgressUi();
          });
        }
      } else {
        isTtsPaused = true;
        ttsState = 'paused';
        activeAudio.pause();
        btnTtsPause.textContent = 'Reprendre';
        ttsAudioIndicator.textContent = 'En pause';
        ttsAudioIndicator.className = 'tts-indicator paused';
        if (ttsAudioDetail) ttsAudioDetail.textContent = 'Audio suspendu (cliquez sur Reprendre ou ▶ sur une phrase)';
        updateTtsProgressUi();
        logTtsEvent('pause');
      }
    });

    // 13. TTS Restart Button
    btnTtsRestart.addEventListener('click', () => {
      const textId = participantConfig && participantConfig.text_order[currentBlockIndex];
      if (textId && getAudioTrackSrc(textId)) {
        logTtsEvent('restart');
        startTtsReading(textId);
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

    // 20b. Handoff -> Interviewer Guide & Notes
    if (btnStartInterviewGuide) {
      btnStartInterviewGuide.addEventListener('click', () => {
        openInterviewGuideScreen();
      });
    }

    // 20c. Interview Notes Auto-sync & Explicit Save Button
    [intwQ1, intwQ2, intwQ3, intwQ4, intwQ5, intwQ6].forEach(el => {
      if (!el) return;
      el.addEventListener('input', () => {
        syncInterviewAnswersFromDom();
        clearTimeout(interviewAutoSaveTimer);
        interviewAutoSaveTimer = setTimeout(() => {
          autoSaveSession();
        }, 800);
      });
    });

    if (btnSaveInterview) {
      btnSaveInterview.addEventListener('click', () => {
        saveInterviewNotes();
      });
    }

    if (checkInterviewDone) {
      checkInterviewDone.addEventListener('change', () => {
        if (btnFinishInterview) {
          btnFinishInterview.disabled = !checkInterviewDone.checked;
        }
      });
    }

    if (btnFinishInterview) {
      btnFinishInterview.addEventListener('click', () => {
        completeInterviewAndFinish();
      });
    }

    if (btnBackToInterview) {
      btnBackToInterview.addEventListener('click', () => {
        openInterviewGuideScreen();
      });
    }

    // 21. Download JSON (single & all browser sessions)
    if (btnDownloadJson) {
      btnDownloadJson.addEventListener('click', () => {
        downloadJsonData();
      });
    }

    // 22. Download CSV (single & all browser sessions)
    if (btnDownloadCsv) {
      btnDownloadCsv.addEventListener('click', () => {
        downloadCsvData();
      });
    }

    if (btnDownloadAllJson) {
      btnDownloadAllJson.addEventListener('click', () => {
        downloadAllBrowserJsonData();
      });
    }

    if (btnDownloadAllCsv) {
      btnDownloadAllCsv.addEventListener('click', () => {
        downloadAllBrowserCsvData();
      });
    }

    // 23. Reset Session
    btnResetSession.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir passer au participant suivant ?')) {
        resetSession();
      }
    });

    // 24. Prevent accidental tab reload/close during an active participant run
    window.addEventListener('beforeunload', (e) => {
      const inActiveSession =
        Boolean(selectedParticipant) &&
        currentStage !== 'setup' &&
        currentStage !== 'finish';
      if (inActiveSession) {
        e.preventDefault();
        e.returnValue = '';
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
    if (!trialStartTime) return;
    if (selectedPracticeIndices.size === 0) {
      if (!confirm("Vous n'avez sélectionné aucune erreur dans le texte d'entraînement. Voulez-vous tout de même continuer ?")) {
        return;
      }
    }

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
      preloadAudioTrack(participantConfig.text_order[blockIdx]);
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
    currentTtsEvents = [];

    trialBlockTag.textContent = `Bloc ${blockIdx + 1}/3`;
    trialConditionTag.textContent = cond.name;
    trialTextTitle.textContent = textDoc.title;
    trialCounter.textContent = '0 mot sélectionné';
    if (trialTimer) {
      trialTimer.textContent = 'Temps : 00:00';
    }
    if (trialModeReminder) {
      if (condCode === 'SIL') {
        trialModeReminder.innerHTML = '<strong>Rappel — Lecture silencieuse :</strong> Lisez dans votre tête à votre rythme habituel. Cliquez sur chaque mot erroné (1 mot par erreur, recliquez pour annuler).';
      } else if (condCode === 'HAUTE') {
        trialModeReminder.innerHTML = '<strong>Rappel — Lecture à voix haute :</strong> Lisez à voix haute de façon claire et continue. Cliquez sur chaque mot erroné (recliquez pour annuler).';
      } else {
        trialModeReminder.innerHTML = '<strong>Rappel — Synthèse vocale (TTS) :</strong> Écoutez l\'audio au casque tout en suivant des yeux. Utilisez les contrôles ci-dessus pour ajuster la vitesse ou cliquez sur <strong>▶</strong> pour reprendre à une phrase.';
      }
    }

    syncTrialSpeedSelect(currentTtsRate);

    // Render interactive clickable tokens
    renderTextTokens(
      textDoc,
      trialReadingArea,
      selectedTokenIndices,
      (count) => {
        trialCounter.textContent = `${count} mot${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
      },
      { ttsActive: Boolean(cond.tts_active) }
    );

    // High precision timer start
    trialStartTime = performance.now();
    startTimerDisplay();

    // TTS Setup (pre-recorded MP3)
    if (cond.tts_active) {
      ttsControlBar.classList.remove('hidden');
      startTtsReading(textDoc.id);
    } else {
      ttsControlBar.classList.add('hidden');
      stopTtsReading();
    }

    showScreen('trial');
  }

  function startTimerDisplay() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!trialStartTime || !trialTimer) return;
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
    if (!trialStartTime) return;

    const condCode = participantConfig.condition_order[currentBlockIndex];
    const cond = latinSquareData.conditions[condCode];

    if (selectedTokenIndices.size === 0) {
      if (!confirm("Vous n'avez sélectionné aucune erreur dans ce texte. Êtes-vous sûr de vouloir terminer la relecture ?")) {
        return;
      }
    }

    const remainingAudioSec = activeAudio && Number.isFinite(activeAudio.duration)
      ? Math.max(0, activeAudio.duration - (activeAudio.currentTime || 0))
      : 0;
    if (
      cond.tts_active &&
      (ttsState === 'playing' || ttsState === 'paused') &&
      (remainingAudioSec > 2.0 || (activeAudio && !Number.isFinite(activeAudio.duration)))
    ) {
      if (!confirm("La lecture audio n'est pas encore terminée. Êtes-vous sûr de vouloir terminer la relecture maintenant ?")) {
        return;
      }
    }

    stopTimerDisplay();
    const elapsedSeconds = ((performance.now() - trialStartTime) / 1000).toFixed(2);
    if (cond.tts_active && ttsState !== 'ended') {
      logTtsEvent('stopped_by_user');
    }
    stopTtsReading();
    trialStartTime = null;

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

    const trialRecord = {
      block_index: currentBlockIndex + 1,
      condition_code: condCode,
      condition_name: cond.name,
      tts_rate: cond.tts_active ? currentTtsRate : null,
      tts_volume: cond.tts_active ? currentTtsVolume : null,
      tts_voice: cond.tts_active ? getActiveVoiceLabel() : null,
      tts_events: cond.tts_active ? [...currentTtsEvents] : [],
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

    if (trialQuizIntroIndicator) {
      trialQuizIntroIndicator.textContent = `Bloc ${currentBlockIndex + 1} sur 3 — Relecture terminée (${cond.name})`;
    }
    quizBlockIndicator.textContent = `Bloc ${currentBlockIndex + 1} sur 3 — Quiz de rétention (${cond.name})`;
    renderQuizForm(textDoc.quiz, trialQuizContainer);

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

    if (currentBlockIndex < 2) {
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
        rankingErrorMsg.textContent = 'Veuillez choisir une modalité pour chacune des trois places (1ère, 2e et 3e place).';
        rankingErrorMsg.classList.remove('hidden');
      }
      return;
    }

    if (r1 === r2 || r1 === r3 || r2 === r3) {
      if (rankingErrorMsg) {
        rankingErrorMsg.textContent = 'Attention : chaque place (1ère, 2e, 3e) doit avoir une modalité différente.';
        rankingErrorMsg.classList.remove('hidden');
      }
      return;
    }

    if (rankingErrorMsg) rankingErrorMsg.classList.add('hidden');

    const nowIso = new Date().toISOString();
    sessionData.final_ranking = {
      rank_1: r1,
      rank_2: r2,
      rank_3: r3,
      comment: comment
    };
    sessionData.ranking_completed_at = nowIso;
    sessionData.end_time = sessionData.end_time || nowIso;

    if (rankingRecapText) {
      rankingRecapText.innerHTML = `
        <strong>1ère place :</strong> ${escapeHtml(CONDITION_LABELS[r1] || r1)} &nbsp;|&nbsp;
        <strong>2e place :</strong> ${escapeHtml(CONDITION_LABELS[r2] || r2)} &nbsp;|&nbsp;
        <strong>3e place :</strong> ${escapeHtml(CONDITION_LABELS[r3] || r3)}
        ${comment ? `<br><span style="color:#555; display:inline-block; margin-top:5px;">Commentaire du participant : <em>« ${escapeHtml(comment)} »</em></span>` : ''}
      `;
    }

    if (experimenterPanel) {
      experimenterPanel.open = false;
    }

    autoSaveSession({ downloadedOffline: false });
    openInterviewHandoffScreen();
  }

  function syncInterviewAnswersFromDom() {
    sessionData.interview_answers = {
      q1_habitudes: intwQ1 ? intwQ1.value.trim() : '',
      q2_usage_tts_passe: intwQ2 ? intwQ2.value.trim() : '',
      q3_avantages_inconvenients: intwQ3 ? intwQ3.value.trim() : '',
      q4_demarquee: intwQ4 ? intwQ4.value.trim() : '',
      q5_difficulte_textes: intwQ5 ? intwQ5.value.trim() : '',
      q6_ajout_remarques: intwQ6 ? intwQ6.value.trim() : ''
    };
  }

  async function saveInterviewNotes() {
    clearTimeout(interviewAutoSaveTimer);
    syncInterviewAnswersFromDom();
    await autoSaveSession({ downloadedOffline: false });
    if (interviewSaveStatus) {
      interviewSaveStatus.textContent = isServerConnected
        ? "Notes d'entrevue enregistrées sur disque (JSON et CSV)."
        : "Notes intermédiaires sauvegardées dans le navigateur (incluses dans le téléchargement final ci-dessous).";
      setTimeout(() => {
        interviewSaveStatus.textContent = '';
      }, 4500);
    }
  }

  async function completeInterviewAndFinish() {
    if (checkInterviewDone && !checkInterviewDone.checked) return;
    clearTimeout(interviewAutoSaveTimer);
    syncInterviewAnswersFromDom();

    const nowIso = new Date().toISOString();
    sessionData.interview_completed = true;
    sessionData.interview_completed_at = sessionData.interview_completed_at || nowIso;
    sessionData.end_time = nowIso;

    if (experimenterPanel) {
      experimenterPanel.open = false;
    }

    renderSummaryTable();
    renderFinishChecklist(sessionData);
    updateDownloadButtonLabels(sessionData.participant_id);

    let offlineDownloaded = false;
    if (!isServerConnected) {
      downloadJsonData();
      offlineDownloaded = true;
    }

    await autoSaveSession({ downloadedOffline: offlineDownloaded });
    showScreen('finish');
  }

  function renderSummaryTable() {
    summaryTableBody.innerHTML = '';
    sessionData.trials.forEach(trial => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>Bloc ${escapeHtml(trial.block_index)}</strong></td>
        <td>${escapeHtml(trial.condition_name)} (${escapeHtml(trial.condition_code)})</td>
        <td>${escapeHtml(trial.text_id)}</td>
        <td>${(typeof trial.reading_time_seconds === 'number' ? trial.reading_time_seconds : parseFloat(trial.reading_time_seconds || 0)).toFixed(1)} s</td>
        <td><strong>${escapeHtml(trial.true_positives)}</strong> / ${escapeHtml(trial.total_errors)}</td>
        <td>${escapeHtml(trial.false_positives)}</td>
        <td>${escapeHtml(trial.detection_rate_percent)}%</td>
        <td>${escapeHtml(trial.quiz_score)} / ${escapeHtml(trial.quiz_total)}</td>
        <td>${escapeHtml(trial.agreabilite || '-')} / 5</td>
        <td>${escapeHtml(trial.effort || '-')} / 5</td>
      `;
      summaryTableBody.appendChild(tr);
    });
  }

  function updateFinalSaveDisplay(statusHtml, detailHtml) {
    if (finalSaveStatus && statusHtml !== undefined) {
      finalSaveStatus.innerHTML = statusHtml;
    }
    if (finalSaveDetail && detailHtml !== undefined) {
      finalSaveDetail.innerHTML = detailHtml;
    }
  }

  function getServerSaveDetailHtml(pid) {
    const safePid = escapeHtml(pid || 'PXX');
    return `Les données codées sont enregistrées localement dans <code>data_output/raw_json/session_${safePid}.json</code> et consolidées dans <code>data_output/csv/all_participants_summary.csv</code>.`;
  }

  function getOfflineSaveDetailHtml(pid) {
    const safePid = escapeHtml(pid || 'PXX');
    return `Mode sans serveur (données 100 % locales, aucun envoi réseau) : vérifiez le dossier <em>Téléchargements</em> pour <code>session_${safePid}.json</code> (données complètes). Pour exporter également le tableau <code>summary_${safePid}.csv</code> tout de suite, cliquez sur « Télécharger le résumé (CSV — ${safePid}) » ci-dessous.`;
  }

  async function autoSaveSession(options = {}) {
    try {
      if (!selectedParticipant) return;
      const downloadedOffline = Boolean(options && options.downloadedOffline);
      const pidCode = escapeHtml(selectedParticipant);

      // 1. Sauvegarde locale dans le navigateur
      localStorage.setItem(`IFT6075_${selectedParticipant}`, JSON.stringify(sessionData));

      const allKey = 'IFT6075_ALL_PARTICIPANTS';
      let allLog = {};
      try {
        allLog = JSON.parse(localStorage.getItem(allKey)) || {};
      } catch (_) {}
      allLog[selectedParticipant] = sessionData;
      localStorage.setItem(allKey, JSON.stringify(allLog));

      // 2. Sans serveur local (ex. GitHub Pages ou file://), ne pas appeler /api/save
      if (!isServerConnected) {
        footerStatus.textContent = downloadedOffline
          ? `Log complet téléchargé : session_${selectedParticipant}.json`
          : `Sauvegarde locale OK (${selectedParticipant})`;
        const hasFinished = Boolean(
          sessionData.final_ranking &&
          sessionData.final_ranking.rank_1 &&
          sessionData.interview_completed
        );
        const statusMsg = downloadedOffline
          ? `<strong>Téléchargement automatique réussi :</strong> <code>session_${pidCode}.json</code> (données complètes du test) enregistré sur cet ordinateur et sauvegardé dans le navigateur.`
          : hasFinished
            ? `<strong>Sauvegarde locale mise à jour (<code>localStorage</code>) :</strong> utilisez les boutons ci-dessous pour télécharger les données complètes à jour.`
            : `<strong>Mode sans serveur (local) :</strong> session sauvegardée dans le navigateur (<code>localStorage</code>). Le fichier complet <code>session_${pidCode}.json</code> sera téléchargé automatiquement après l'entrevue.`;
        updateFinalSaveDisplay(statusMsg, getOfflineSaveDetailHtml(selectedParticipant));
        return;
      }

      // 3. Envoi automatique au serveur local pour écriture disque dans data_output/
      const payload = pendingArchiveOnFirstSave
        ? Object.assign({ _archive_previous: true }, sessionData)
        : sessionData;
      const serverDetail = getServerSaveDetailHtml(selectedParticipant);

      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          pendingArchiveOnFirstSave = false;
          if (data.warning) {
            footerStatus.textContent = `Attention CSV : ${data.warning}`;
            updateFinalSaveDisplay(`<strong>Attention :</strong> ${escapeHtml(data.warning)}`, serverDetail);
          } else {
            footerStatus.textContent = `Sauvegarde automatique OK : ${data.json_file}`;
            updateFinalSaveDisplay(
              `<strong>Sauvegarde automatique réussie :</strong> <code>${escapeHtml(data.json_file)}</code> et <code>${escapeHtml(data.csv_file)}</code> enregistrés sur disque.`,
              serverDetail
            );
          }
        } else {
          footerStatus.textContent = `Sauvegarde locale uniquement (erreur serveur ${res.status})`;
          updateFinalSaveDisplay(
            `<strong>Attention :</strong> le serveur a renvoyé une erreur (${res.status}). Téléchargez le JSON/CSV manuellement ci-dessous.`,
            getOfflineSaveDetailHtml(selectedParticipant)
          );
        }
      } catch (_) {
        footerStatus.textContent = `Sauvegarde locale OK (${selectedParticipant})`;
        updateFinalSaveDisplay(
          `<strong>Serveur local inaccessible :</strong> session enregistrée dans le navigateur (<code>localStorage</code>). Ouvrez l'espace expérimentateur pour télécharger le JSON et le CSV.`,
          getOfflineSaveDetailHtml(selectedParticipant)
        );
      }
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde:', e);
    }
  }

  const CSV_EXPORT_HEADERS = [
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
  ];

  function csvEscape(val) {
    return `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
  }

  function buildCsvRowsForSession(sess, saveTime) {
    if (!sess || typeof sess !== 'object') return [];
    const pre = sess.precondition || {};
    const rank = sess.final_ranking || {};
    const intw = sess.interview_answers || {};
    const pid = sess.participant_id || '';

    return (sess.trials || [])
      .filter(trial => trial && typeof trial === 'object')
      .map(trial => [
        csvEscape(pid),
        pre.age || '',
        csvEscape(pre.genre),
        pre.confort_francais || '',
        pre.confort_revision || '',
        pre.frequence_lecture || '',
        trial.block_index,
        csvEscape(trial.condition_code),
        csvEscape(trial.condition_name),
        trial.tts_rate || '',
        trial.tts_volume || '',
        csvEscape(trial.tts_voice || ''),
        csvEscape(trial.text_id),
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
        csvEscape(trial.comments),
        csvEscape(rank.rank_1),
        csvEscape(rank.rank_2),
        csvEscape(rank.rank_3),
        csvEscape(rank.comment),
        csvEscape(intw.q1_habitudes),
        csvEscape(intw.q2_usage_tts_passe),
        csvEscape(intw.q3_avantages_inconvenients),
        csvEscape(intw.q4_demarquee),
        csvEscape(intw.q5_difficulte_textes),
        csvEscape(intw.q6_ajout_remarques),
        saveTime
      ].join(';'));
  }

  function getAllBrowserSessionsMap() {
    const sessions = {};
    try {
      const allRaw = localStorage.getItem('IFT6075_ALL_PARTICIPANTS');
      const parsedAll = allRaw ? JSON.parse(allRaw) : null;
      if (parsedAll && typeof parsedAll === 'object') {
        Object.keys(parsedAll).forEach(k => {
          if (parsedAll[k] && typeof parsedAll[k] === 'object') {
            sessions[k] = parsedAll[k];
          }
        });
      }
    } catch (_) {}

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key && /^IFT6075_(P\d+)$/.exec(key);
      if (!match) continue;
      const pid = match[1];
      if (!sessions[pid]) {
        const single = getLocalSession(pid);
        if (single) sessions[pid] = single;
      }
    }

    if (sessionData && sessionData.participant_id) {
      syncInterviewAnswersFromDom();
      sessions[sessionData.participant_id] = sessionData;
    }

    const sorted = {};
    Object.keys(sessions).sort().forEach(pid => {
      sorted[pid] = sessions[pid];
    });
    return sorted;
  }

  function clearLocalParticipantSession(pid) {
    if (!pid || isServerConnected) return;
    const msg =
      `Voulez-vous vraiment effacer la session de ${pid} enregistrée dans ce navigateur ?\n\n` +
      `Cet identifiant redeviendra vierge (${pid}) dans la liste.`;
    if (!confirm(msg)) return;

    try {
      localStorage.removeItem(`IFT6075_${pid}`);
      const allKey = 'IFT6075_ALL_PARTICIPANTS';
      const allRaw = localStorage.getItem(allKey);
      if (allRaw) {
        const allLog = JSON.parse(allRaw) || {};
        delete allLog[pid];
        localStorage.setItem(allKey, JSON.stringify(allLog));
      }
    } catch (_) {}

    updateParticipantDropdownLabels();
    updateExistingSessionNotice(pid);
    footerStatus.textContent = `Session locale de ${pid} effacée`;
  }

  function downloadJsonForSession(sess) {
    if (!sess) return;
    const pid = sess.participant_id || selectedParticipant || 'PXX';
    const filename = `session_${pid}.json`;
    const jsonStr = JSON.stringify(sess, null, 2);
    downloadBlob(jsonStr, filename, 'application/json');
  }

  function downloadCsvForSession(sess) {
    if (!sess) return;
    const pid = sess.participant_id || selectedParticipant || 'PXX';
    const saveTime = new Date().toISOString();
    const rows = [
      CSV_EXPORT_HEADERS.join(';'),
      ...buildCsvRowsForSession(sess, saveTime)
    ];
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const filename = `summary_${pid}.csv`;
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  function downloadJsonData() {
    syncInterviewAnswersFromDom();
    downloadJsonForSession(sessionData);
  }

  function downloadCsvData() {
    syncInterviewAnswersFromDom();
    downloadCsvForSession(sessionData);
  }

  function downloadAllBrowserJsonData() {
    const sessions = getAllBrowserSessionsMap();
    const pids = Object.keys(sessions);
    if (pids.length === 0) {
      alert('Aucune session sauvegardée dans ce navigateur.');
      return;
    }
    const payload = {
      exported_at: new Date().toISOString(),
      participant_count: pids.length,
      sessions
    };
    downloadBlob(JSON.stringify(payload, null, 2), 'all_sessions_complete_browser.json', 'application/json');
  }

  function downloadAllBrowserCsvData() {
    const sessions = getAllBrowserSessionsMap();
    const pids = Object.keys(sessions);
    if (pids.length === 0) {
      alert('Aucune session sauvegardée dans ce navigateur.');
      return;
    }
    const saveTime = new Date().toISOString();
    const rows = [CSV_EXPORT_HEADERS.join(';')];
    pids.forEach(pid => {
      rows.push(...buildCsvRowsForSession(sessions[pid], saveTime));
    });
    const csvContent = '\uFEFF' + rows.join('\r\n');
    downloadBlob(csvContent, 'all_participants_summary_browser.csv', 'text/csv;charset=utf-8;');
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
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function resetSession() {
    clearTimeout(interviewAutoSaveTimer);
    stopTimerDisplay();
    stopTtsReading();
    selectedParticipant = null;
    participantConfig = null;
    pendingArchiveOnFirstSave = false;
    currentBlockIndex = 0;
    trialStartTime = null;
    currentTrialClicks = [];
    currentPracticeClicks = [];
    currentTtsEvents = [];
    sessionData = createEmptySessionData();

    selectParticipant.value = '';
    setupDetails.classList.add('hidden');
    if (existingSessionBanner) existingSessionBanner.classList.add('hidden');
    if (btnResumeSession) btnResumeSession.classList.add('hidden');
    if (btnOpenFinish) btnOpenFinish.classList.add('hidden');
    if (btnSetupDownloadJson) btnSetupDownloadJson.classList.add('hidden');
    if (btnSetupDownloadCsv) btnSetupDownloadCsv.classList.add('hidden');
    if (btnClearExistingSession) btnClearExistingSession.classList.add('hidden');
    btnStartExperiment.disabled = true;
    btnStartExperiment.textContent = 'Suivant — Étape 1 : Consentement (FIC)';

    if (handoffParticipantCode) handoffParticipantCode.textContent = 'PXX';
    if (handoffParticipantCodeInline) handoffParticipantCodeInline.textContent = 'PXX';
    if (consentParticipantCode) consentParticipantCode.textContent = 'PXX';
    if (consentParticipantCodeInline) consentParticipantCodeInline.textContent = 'PXX';
    if (consentParticipantCodeConfirm) consentParticipantCodeConfirm.textContent = 'PXX';
    if (checkConsentSigned) checkConsentSigned.checked = false;
    if (btnConsentNext) btnConsentNext.disabled = true;

    if (document.getElementById('precondition-form')) {
      document.getElementById('precondition-form').reset();
    }
    if (rankingForm && typeof rankingForm.reset === 'function') {
      rankingForm.reset();
    }
    if (prefComments) prefComments.value = '';
    if (rankingRecapText) rankingRecapText.textContent = '';

    if (interviewParticipantCode) interviewParticipantCode.textContent = 'PXX';
    if (interviewParticipantCodeInline) interviewParticipantCodeInline.textContent = 'PXX';
    if (interviewParticipantCodeConfirm) interviewParticipantCodeConfirm.textContent = 'PXX';
    if (intwQ1) intwQ1.value = '';
    if (intwQ2) intwQ2.value = '';
    if (intwQ3) intwQ3.value = '';
    if (intwQ4) intwQ4.value = '';
    if (intwQ5) intwQ5.value = '';
    if (intwQ6) intwQ6.value = '';
    if (interviewSaveStatus) interviewSaveStatus.textContent = '';
    if (checkInterviewDone) checkInterviewDone.checked = false;
    if (btnFinishInterview) btnFinishInterview.disabled = true;
    if (finishChecklist) finishChecklist.innerHTML = '';

    updateDownloadButtonLabels('PXX');
    if (ttsTestStatus) ttsTestStatus.textContent = '';
    if (experimenterPanel) experimenterPanel.open = false;

    updateTtsSpeed(1.0);
    updateTtsVolume(1.0);
    updateCalibrationButtonLabel();

    showScreen('setup');
    refreshSetupStatus();
  }

  // ==========================================================
  // HELPER RENDERING FUNCTIONS
  // ==========================================================
  function createTokenElement(tok, doc, selectionSet, onCountChange, sentenceInfo, onSentenceSeek) {
    const span = document.createElement('span');
    span.className = 'word-token';
    span.textContent = tok.raw;
    span.dataset.index = tok.index;

    if (selectionSet.has(tok.index)) {
      span.classList.add('selected');
    }

    span.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.altKey && sentenceInfo && onSentenceSeek) {
        e.preventDefault();
        onSentenceSeek(sentenceInfo, 'alt_click');
        return;
      }

      const wasSelected = selectionSet.has(tok.index);
      if (wasSelected) {
        selectionSet.delete(tok.index);
        span.classList.remove('selected');
      } else {
        selectionSet.add(tok.index);
        span.classList.add('selected');
      }

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

    return span;
  }

  function renderTextTokens(doc, containerElement, selectionSet, onCountChange, options) {
    containerElement.innerHTML = '';
    const ttsActive = Boolean(options && options.ttsActive);
    const sentences = ttsActive && Array.isArray(audioTimings[doc.id]) ? audioTimings[doc.id] : null;

    if (sentences && sentences.length > 0) {
      currentSentenceTimingList = sentences;
      sentenceBtnByIndex = [];
      const handleSentenceSeek = (sentInfo, triggerName) => {
        seekAudioAndPlay(sentInfo.start_s, 'seek_sentence', {
          sentence_index: sentInfo.sentence_index,
          token_start: sentInfo.token_start,
          trigger: triggerName
        });
      };

      sentences.forEach((sentInfo, sPos) => {
        const sentenceSpan = document.createElement('span');
        sentenceSpan.className = 'sentence-span';
        sentenceSpan.dataset.sentenceIndex = sentInfo.sentence_index;

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'sentence-play-btn';
        playBtn.title = 'Reprendre l\'audio à cette phrase';
        playBtn.setAttribute('aria-label', `Reprendre l'audio à la phrase ${sentInfo.sentence_index + 1}`);
        playBtn.innerHTML = '<svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true"><polygon points="2,1 9,5 2,9" fill="currentColor"></polygon></svg>';
        playBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSentenceSeek(sentInfo, 'sentence_btn');
        });

        sentenceBtnByIndex[sentInfo.sentence_index] = playBtn;

        sentenceSpan.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSentenceSeek(sentInfo, 'context_menu');
        });

        let leadWrapped = false;
        for (let tIdx = sentInfo.token_start; tIdx <= sentInfo.token_end; tIdx++) {
          const tok = doc.tokens[tIdx];
          if (!tok) continue;
          const tokEl = createTokenElement(tok, doc, selectionSet, onCountChange, sentInfo, handleSentenceSeek);
          if (!leadWrapped) {
            const leadSpan = document.createElement('span');
            leadSpan.className = 'sentence-lead';
            leadSpan.appendChild(playBtn);
            leadSpan.appendChild(tokEl);
            sentenceSpan.appendChild(leadSpan);
            leadWrapped = true;
          } else {
            sentenceSpan.appendChild(tokEl);
          }
          if (tIdx < sentInfo.token_end) {
            sentenceSpan.appendChild(document.createTextNode(' '));
          }
        }
        if (!leadWrapped) {
          sentenceSpan.appendChild(playBtn);
        }

        containerElement.appendChild(sentenceSpan);
        if (sPos < sentences.length - 1) {
          containerElement.appendChild(document.createTextNode(' '));
        }
      });
      return;
    }

    currentSentenceTimingList = [];
    sentenceBtnByIndex = [];
    doc.tokens.forEach((tok, idx) => {
      const span = createTokenElement(tok, doc, selectionSet, onCountChange, null, null);
      containerElement.appendChild(span);
      if (idx < doc.tokens.length - 1) {
        containerElement.appendChild(document.createTextNode(' '));
      }
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
