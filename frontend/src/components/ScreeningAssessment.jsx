import React, { useState, useEffect, useRef } from 'react';
import {
  CONVERSATION_QUESTION_BANK,
  determineNextQuestion,
  getConversationalAcknowledgement,
  getFriendlyProgress,
  checkForCrisisTriggers
} from '../utils/conversationEngine';
import {
  analyzeLinguisticStress,
  calculateTelemetryMetrics,
  generateClinicalNarrative,
  synthesizeSoapNote,
  calculateFacialLandmarkMetrics,
  sanitizeTranscript
} from '../utils/telemetryMath';
import { ClinicalAuditService } from '../services/clinicalAuditService';
import { TTSService } from '../services/ttsService';
import {
  IconSparkles,
  IconShieldCheck,
  IconLock,
  IconMic,
  IconVideo,
  IconEar,
  IconMessageSquare,
  IconVolume2,
  IconEdit,
  IconHeartPulse,
  IconLeaf,
  IconChevronRight
} from './Icons';

// Workflow Stages
const STAGE = {
  INTRO: 'INTRO',
  CONVERSATION: 'CONVERSATION',
  CRISIS_ALERT: 'CRISIS_ALERT',
  SYNTHESIZING: 'SYNTHESIZING',
  RESULTS: 'RESULTS'
};

// Conversational Turn States
const TURN_STATE = {
  SPEAKING: 'SPEAKING',       // MindVision is speaking the question
  LISTENING: 'LISTENING',     // Patient's turn to speak via mic
  CONFIRMING: 'CONFIRMING',   // Reviewing recognized text
  TYPING: 'TYPING'            // Typing response manually
};


// Adaptive Coping Recommendation Helper based on self-reported inputs
function getCopingRecommendation(report) {
  if (!report) return null;
  const fullText = (
    (report.text || '') + ' ' +
    (report.dialogHistory || []).map((h) => `${h.prompt || ''} ${h.answer || ''}`).join(' ')
  ).toLowerCase();

  // 1. Overwhelmed -> Grounding Exercise
  if (
    fullText.includes('overwhelm') ||
    fullText.includes('too much') ||
    fullText.includes('swamped') ||
    fullText.includes('piled up') ||
    fullText.includes('pressure') ||
    fullText.includes('drowning') ||
    fullText.includes('cannot handle') ||
    report.riskLevel === 'SEVERE'
  ) {
    return {
      type: 'grounding',
      category: 'overwhelmed',
      headline: 'Suggested self-care for feeling overwhelmed',
      activityTitle: '5-4-3-2-1 Sensory Grounding',
      reason: 'When thoughts or pressures feel heavy and overflowing, gently connecting with your physical senses helps anchor your mind in the present.',
      buttonText: 'Try 5-4-3-2-1 Grounding Now ›',
      icon: '🌊'
    };
  }

  // 2. Tense -> Guided Breathing
  if (
    fullText.includes('tense') ||
    fullText.includes('tight') ||
    fullText.includes('tightness') ||
    fullText.includes('racing') ||
    fullText.includes('stress') ||
    fullText.includes('anxious') ||
    fullText.includes('nervous') ||
    fullText.includes('headache') ||
    (report.au4 && report.au4 > 0.4) ||
    report.riskLevel === 'ELEVATED'
  ) {
    return {
      type: 'breathing',
      category: 'tense',
      headline: 'Suggested self-care for physical tension',
      activityTitle: '1-Minute Box Breathing',
      reason: 'You reported tension or physical strain. A gentle 4-4-4-4 breathing cycle encourages your nervous system to soften and reset.',
      buttonText: 'Start Box Breathing (1 Min) ›',
      icon: '⚡'
    };
  }

  // 3. Trouble Unwinding / Sleep -> Wind-Down Routine
  if (
    fullText.includes('sleep') ||
    fullText.includes('insomnia') ||
    fullText.includes('night') ||
    fullText.includes('awake') ||
    fullText.includes('tired') ||
    fullText.includes('exhausted') ||
    fullText.includes('fatigue') ||
    fullText.includes('unwind') ||
    fullText.includes('restless')
  ) {
    return {
      type: 'winddown',
      category: 'trouble unwinding',
      headline: 'Suggested self-care to unwind',
      activityTitle: 'Gentle Evening Wind-Down Routine',
      reason: 'When resting feels challenging, progressive shoulder relaxation and quiet space preparation can signal to your body that it is safe to rest.',
      buttonText: 'Start Wind-Down Routine ›',
      icon: '🌙'
    };
  }

  // 4. Low -> Journaling or Gentle Self-Care
  if (
    fullText.includes('sad') ||
    fullText.includes('down') ||
    fullText.includes('lonely') ||
    fullText.includes('heavy') ||
    fullText.includes('low') ||
    fullText.includes('empty') ||
    fullText.includes('alone')
  ) {
    return {
      type: 'journal',
      category: 'low',
      headline: 'Suggested self-care for low moments',
      activityTitle: 'Private Reflection Journaling',
      reason: 'When feeling low or depleted, putting your thoughts into a safe, confidential space or offering yourself a small moment of comfort can bring clarity.',
      buttonText: 'Open Private Journal ›',
      icon: '🌧️'
    };
  }

  // Default calm supportive suggestion
  return {
    type: 'breathing',
    category: 'steady',
    headline: 'Optional daily wellness suggestion',
    activityTitle: '1-Minute Box Breathing Refresher',
    reason: 'Taking regular micro-pauses helps maintain your steady, calm rhythm throughout the day.',
    buttonText: 'Take a 1-Min Breath Pause ›',
    icon: '🌿'
  };
}

export default function ScreeningAssessment({ onCompleteAssessment, onShowToast }) {
  // Overall workflow stage
  const [currentStage, setCurrentStage] = useState(STAGE.INTRO);

  // Consent & hardware preferences
  const [allowMic, setAllowMic] = useState(true);
  const [allowCamera, setAllowCamera] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  // Video & Background Canvas capture refs
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const isDetectingRef = useRef(false);
  const animFrameRef = useRef(null);
  const offscreenCanvasRef = useRef(null);

  // Real-time Facial Telemetry State & Accumulators
  const [liveFacialTelemetry, setLiveFacialTelemetry] = useState({
    au4: 0.15,
    au15: 0.10,
    hasFace: false,
    mode: 'STANDBY'
  });
  const phaseAu4SamplesRef = useRef([]);
  const phaseAu15SamplesRef = useRef([]);
  const sessionAu4SamplesRef = useRef([]);
  const sessionAu15SamplesRef = useRef([]);

  // Web Speech recognition & Audio Metering refs
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioAnimFrameRef = useRef(null);
  const visualizerCanvasRef = useRef(null);
  const visualizerAnimRef = useRef(null);
  const micAudioStreamRef = useRef(null);
  const phaseJitterSamplesRef = useRef([]);
  const sessionJitterSamplesRef = useRef([]);

  // Conversation tracking
  const [turnState, setTurnState] = useState(TURN_STATE.SPEAKING);
  const [currentQuestion, setCurrentQuestion] = useState(CONVERSATION_QUESTION_BANK.initial);
  const [askedQuestionIds, setAskedQuestionIds] = useState(['q_initial']);
  const [questionCount, setQuestionCount] = useState(1);
  const [dialogHistory, setDialogHistory] = useState([]); // [{ id, prompt, answer, timestamp, phaseTelemetry }]

  // User response input
  const [recognizedText, setRecognizedText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [acknowledgementNote, setAcknowledgementNote] = useState('');
  const [isTtsLoading, setIsTtsLoading] = useState(false);

  // Completed assessment results
  const [completedReport, setCompletedReport] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Media & Tracker Cleanup defined before effect to avoid uninitialized variable access
  const stopAllMedia = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioAnimFrameRef.current) {
      cancelAnimationFrame(audioAnimFrameRef.current);
      audioAnimFrameRef.current = null;
    }
    if (visualizerAnimRef.current) {
      cancelAnimationFrame(visualizerAnimRef.current);
      visualizerAnimRef.current = null;
    }
    if (micAudioStreamRef.current) {
      micAudioStreamRef.current.getTracks().forEach((track) => track.stop());
      micAudioStreamRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (faceMeshRef.current) {
      try { faceMeshRef.current.close(); } catch {}
      faceMeshRef.current = null;
    }
    TTSService.stop();
    setCameraActive(false);
  };

  // 1. Text-To-Speech: Pre-cache prompts and setup teardown
  useEffect(() => {
    // Pre-cache known conversation prompts in background for zero-latency replay
    const bankPrompts = Object.values(CONVERSATION_QUESTION_BANK)
      .map((q) => q?.prompt)
      .filter(Boolean);
    const commonPrompts = [
      ...bankPrompts,
      "Thank you for taking this quiet moment for yourself. Preparing your gentle reflection summary now."
    ];
    TTSService.precache(commonPrompts);

    return () => {
      stopAllMedia();
      TTSService.stop();
    };
  }, []);

  // Speak question aloud using Cloud Neural TTS pipeline with emergency local SpeechSynthesis fallback
  const speakQuestion = (textToSpeak, onFinish) => {
    TTSService.speak(
      textToSpeak,
      { rate: 0.92, pitch: '0%', style: 'chat' },
      {
        onLoading: (loading) => {
          setIsTtsLoading(loading);
        },
        onStart: () => {
          setIsTtsLoading(false);
          setTurnState(TURN_STATE.SPEAKING);
        },
        onFinish: () => {
          setIsTtsLoading(false);
          if (allowMic && speechSupported) {
            startSpeechRecognition();
          } else {
            setTurnState(TURN_STATE.TYPING);
          }
          if (onFinish) onFinish();
        },
        onError: () => {
          setIsTtsLoading(false);
          if (allowMic && speechSupported) {
            startSpeechRecognition();
          } else {
            setTurnState(TURN_STATE.TYPING);
          }
          if (onFinish) onFinish();
        }
      }
    );
  };

  // Web Audio API Canvas Visualizer Loop (Active strictly during TURN_STATE.LISTENING)
  useEffect(() => {
    if (turnState !== TURN_STATE.LISTENING) {
      if (visualizerAnimRef.current) {
        cancelAnimationFrame(visualizerAnimRef.current);
        visualizerAnimRef.current = null;
      }
      return;
    }

    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect prefers-reduced-motion for all visualizer animations
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let phase = 0;

    const renderVisualizer = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width = canvas.offsetWidth * dpr;
      const height = canvas.height = canvas.offsetHeight * dpr;
      ctx.clearRect(0, 0, width, height);

      // Reduced motion: serene static line and calm center focus dot
      if (prefersReducedMotion) {
        ctx.beginPath();
        ctx.moveTo(10 * dpr, height / 2);
        ctx.lineTo(width - 10 * dpr, height / 2);
        ctx.strokeStyle = 'rgba(37, 124, 111, 0.4)';
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37, 124, 111, 0.7)';
        ctx.fill();
        return;
      }

      // Sample real-time audio volume via AnalyserNode
      let audioVolume = 0;
      const analyser = analyserRef.current;
      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128.0;
          sum += Math.abs(val);
        }
        audioVolume = sum / bufferLength;
      }

      phase += 0.05 + audioVolume * 0.12;
      const centerY = height / 2;
      const baseAmp = Math.max(5 * dpr, (audioVolume * 45 + 7) * dpr);

      // Smooth Waveform with Gradient Stroke
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(37, 124, 111, 0.12)');
      gradient.addColorStop(0.5, 'rgba(37, 124, 111, 0.9)');
      gradient.addColorStop(1, 'rgba(46, 191, 165, 0.12)');

      ctx.beginPath();
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const points = 36;
      const sliceWidth = width / (points - 1);

      for (let i = 0; i < points; i++) {
        const norm = i / (points - 1);
        const x = i * sliceWidth;
        const envelope = Math.sin(norm * Math.PI);
        const y = centerY + Math.sin(norm * 4 * Math.PI + phase) * baseAmp * envelope;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevNorm = (i - 1) / (points - 1);
          const prevX = (i - 1) * sliceWidth;
          const prevY = centerY + Math.sin(prevNorm * 4 * Math.PI + phase) * baseAmp * Math.sin(prevNorm * Math.PI);
          const cpX = (prevX + x) / 2;
          const cpY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      }
      ctx.stroke();

      // Pulsing radial center focus indicator
      ctx.beginPath();
      const dotRadius = Math.max(3.5, 4 + audioVolume * 10) * dpr;
      ctx.arc(width / 2, centerY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37, 124, 111, 0.95)';
      ctx.shadowColor = 'rgba(37, 124, 111, 0.45)';
      ctx.shadowBlur = 8 * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;

      visualizerAnimRef.current = requestAnimationFrame(renderVisualizer);
    };

    visualizerAnimRef.current = requestAnimationFrame(renderVisualizer);

    return () => {
      if (visualizerAnimRef.current) {
        cancelAnimationFrame(visualizerAnimRef.current);
        visualizerAnimRef.current = null;
      }
    };
  }, [turnState]);


  // 3. Initialize MediaPipe FaceMesh via CDN and Anchor Real-Time Loop
  const initFaceMeshDetector = () => {
    try {
      if (!window.FaceMesh) return;
      const fm = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      fm.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const lms = results.multiFaceLandmarks[0];
          const calculated = calculateFacialLandmarkMetrics(lms);
          if (calculated) {
            setLiveFacialTelemetry({
              au4: calculated.au4,
              au15: calculated.au15,
              hasFace: true,
              mode: calculated.mode
            });
            // Push active frame sample to phase and session accumulators
            phaseAu4SamplesRef.current.push(calculated.au4);
            phaseAu15SamplesRef.current.push(calculated.au15);
            sessionAu4SamplesRef.current.push(calculated.au4);
            sessionAu15SamplesRef.current.push(calculated.au15);
          }
        } else {
          setLiveFacialTelemetry((prev) => ({ ...prev, hasFace: false }));
        }
      });
      faceMeshRef.current = fm;
    } catch (err) {
      console.warn('FaceMesh initialization warning:', err);
    }
  };

  // Continuous background canvas frame capture loop
  const startCameraProcessingLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 320;
      offscreenCanvasRef.current.height = 240;
    }

    const processFrame = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        // Draw dynamically to canvas
        const offCtx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
          offCtx.drawImage(videoRef.current, 0, 0, 320, 240);
        }

        // Actively feed video frame into MediaPipe detector on every frame
        if (faceMeshRef.current && !isDetectingRef.current) {
          isDetectingRef.current = true;
          faceMeshRef.current.send({ image: videoRef.current })
            .catch(() => {})
            .finally(() => {
              isDetectingRef.current = false;
            });
        }
      }
      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
  };

  // Initialize Camera Stream and FaceMesh Scripts
  const initCameraPipeline = async () => {
    if (!allowCamera) return;

    // Load MediaPipe FaceMesh CDN if not present
    if (!window.FaceMesh && !document.getElementById('mediapipe-facemesh-cdn')) {
      const script = document.createElement('script');
      script.id = 'mediapipe-facemesh-cdn';
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => initFaceMeshDetector();
      document.head.appendChild(script);
    } else if (window.FaceMesh) {
      initFaceMeshDetector();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      startCameraProcessingLoop();
    } catch {
      setCameraActive(false);
      onShowToast?.('Camera unavailable or permission denied. Continuing check-in with audio & verbal channels.');
    }
  };

  // Live Audio Prosody & Jitter Sampling via Web Audio API
  const initAudioProsodySampling = (audioStream) => {
    try {
      if (!audioStream) return;
      micAudioStreamRef.current = audioStream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const sampleAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
          if (dataArray[i] > peak) peak = dataArray[i];
        }
        const avgVol = sum / dataArray.length;

        // If speech activity detected (volume > 10)
        if (avgVol > 10) {
          // Estimate micro-fluctuation in spectral peak (jitter proxy)
          const jitterSample = Math.min(0.85, Math.max(0.10, (peak / 255.0) * 0.70));
          phaseJitterSamplesRef.current.push(jitterSample);
          sessionJitterSamplesRef.current.push(jitterSample);
        }

        audioAnimFrameRef.current = requestAnimationFrame(sampleAudio);
      };

      audioAnimFrameRef.current = requestAnimationFrame(sampleAudio);
    } catch {}
  };

  // Start Speech-To-Text Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setTurnState(TURN_STATE.TYPING);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecognizing(true);
        setTurnState(TURN_STATE.LISTENING);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setRecognizedText(transcript);
        setTypedText(transcript);
      };

      recognition.onerror = (event) => {
        setIsRecognizing(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechSupported(false);
          setTurnState(TURN_STATE.TYPING);
          onShowToast?.('Microphone access was not permitted. Switching to typed response.');
        } else if (!recognizedText.trim()) {
          setTurnState(TURN_STATE.TYPING);
        }
      };

      recognition.onend = () => {
        setIsRecognizing(false);
        if (recognizedText.trim()) {
          setTurnState(TURN_STATE.CONFIRMING);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Start audio prosody tracking if mic stream available
      if (allowMic && !audioContextRef.current) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((micStream) => initAudioProsodySampling(micStream))
          .catch(() => {});
      }
    } catch {
      setSpeechSupported(false);
      setTurnState(TURN_STATE.TYPING);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsRecognizing(false);
    if (recognizedText.trim() || typedText.trim()) {
      setTurnState(TURN_STATE.CONFIRMING);
    } else {
      setTurnState(TURN_STATE.TYPING);
    }
  };

  // Start check-in flow
  const handleStartCheckIn = () => {
    setCurrentStage(STAGE.CONVERSATION);
    setDialogHistory([]);
    setAskedQuestionIds(['q_initial']);
    setCurrentQuestion(CONVERSATION_QUESTION_BANK.initial);
    setQuestionCount(1);
    setRecognizedText('');
    setTypedText('');
    setAcknowledgementNote('');

    // Clear telemetry accumulators
    phaseAu4SamplesRef.current = [];
    phaseAu15SamplesRef.current = [];
    sessionAu4SamplesRef.current = [];
    sessionAu15SamplesRef.current = [];
    phaseJitterSamplesRef.current = [];
    sessionJitterSamplesRef.current = [];

    // Launch camera pipeline if allowed
    initCameraPipeline();

    // Speak initial question
    setTimeout(() => {
      speakQuestion(CONVERSATION_QUESTION_BANK.initial.prompt);
    }, 350);
  };

  // Confirm patient answer and progress adaptively
  const handleConfirmAnswer = (confirmedAnswer) => {
    const rawAnswer = (confirmedAnswer || recognizedText || typedText || '').trim();
    if (!rawAnswer) {
      setTurnState(TURN_STATE.TYPING);
      return;
    }

    // Sanitize transcript: filter repetitive noise or garbage strings
    const sanitizedAnswer = sanitizeTranscript(rawAnswer);

    // Check for crisis triggers
    if (checkForCrisisTriggers(rawAnswer)) {
      TTSService.stop();
      stopAllMedia();
      setCurrentStage(STAGE.CRISIS_ALERT);
      ClinicalAuditService.logEvent({
        eventType: 'CRISIS_TRIGGER_DETECTED',
        label: 'Safety language flagged during patient screening',
        actor: 'SAFETY_ENGINE',
        actorId: 'CrisisProtocolEngine',
        sessionId: 'scr_crisis_alert',
        status: 'ESCALATED',
        details: 'Self-harm or crisis keyword detected in patient response.'
      });
      return;
    }

    // Compute aggregated average AU04, AU15, and jitter for this question phase
    const phaseAvgAu4 = phaseAu4SamplesRef.current.length > 0
      ? parseFloat((phaseAu4SamplesRef.current.reduce((a, b) => a + b, 0) / phaseAu4SamplesRef.current.length).toFixed(3))
      : null;
    const phaseAvgAu15 = phaseAu15SamplesRef.current.length > 0
      ? parseFloat((phaseAu15SamplesRef.current.reduce((a, b) => a + b, 0) / phaseAu15SamplesRef.current.length).toFixed(3))
      : null;
    const phaseAvgJitter = phaseJitterSamplesRef.current.length > 0
      ? parseFloat((phaseJitterSamplesRef.current.reduce((a, b) => a + b, 0) / phaseJitterSamplesRef.current.length).toFixed(3))
      : null;

    // Reset phase sample buffers for next question
    phaseAu4SamplesRef.current = [];
    phaseAu15SamplesRef.current = [];
    phaseJitterSamplesRef.current = [];

    // Record turn with verified phase telemetry
    const turnRecord = {
      id: currentQuestion.id,
      prompt: currentQuestion.prompt,
      answer: rawAnswer,
      sanitizedAnswer: sanitizedAnswer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      phaseTelemetry: {
        au4: phaseAvgAu4,
        au15: phaseAvgAu15,
        jitter: phaseAvgJitter,
        hasFacial: phaseAvgAu4 !== null,
        hasAudio: phaseAvgJitter !== null
      }
    };
    const updatedHistory = [...dialogHistory, turnRecord];
    setDialogHistory(updatedHistory);

    // Determine next adaptive question
    const updatedAsked = [...askedQuestionIds, currentQuestion.id];
    setAskedQuestionIds(updatedAsked);

    const nextQ = (questionCount < 4) ? determineNextQuestion(rawAnswer, updatedAsked) : null;

    if (nextQ) {
      const ack = getConversationalAcknowledgement(rawAnswer, questionCount);
      setAcknowledgementNote(ack);
      setCurrentQuestion(nextQ);
      setQuestionCount((prev) => prev + 1);
      setRecognizedText('');
      setTypedText('');

      const fullSpoken = `${ack} ${nextQ.prompt}`;
      speakQuestion(fullSpoken);
    } else {
      finishAssessment(updatedHistory);
    }
  };

  // Compile multimodal results and transition to results screen
  const finishAssessment = (history) => {
    setCurrentStage(STAGE.SYNTHESIZING);
    stopAllMedia();

    TTSService.speak(
      "Thank you for taking this quiet moment for yourself. Preparing your gentle reflection summary now.",
      { rate: 0.92, pitch: '0%', style: 'chat' }
    );

    setTimeout(() => {
      // 1. Filter out garbage placeholder transcriptions and aggregate valid patient answers
      const validAnswers = history
        .map((h) => sanitizeTranscript(h.answer))
        .filter((a) => Boolean(a));
      const fullValidText = validAnswers.join(' ');
      const isTextValid = validAnswers.length > 0;
      const sentiment = analyzeLinguisticStress(fullValidText);

      // 2. Compute true session average of active facial AU scores
      const hasFacial = sessionAu4SamplesRef.current.length >= 5;
      const sessionAvgAu4 = hasFacial
        ? parseFloat((sessionAu4SamplesRef.current.reduce((a, b) => a + b, 0) / sessionAu4SamplesRef.current.length).toFixed(2))
        : null;
      const sessionAvgAu15 = hasFacial
        ? parseFloat((sessionAu15SamplesRef.current.reduce((a, b) => a + b, 0) / sessionAu15SamplesRef.current.length).toFixed(2))
        : null;

      // 3. Compute true session average of audio prosody jitter
      const hasAudio = sessionJitterSamplesRef.current.length >= 5;
      const sessionAvgJitter = hasAudio
        ? parseFloat((sessionJitterSamplesRef.current.reduce((a, b) => a + b, 0) / sessionJitterSamplesRef.current.length).toFixed(2))
        : null;

      // 4. Compute composite risk & decision support strictly from valid signals with adaptive weighting
      const metrics = calculateTelemetryMetrics(
        sessionAvgAu4,
        sessionAvgAu15,
        sessionAvgJitter,
        sentiment,
        { hasFacial, hasAudio, isTextValid }
      );

      const clinicalNarrative = generateClinicalNarrative(metrics);
      const soapNote = synthesizeSoapNote(fullValidText || history.map((h) => h.answer).join(' '), metrics);

      const reportId = `scr_${Math.random().toString(36).substring(2, 9)}`;
      const finalReport = {
        id: reportId,
        timestamp: new Date().toLocaleString(),
        au4: metrics.au4,
        au15: metrics.au15,
        prosody: metrics.acousticJitter,
        sentiment: metrics.textSentiment,
        compositeRisk: metrics.compositeRisk,
        incongruence: metrics.incongruenceIndex,
        riskLevel: metrics.riskLevel,
        text: fullValidText || history.map((h) => h.answer).join(' '),
        clinicalNarrative,
        soapNoteMarkdown: soapNote?.fullMarkdown || soapNote?.assessment || '',
        dialogHistory: history,
        mode: 'CONVERSATIONAL_VOICE',
        hasFacialTelemetry: hasFacial,
        hasAudioTelemetry: hasAudio,
        signalWarnings: metrics.warnings || []
      };

      ClinicalAuditService.logEvent({
        eventType: 'SCREENING_COMPLETED',
        label: `Conversational Patient Screening Completed (${reportId})`,
        actor: 'PATIENT',
        actorId: 'MV-PATIENT-8821',
        sessionId: reportId,
        status: 'COMPLETED',
        details: `Intake protocol finished. Facial active: ${hasFacial}, Audio active: ${hasAudio}. Warnings: ${metrics.warnings.join('; ') || 'None'}.`
      });

      setCompletedReport(finalReport);
      setCurrentStage(STAGE.RESULTS);
      onCompleteAssessment?.(finalReport);
      onShowToast?.('Your wellness check-in has been completed and saved.');
    }, 1200);
  };

  const handleRepeatQuestion = () => {
    speakQuestion(currentQuestion.prompt);
  };

  return (
    <div className="assessment-wrapper">
      
      {/* ============================================================== */}
      {/* 1. INTRO / WELCOME STAGE */}
      {/* ============================================================== */}
      {currentStage === STAGE.INTRO && (
        <div className="patient-hero-card" style={{ width: '100%', margin: '0 0 2rem 0' }}>
          <div className="patient-hero-kicker">
            <span className="badge-hero-primary">
              <IconSparkles size={14} />
              <span>Gentle Check-in</span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>2–3 Minutes</span>
          </div>

          <h1 className="patient-hero-title" style={{ fontSize: '1.9rem', marginBottom: '0.6rem' }}>
            Take a quiet moment for yourself
          </h1>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
            We'll ask a few quick questions about how you've been feeling. You can speak or type your answers — whatever's easier for you.
          </p>

          {/* Privacy & Permissions in Reassuring Plain Language */}
          <div style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              <IconLock size={15} style={{ color: 'var(--color-primary)' }} />
              <span>Your privacy comes first</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              We may use your camera and microphone to better understand how you're feeling. Your reflections remain private and are never shared without your permission.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={allowMic}
                  onChange={(e) => setAllowMic(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-teal)', cursor: 'pointer' }}
                />
                <span><strong>Microphone:</strong> Speak your answers naturally</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={allowCamera}
                  onChange={(e) => setAllowCamera(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-teal)', cursor: 'pointer' }}
                />
                <span><strong>Camera (Optional):</strong> Helps understand subtle facial expressions</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                setAllowMic(false);
                setAllowCamera(false);
                handleStartCheckIn();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Type instead of talk
            </button>

            <button
              type="button"
              className="btn-patient-primary"
              onClick={handleStartCheckIn}
              style={{ padding: '0.85rem 1.8rem' }}
            >
              <span>Start</span>
              <span>›</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* 2. CONVERSATION STAGE (CALM, REASSURING VOICE & TEXT FLOW) */}
      {/* ============================================================== */}
      {currentStage === STAGE.CONVERSATION && (
        <div className="patient-view-shell" style={{ width: '100%', padding: '0.5rem 0 2rem 0' }}>
          
          {/* Conversational Adaptive Progress Header */}
          <div className="patient-progress-container" aria-label="Reflection progress">
            <div className="patient-progress-header">
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {getFriendlyProgress(questionCount)}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Step {questionCount} of 4
              </span>
            </div>
            <div className="patient-progress-track">
              <div
                className="patient-progress-fill"
                style={{ width: `${Math.min(100, (questionCount / 4) * 100)}%` }}
              />
            </div>
          </div>

          {/* Main Conversational Card */}
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-color)',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            {/* Calm Breathing & Listening Orb */}
            <div
              className={`calm-breathing-orb ${turnState === TURN_STATE.LISTENING ? 'listening' : ''}`}
              title={turnState === TURN_STATE.LISTENING ? 'Listening to your voice...' : 'MindVision Check-in'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {turnState === TURN_STATE.SPEAKING ? (
                <IconSparkles size={32} style={{ color: 'var(--color-primary)' }} />
              ) : turnState === TURN_STATE.LISTENING ? (
                <IconMic size={32} style={{ color: 'var(--color-primary)' }} />
              ) : (
                <IconMessageSquare size={30} style={{ color: 'var(--color-primary)' }} />
              )}
            </div>

            {/* Turn State Indicator (Human & Plain) */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.95rem',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: turnState === TURN_STATE.LISTENING ? 'var(--accent-teal-subtle)' : 'var(--bg-secondary)',
              color: turnState === TURN_STATE.LISTENING ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginTop: '1.25rem',
              marginBottom: '0.5rem',
              border: '1px solid var(--border-color)'
            }}>
              {isTtsLoading && <span>Preparing gentle voice...</span>}
              {!isTtsLoading && turnState === TURN_STATE.SPEAKING && <span>Listening to question...</span>}
              {turnState === TURN_STATE.LISTENING && <span>Listening... speak naturally whenever you're ready</span>}
              {turnState === TURN_STATE.CONFIRMING && <span>Reviewing your response</span>}
              {turnState === TURN_STATE.TYPING && <span>Take your time typing below</span>}
            </div>

            {/* Ambient Status Badges (Subtle, Non-Alarming) */}
            <div className="ambient-badges-row" aria-label="Ambient telemetry indicators">
              {isTtsLoading && (
                <div className="ambient-status-badge badge-listening">
                  <span className="ambient-badge-dot" style={{ backgroundColor: 'var(--accent-teal)' }} />
                  <IconSparkles size={12} />
                  <span>Neural voice streaming...</span>
                </div>
              )}
              {allowMic && (
                <div className={`ambient-status-badge ${turnState === TURN_STATE.LISTENING ? 'badge-listening' : ''}`}>
                  <span className="ambient-badge-dot" />
                  <IconMic size={12} />
                  <span>Vocal prosody active</span>
                </div>
              )}
              {allowCamera && cameraActive && (
                <div className="ambient-status-badge">
                  <span
                    className="ambient-badge-dot"
                    style={{ backgroundColor: liveFacialTelemetry.hasFace ? 'var(--status-minimal-dot)' : 'var(--text-muted)' }}
                  />
                  <IconVideo size={12} />
                  <span>Facial expression tracking online</span>
                </div>
              )}
              {turnState === TURN_STATE.LISTENING && (
                <div className="ambient-status-badge badge-listening">
                  <span className="ambient-badge-dot" />
                  <IconEar size={12} />
                  <span>Listening closely...</span>
                </div>
              )}
            </div>

            {/* Real-Time Web Audio API Canvas Visualizer (Active during LISTENING only) */}
            {turnState === TURN_STATE.LISTENING && (
              <canvas
                ref={visualizerCanvasRef}
                className="screening-canvas-visualizer"
                aria-label="Real-time voice waveform"
              />
            )}

            {/* Acknowledgement Note if present */}
            {acknowledgementNote && (
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0', fontStyle: 'italic' }}>
                "{acknowledgementNote}"
              </p>
            )}

            {/* The Question in Clear, Warm Typography */}
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0.5rem 0 1.5rem 0',
              lineHeight: 1.45,
              maxWidth: '620px'
            }}>
              "{currentQuestion.prompt}"
            </h2>

            {/* Interaction 1: Listening Mode Active Input */}
            {turnState === TURN_STATE.LISTENING && (
              <div style={{ width: '100%', maxWidth: '560px', margin: '0.5rem 0 1.25rem 0' }}>
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  minHeight: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  color: recognizedText ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {recognizedText ? (
                    <span style={{ fontWeight: 500 }}>"{recognizedText}"</span>
                  ) : (
                    <span style={{ fontStyle: 'italic' }}>We're listening... take your time.</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-patient-primary"
                    onClick={stopSpeechRecognition}
                    style={{ fontSize: '0.9rem', padding: '0.65rem 1.4rem' }}
                  >
                    Done Speaking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (recognitionRef.current) {
                        try { recognitionRef.current.stop(); } catch {}
                      }
                      setTurnState(TURN_STATE.TYPING);
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '0.65rem 1.2rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    Type answer instead
                  </button>
                </div>
              </div>
            )}

            {/* Interaction 2: Reviewing / Confirming What Was Heard */}
            {turnState === TURN_STATE.CONFIRMING && (
              <div style={{ width: '100%', maxWidth: '560px', margin: '0.5rem 0 1.25rem 0' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'left' }}>
                  Here is what we heard:
                </div>
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--accent-teal-border)',
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  lineHeight: 1.55
                }}>
                  "{recognizedText || typedText}"
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecognizedText('');
                        setTypedText('');
                        startSpeechRecognition();
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '0.5rem 0.95rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IconMic size={13} />
                        <span>Try speaking again</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTurnState(TURN_STATE.TYPING)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '0.5rem 0.95rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IconEdit size={13} />
                        <span>Edit text</span>
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-patient-primary"
                    onClick={() => handleConfirmAnswer(recognizedText || typedText)}
                    style={{ fontSize: '0.9rem', padding: '0.65rem 1.4rem' }}
                  >
                    <span>Confirm</span>
                    <IconChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Interaction 3: Typing Mode */}
            {turnState === TURN_STATE.TYPING && (
              <div style={{ width: '100%', maxWidth: '560px', margin: '0.5rem 0 1.25rem 0', textAlign: 'left' }}>
                <textarea
                  className="clinical-textarea"
                  rows={4}
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={currentQuestion.placeholder || "Type how you've been feeling naturally..."}
                  style={{
                    width: '100%',
                    fontSize: '0.95rem',
                    lineHeight: 1.55,
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '1rem'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {allowMic && speechSupported ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRecognizedText('');
                        startSpeechRecognition();
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '0.5rem 1rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IconMic size={14} />
                        <span>Speak instead</span>
                      </span>
                    </button>
                  ) : <span />}

                  <button
                    type="button"
                    className="btn-patient-primary"
                    disabled={!typedText.trim()}
                    onClick={() => handleConfirmAnswer(typedText)}
                    style={{ fontSize: '0.9rem', padding: '0.65rem 1.4rem' }}
                  >
                    <span>Continue</span>
                    <IconChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Utility Controls (Repeat, Skip) */}
            <div style={{
              display: 'flex',
              gap: '1.25rem',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1.25rem',
              width: '100%',
              justifyContent: 'center',
              marginTop: '0.5rem'
            }}>
              <button
                type="button"
                onClick={handleRepeatQuestion}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <IconVolume2 size={15} />
                <span>Repeat question</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAnswer("Patient opted to proceed to next question.")}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Skip this question
              </button>
            </div>

          </div>

          {/* REASSURING CAMERA PREVIEW (SOFT & JARGON-FREE) */}
          {allowCamera && (
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: cameraActive && liveFacialTelemetry.hasFace ? 'var(--status-minimal-dot)' : cameraActive ? '#D97706' : 'var(--text-muted)'
                }} />
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {cameraActive && liveFacialTelemetry.hasFace
                    ? 'Camera ready • Everything stays private on your device'
                    : cameraActive
                    ? 'Getting ready... please face the camera'
                    : 'Camera standby'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {isPreviewVisible ? 'Hide preview' : 'Show preview'}
              </button>

              {/* Keep video element rendered in DOM for continuous pipeline */}
              <div style={{
                width: isPreviewVisible ? '120px' : '1px',
                height: isPreviewVisible ? '90px' : '1px',
                opacity: isPreviewVisible ? 1 : 0,
                position: isPreviewVisible ? 'static' : 'absolute',
                left: isPreviewVisible ? 'auto' : '-9999px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: '#000',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SAFETY / CRISIS INTERRUPT MODAL */}
      {/* ============================================================== */}
      {currentStage === STAGE.CRISIS_ALERT && (
        <div className="workstation-panel" style={{ maxWidth: '680px', margin: '2rem auto', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          <div className="panel-header" style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1rem 1.25rem' }}>
            <div className="panel-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <IconShieldCheck size={26} style={{ color: '#ef4444' }} />
              <div>
                <h2 style={{ fontSize: '1.15rem', color: '#ef4444', margin: 0 }}>
                  Immediate Support &amp; Safety Resources
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Your safety and well-being are what matter most
                </span>
              </div>
            </div>
          </div>

          <div className="card-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
              We hear that you are carrying a lot right now. MindVision is a decision-support check-in tool and cannot provide emergency medical care. Please reach out to someone who can help right away:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  National Crisis Lifeline
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444', margin: '0.2rem 0' }}>
                  988
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Free, confidential 24/7 call or text
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Tele-MANAS (India)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-teal)', margin: '0.2rem 0' }}>
                  14416
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Toll-free 24/7 mental health service
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Emergency Services
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  911 / 112
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Call your local emergency operator
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCurrentStage(STAGE.CONVERSATION);
                  setTurnState(TURN_STATE.TYPING);
                }}
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
              >
                I am safe, continue check-in
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: 'doctors' }));
                }}
                style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              >
                Connect with an On-Call Clinician ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SYNTHESIZING STAGE */}
      {/* ============================================================== */}
      {currentStage === STAGE.SYNTHESIZING && (
        <div style={{ maxWidth: '520px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
          <div className="calm-breathing-orb listening" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSparkles size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Taking a moment to reflect...
          </h2>
          <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Preparing your gentle wellness summary. Just a second.
          </p>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. RESULT PAGE (Calm, Reassuring, Patient-Focused) */}
      {/* ============================================================== */}
      {currentStage === STAGE.RESULTS && completedReport && (() => {
        const isElevated = completedReport.riskLevel === 'ELEVATED' || completedReport.riskLevel === 'SEVERE';
        const headline = isElevated ? "It might help to talk with someone" : "Steady & calm pattern reported";
        const explanation = isElevated
          ? "We noticed subtle signs of stress in your responses today. Remember that carrying a lot is hard, and gentle support is always available."
          : "Your self-reported answers and estimated signals reflect a calm, steady pattern today. Nice job taking time out of your day to pause and check in with yourself.";

        return (
          <div className="patient-view-shell" style={{ width: '100%' }}>
            
            {/* Main Result Card */}
            <div className="patient-result-card">
              <div
                className="patient-result-icon-wrapper"
                style={{
                  backgroundColor: isElevated ? 'var(--status-elevated-bg)' : 'var(--status-minimal-bg)',
                  color: isElevated ? 'var(--status-elevated-text)' : 'var(--status-minimal-text)',
                  border: `1px solid ${isElevated ? 'var(--status-elevated-border)' : 'var(--status-minimal-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isElevated ? <IconHeartPulse size={28} /> : <IconLeaf size={28} />}
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                Check-in Summary • {completedReport.timestamp || 'Today'}
              </div>

              <h1 className="patient-result-headline">
                {headline}
              </h1>

              <p className="patient-result-explanation">
                {explanation}
              </p>

              {/* The One Clear Recommended Action */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', width: '100%', maxWidth: '380px', marginTop: '0.5rem' }}>
                {isElevated ? (
                  <button
                    type="button"
                    className="btn-patient-primary"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: 'doctors' }));
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>Talk to a Counselor</span>
                    <span>›</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-patient-primary"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: 'results' }));
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>See My Check-in History</span>
                    <span>›</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentStage(STAGE.INTRO)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Start another check-in
                </button>
              </div>
            </div>

            {/* Personalized Coping Toolkit Recommendation (Feature 3) */}
            {(() => {
              const coping = getCopingRecommendation(completedReport);
              if (!coping) return null;
              return (
                <div
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1.5px solid var(--accent-teal-border)',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>{coping.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-teal)', fontWeight: 700 }}>
                          Personalized Coping Recommendation
                        </div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {coping.activityTitle}
                        </h2>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: 'var(--accent-teal-soft-bg)',
                        color: 'var(--accent-teal)',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-pill)'
                      }}
                    >
                      Gentle &amp; Optional
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    {coping.reason}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Supports self-reflection • Non-diagnostic
                    </span>

                    <button
                      type="button"
                      className="btn-patient-primary"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('NAVIGATE_WELLNESS_ACTIVITY', {
                            detail: { activity: coping.type }
                          })
                        );
                      }}
                      style={{ padding: '0.55rem 1.35rem', fontSize: '0.88rem' }}
                    >
                      <span>{coping.buttonText}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Gentle Collapsible "Want more detail?" Section (Curious Patients) */}
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: '1.25rem 1.5rem',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <div
                onClick={() => setShowHowItWorks(!showHowItWorks)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Want more detail?
                  </h2>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                    A simple explanation of how we noticed your check-in cues.
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {showHowItWorks ? '▲ Hide' : '▼ View'}
                </span>
              </div>

              {showHowItWorks && (
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.92rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6
                }}>
                  <p style={{ margin: '0 0 0.75rem 0' }}>
                    MindVision looks gently at three everyday reflection cues:
                  </p>
                  <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li><strong>Your words:</strong> The thoughts and experiences you shared with us.</li>
                    <li><strong>Your speaking rhythm:</strong> Natural pauses, warmth, and steadiness in your voice tone.</li>
                    <li><strong>Gentle expressions:</strong> Subtle signs of brow concentration or facial relaxation.</li>
                  </ul>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Together, these help you pause and notice how you're feeling without harsh judgments or technical scoring.
                  </p>
                </div>
              )}
            </div>

            {/* Reassuring, Non-Alarming Disclaimer */}
            <div
              style={{
                textAlign: 'center',
                padding: '0.5rem 1rem',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5
              }}
            >
              This is a wellness check-in, not a medical diagnosis. If you're struggling, caring professionals are always here to listen.
            </div>

          </div>
        );
      })()}

    </div>
  );
}
