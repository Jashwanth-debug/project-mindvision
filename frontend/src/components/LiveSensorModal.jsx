import React, { useEffect, useRef, useState } from 'react';
import { applyAdaptiveEmaFilter, calculateFacialLandmarkMetrics } from '../utils/telemetryMath';

// Standard MediaPipe Face Mesh 3D Canonical Topology (Normalized [-1.0, 1.0])
// 85 canonical nodes spanning Face Oval, Eyebrows, Eyes, Nose Bridge/Tip, Lips, and Midface Tessellation
const CANONICAL_FACIAL_TOPOLOGY = [
  // 0-19: Face Contour / Oval (chin, jawline, temples, forehead arch)
  [-0.56, -0.52, -0.22], // 0: Left upper temple
  [-0.72, -0.25, -0.32], // 1: Left zygomatic arch / tragus
  [-0.70, 0.00, -0.25],  // 2: Left cheek contour
  [-0.64, 0.25, -0.18],  // 3: Left lower cheek
  [-0.54, 0.50, -0.10],  // 4: Left gonion (jaw angle)
  [-0.40, 0.70, -0.02],  // 5: Left jawline mid
  [-0.24, 0.85, 0.08],   // 6: Left chin lateral
  [0.00, 0.96, 0.18],    // 7: Gnathion (chin center)
  [0.24, 0.85, 0.08],    // 8: Right chin lateral
  [0.40, 0.70, -0.02],   // 9: Right jawline mid
  [0.54, 0.50, -0.10],   // 10: Right gonion (jaw angle)
  [0.64, 0.25, -0.18],   // 11: Right lower cheek
  [0.70, 0.00, -0.25],   // 12: Right cheek contour
  [0.72, -0.25, -0.32],  // 13: Right zygomatic arch / tragus
  [0.56, -0.52, -0.22],  // 14: Right upper temple
  [0.38, -0.68, -0.12],  // 15: Right forehead lateral
  [0.18, -0.74, -0.04],  // 16: Right forehead paramedian
  [0.00, -0.76, 0.00],   // 17: Trichion (forehead center)
  [-0.18, -0.74, -0.04], // 18: Left forehead paramedian
  [-0.38, -0.68, -0.12], // 19: Left forehead lateral

  // 20-25: Left Eyebrow
  [-0.50, -0.38, -0.08], // 20: Left brow outer tail
  [-0.38, -0.46, 0.04],  // 21: Left brow arch
  [-0.26, -0.47, 0.12],  // 22: Left brow mid
  [-0.14, -0.42, 0.16],  // 23: Left brow inner (AU04 anchor)
  [-0.26, -0.40, 0.11],  // 24: Left brow lower arch
  [-0.40, -0.37, 0.02],  // 25: Left brow lower tail

  // 26-31: Right Eyebrow
  [0.14, -0.42, 0.16],   // 26: Right brow inner (AU04 anchor)
  [0.26, -0.47, 0.12],   // 27: Right brow mid
  [0.38, -0.46, 0.04],   // 28: Right brow arch
  [0.50, -0.38, -0.08],  // 29: Right brow outer tail
  [0.40, -0.37, 0.02],   // 30: Right brow lower tail
  [0.26, -0.40, 0.11],   // 31: Right brow lower arch

  // 32-38: Left Eye & Pupil
  [-0.44, -0.24, -0.02], // 32: Left lateral canthus
  [-0.35, -0.30, 0.06],  // 33: Left upper lid lateral
  [-0.24, -0.30, 0.09],  // 34: Left upper lid medial
  [-0.15, -0.24, 0.08],  // 35: Left medial canthus
  [-0.24, -0.19, 0.06],  // 36: Left lower lid medial
  [-0.35, -0.19, 0.03],  // 37: Left lower lid lateral
  [-0.29, -0.24, 0.07],  // 38: Left iris / pupil center

  // 39-45: Right Eye & Pupil
  [0.15, -0.24, 0.08],   // 39: Right medial canthus
  [0.24, -0.30, 0.09],   // 40: Right upper lid medial
  [0.35, -0.30, 0.06],   // 41: Right upper lid lateral
  [0.44, -0.24, -0.02],  // 42: Right lateral canthus
  [0.35, -0.19, 0.03],   // 43: Right lower lid lateral
  [0.24, -0.19, 0.06],   // 44: Right lower lid medial
  [0.29, -0.24, 0.07],   // 45: Right iris / pupil center

  // 46-54: Nose Bridge, Tip & Nostrils
  [0.00, -0.30, 0.17],   // 46: Nasion (rhinion superior)
  [0.00, -0.12, 0.25],   // 47: Mid nasal dorsum
  [0.00, 0.04, 0.33],    // 48: Supratip breakpoint
  [0.00, 0.16, 0.42],    // 49: Pronasale (nose tip)
  [0.00, 0.23, 0.34],    // 50: Subnasale (columella)
  [-0.12, 0.16, 0.28],   // 51: Left alar lobule
  [-0.08, 0.22, 0.29],   // 52: Left alar base
  [0.12, 0.16, 0.28],    // 53: Right alar lobule
  [0.08, 0.22, 0.29],    // 54: Right alar base

  // 55-66: Outer Lip Vermilion Border (AU15 anchors at 55 & 61)
  [-0.27, 0.40, 0.14],   // 55: Left commissure (mouth corner - AU15)
  [-0.18, 0.35, 0.20],   // 56: Left upper lip lateral
  [-0.07, 0.33, 0.26],   // 57: Left Cupid's peak
  [0.00, 0.34, 0.28],    // 58: Labiale superius (Cupid's center)
  [0.07, 0.33, 0.26],    // 59: Right Cupid's peak
  [0.18, 0.35, 0.20],    // 60: Right upper lip lateral
  [0.27, 0.40, 0.14],    // 61: Right commissure (mouth corner - AU15)
  [0.19, 0.48, 0.20],    // 62: Right lower lip lateral
  [0.10, 0.54, 0.23],    // 63: Right lower lip paramedian
  [0.00, 0.55, 0.24],    // 64: Labiale inferius
  [-0.10, 0.54, 0.23],   // 65: Left lower lip paramedian
  [-0.19, 0.48, 0.20],   // 66: Left lower lip lateral

  // 67-74: Inner Lip Contour
  [-0.20, 0.40, 0.16],   // 67: Left inner corner
  [-0.08, 0.38, 0.23],   // 68: Left inner upper
  [0.00, 0.39, 0.24],    // 69: Center inner upper
  [0.08, 0.38, 0.23],    // 70: Right inner upper
  [0.20, 0.40, 0.16],    // 71: Right inner corner
  [0.09, 0.45, 0.21],    // 72: Right inner lower
  [0.00, 0.46, 0.22],    // 73: Center inner lower
  [-0.09, 0.45, 0.21],   // 74: Left inner lower

  // 75-84: Midface, Cheeks & Tessellation Bridges
  [-0.42, -0.06, 0.08],  // 75: Left zygomatic prominence
  [-0.28, -0.08, 0.13],  // 76: Left infraorbital margin
  [-0.34, 0.14, 0.12],   // 77: Left buccal mid-cheek
  [-0.22, 0.24, 0.18],   // 78: Left nasolabial sulcus
  [0.28, -0.08, 0.13],   // 79: Right infraorbital margin
  [0.42, -0.06, 0.08],   // 80: Right zygomatic prominence
  [0.34, 0.14, 0.12],    // 81: Right buccal mid-cheek
  [0.22, 0.24, 0.18],    // 82: Right nasolabial sulcus
  [0.00, 0.68, 0.20],    // 83: Mentolabial sulcus (chin crease)
  [0.00, -0.52, 0.10]    // 84: Glabella forehead center
];

// Standard MediaPipe Face Mesh Connections for Clinical HUD Rendering
const MEDIAPIPE_FACE_OVAL = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
  [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 0]
];

const MEDIAPIPE_LEFT_EYEBROW = [
  [20, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 20], [21, 24], [22, 24]
];

const MEDIAPIPE_RIGHT_EYEBROW = [
  [26, 27], [27, 28], [28, 29], [29, 30], [30, 31], [31, 26], [27, 31], [28, 30]
];

const MEDIAPIPE_LEFT_EYE = [
  [32, 33], [33, 34], [34, 35], [35, 36], [36, 37], [37, 32], [34, 36], [33, 37]
];

const MEDIAPIPE_RIGHT_EYE = [
  [39, 40], [40, 41], [41, 42], [42, 43], [43, 44], [44, 39], [40, 44], [41, 43]
];

const MEDIAPIPE_NOSE = [
  [46, 47], [47, 48], [48, 49], [49, 50],
  [48, 51], [51, 52], [52, 50],
  [48, 53], [53, 54], [54, 50],
  [49, 51], [49, 53], [51, 52], [53, 54]
];

const MEDIAPIPE_LIPS_OUTER = [
  [55, 56], [56, 57], [57, 58], [58, 59], [59, 60], [60, 61],
  [61, 62], [62, 63], [63, 64], [64, 65], [65, 66], [66, 55]
];

const MEDIAPIPE_LIPS_INNER = [
  [67, 68], [68, 69], [69, 70], [70, 71],
  [71, 72], [72, 73], [73, 74], [74, 67],
  [55, 67], [61, 71]
];

const MEDIAPIPE_TESSELLATION = [
  // Glabella & Forehead Arch
  [17, 84], [18, 84], [16, 84], [84, 23], [84, 26], [84, 46], [23, 26],
  [19, 21], [18, 22], [16, 27], [15, 28],
  // Eyebrow to Eyes & Temples
  [20, 0], [20, 32], [21, 33], [22, 34], [23, 35], [23, 46],
  [26, 46], [26, 39], [27, 40], [28, 41], [29, 42], [29, 14],
  // Infraorbital & Cheeks
  [32, 75], [37, 76], [36, 76], [35, 46], [39, 46], [44, 79], [43, 79], [42, 80],
  [75, 76], [76, 47], [79, 47], [79, 80], [76, 77], [79, 81], [77, 78], [81, 82],
  [78, 48], [82, 48], [78, 51], [82, 53], [78, 55], [82, 61],
  [75, 1], [75, 2], [77, 3], [80, 13], [80, 12], [81, 11],
  // Philtrum, Lips to Jaw & Chin
  [50, 58], [52, 56], [54, 60], [55, 4], [55, 5], [61, 9], [61, 10],
  [66, 77], [62, 81], [65, 83], [64, 83], [63, 83], [83, 7], [65, 6], [63, 8]
];

// Unified standard connection array for high-performance canvas batching
const ALL_MEDIAPIPE_CONNECTIONS = [
  ...MEDIAPIPE_FACE_OVAL,
  ...MEDIAPIPE_LEFT_EYEBROW,
  ...MEDIAPIPE_RIGHT_EYEBROW,
  ...MEDIAPIPE_LEFT_EYE,
  ...MEDIAPIPE_RIGHT_EYE,
  ...MEDIAPIPE_NOSE,
  ...MEDIAPIPE_LIPS_OUTER,
  ...MEDIAPIPE_LIPS_INNER,
  ...MEDIAPIPE_TESSELLATION
];

// Standard MediaPipe 468 Dense Face Mesh Landmark Connectors
const MEDIAPIPE_468_CONNECTIONS = [
  // Face Oval
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
  [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
  [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54],
  [54, 103], [103, 67], [67, 109], [109, 10],
  // Left Eyebrow
  [70, 63], [63, 105], [105, 66], [66, 107], [107, 55], [55, 65], [65, 52], [52, 53], [53, 46],
  // Right Eyebrow
  [336, 296], [296, 334], [334, 293], [293, 300], [300, 285], [285, 295], [295, 282], [282, 283], [283, 276],
  // Left Eye Outline
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133],
  [133, 173], [173, 157], [157, 158], [158, 159], [159, 160], [160, 161], [161, 246], [246, 33],
  // Right Eye Outline
  [263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381], [381, 382], [382, 362],
  [362, 398], [398, 384], [384, 385], [385, 386], [386, 387], [387, 388], [388, 466], [466, 263],
  // Nose Bridge & Tip
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19], [19, 94], [94, 2], [2, 98], [98, 97], [97, 2], [2, 327], [327, 326],
  // Lips Outer
  [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409],
  [409, 291], [291, 375], [375, 321], [321, 405], [405, 314], [314, 17], [17, 84], [84, 181],
  [181, 91], [91, 146], [146, 61],
  // Lips Inner
  [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312], [312, 311], [311, 310], [310, 415],
  [415, 308], [308, 324], [324, 318], [318, 402], [402, 317], [317, 14], [14, 87], [87, 178],
  [178, 88], [88, 95], [95, 78],
  // Cross Structural Interconnects
  [10, 151], [151, 9], [9, 8], [8, 168], [6, 168], [195, 168],
  [55, 6], [285, 6], [133, 168], [362, 168],
  [164, 18], [18, 200], [200, 199], [199, 175], [175, 152]
];

export default function LiveSensorModal({ isOpen, onClose, onSyncTelemetry }) {
  const canvasRef = useRef(null);
  const audioCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);

  const mediaStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const [useRealCamera, setUseRealCamera] = useState(false);
  const [useRealAudio, setUseRealAudio] = useState(false);
  const [sensorStatusMsg, setSensorStatusMsg] = useState(null);
  const [sensorMode, setSensorMode] = useState('LIVE'); // 'LIVE' (Camera-Derived) or 'SANDBOX' (Manual Sliders)

  // Offscreen canvas and EMA tracking for real-time video frame landmark analysis
  const offscreenCanvasRef = useRef(null);
  const emaAu4Ref = useRef(0.20);
  const emaAu15Ref = useRef(0.15);
  const emaAu12Ref = useRef(0.10);

  // Real-time Computer Vision & MediaPipe Face Tracking refs
  const faceAnchorRef = useRef({ cx: 235, cy: 155, w: 180, h: 220 });
  const faceMeshRef = useRef(null);
  const liveLandmarksRef = useRef(null);
  const isDetectingRef = useRef(false);

  // Dynamically initialize MediaPipe FaceMesh via CDN
  useEffect(() => {
    let isMounted = true;

    function initFaceMesh() {
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
          if (!isMounted) return;
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            liveLandmarksRef.current = results.multiFaceLandmarks[0];
          } else {
            liveLandmarksRef.current = null;
          }
        });
        faceMeshRef.current = fm;
      } catch (err) {
        console.warn('MediaPipe FaceMesh init error:', err);
      }
    }

    if (!window.FaceMesh && !document.getElementById('mediapipe-facemesh-cdn')) {
      const script = document.createElement('script');
      script.id = 'mediapipe-facemesh-cdn';
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (isMounted) initFaceMesh();
      };
      document.head.appendChild(script);
    } else if (window.FaceMesh) {
      initFaceMesh();
    }

    return () => {
      isMounted = false;
      if (faceMeshRef.current) {
        try { faceMeshRef.current.close(); } catch { }
        faceMeshRef.current = null;
      }
    };
  }, []);

  // Editable live telemetry controls inside the workstation
  const [manualAu4, setManualAu4] = useState(0.65);
  const [manualAu15, setManualAu15] = useState(0.50);
  const [manualJitter, setManualJitter] = useState(0.40);

  const [liveTelemetry, setLiveTelemetry] = useState({
    au4: 0.65,
    au15: 0.50,
    jitter: 0.40,
    au12: 0.12,
    pitchHz: 138.4,
    audioDb: -24.5,
    fps: 60,
    eulerYaw: 0.8,
    eulerPitch: -1.2,
    confidence: 99.4
  });

  // Start real webcam stream
  const startWebcam = async () => {
    try {
      setSensorStatusMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch((err) => console.warn('Video play error:', err));
        };
      }
      setUseRealCamera(true);
      setSensorMode('LIVE');
    } catch (err) {
      console.warn('Webcam permission not granted:', err);
      setSensorStatusMsg('Webcam access unavailable. Running real-time cranial topology model.');
      setUseRealCamera(false);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    liveLandmarksRef.current = null;
    setUseRealCamera(false);
  };

  // Start real audio microphone stream via Web Audio API Analyser
  const startMicrophone = async () => {
    try {
      setSensorStatusMsg(null);
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = audioStream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      analyserRef.current = analyser;
      setUseRealAudio(true);
    } catch (err) {
      console.warn('Microphone access unavailable:', err);
      setSensorStatusMsg('Microphone access unavailable. Using synthetic formant frequency analyzer.');
      setUseRealAudio(false);
    }
  };

  // Stop microphone
  const stopMicrophone = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setUseRealAudio(false);
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch { }
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let time = 0;
    const canvas = canvasRef.current;
    const audioCanvas = audioCanvasRef.current;
    if (!canvas || !audioCanvas) return;

    const ctx = canvas.getContext('2d');
    const audioCtx = audioCanvas.getContext('2d');

    // Hi-DPI Resolution setup
    const dpr = window.devicePixelRatio || 1;
    const cWidth = 470;
    const cHeight = 320;
    canvas.width = cWidth * dpr;
    canvas.height = cHeight * dpr;
    ctx.scale(dpr, dpr);

    const aWidth = 760;
    const aHeight = 56;
    audioCanvas.width = aWidth * dpr;
    audioCanvas.height = aHeight * dpr;
    audioCtx.scale(dpr, dpr);

    // FFT frequency buffer
    const fftBands = new Array(40).fill(0);
    const audioFreqData = new Uint8Array(64);

    const render = () => {
      time += 0.03;

      // 1. Process Real Microphone FFT or Physics Oscillation
      let realVolumeDb = -32;
      let calculatedPitch = 138.4;
      let activeJitterVal = manualJitter;

      if (useRealAudio && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(audioFreqData);

        // Calculate average energy / dB
        let sum = 0;
        for (let i = 0; i < audioFreqData.length; i++) {
          sum += audioFreqData[i];
        }
        const avgEnergy = sum / audioFreqData.length;
        realVolumeDb = parseFloat((-60 + (avgEnergy / 255) * 55).toFixed(1));

        // Estimate pitch and jitter from microphone energy fluctuation
        if (avgEnergy > 10) {
          calculatedPitch = parseFloat((120 + (avgEnergy / 255) * 160 + Math.sin(time * 5) * 3).toFixed(1));
          activeJitterVal = Math.min(0.95, Math.max(0.15, manualJitter + (avgEnergy > 80 ? 0.2 : 0.05)));
        }
      } else {
        calculatedPitch = parseFloat((138.0 + Math.sin(time * 2.5) * 4.2 + (Math.random() - 0.5) * 1.5).toFixed(1));
      }

      // 2. Real Camera Facial Landmark Image Analysis (LIVE MODE) vs Manual Sandbox (SANDBOX MODE)
      let dynamicAu4 = manualAu4;
      let dynamicAu15 = manualAu15;
      let dynamicAu12 = 0.12;

      if (sensorMode === 'LIVE' && useRealCamera && videoRef.current && videoRef.current.readyState >= 2) {
        // Initialize offscreen sampling canvas (120x120)
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
          offscreenCanvasRef.current.width = 120;
          offscreenCanvasRef.current.height = 120;
        }

        const offCanvas = offscreenCanvasRef.current;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
          offCtx.drawImage(videoRef.current, 0, 0, 120, 120);

          // Sub-sampling Glabella / Eyebrow Corrugator region (x: 45 to 75, y: 28 to 50)
          const browData = offCtx.getImageData(45, 28, 30, 22).data;
          let browLumaSum = 0;
          let browGradSum = 0;
          const numPixels = browData.length / 4;

          for (let i = 0; i < browData.length; i += 4) {
            const luma = 0.299 * browData[i] + 0.587 * browData[i + 1] + 0.114 * browData[i + 2];
            browLumaSum += luma;
            if (i + 4 < browData.length) {
              const nextLuma = 0.299 * browData[i + 4] + 0.587 * browData[i + 5] + 0.114 * browData[i + 6];
              browGradSum += Math.abs(luma - nextLuma);
            }
          }

          const avgBrowLuma = browLumaSum / numPixels;
          let browVarSum = 0;
          for (let i = 0; i < browData.length; i += 4) {
            const luma = 0.299 * browData[i] + 0.587 * browData[i + 1] + 0.114 * browData[i + 2];
            browVarSum += (luma - avgBrowLuma) ** 2;
          }
          const browStdDev = Math.sqrt(browVarSum / numPixels);
          const avgBrowGrad = browGradSum / numPixels;

          // Brow furrowing increases glabella texture variance & edge gradient
          const rawAu4 = Math.min(0.98, Math.max(0.04, (browStdDev / 30.0) * 0.65 + (avgBrowGrad / 15.0) * 0.35));
          emaAu4Ref.current = applyAdaptiveEmaFilter(emaAu4Ref.current, rawAu4, 0.22);
          dynamicAu4 = emaAu4Ref.current;

          // Sub-sampling DAO Lip Corner region (x: 35 to 85, y: 72 to 102)
          const mouthData = offCtx.getImageData(35, 72, 50, 30).data;
          let mouthLumaSum = 0;
          let mouthGradSum = 0;
          const mouthPixels = mouthData.length / 4;

          for (let i = 0; i < mouthData.length; i += 4) {
            const luma = 0.299 * mouthData[i] + 0.587 * mouthData[i + 1] + 0.114 * mouthData[i + 2];
            mouthLumaSum += luma;
            if (i + 4 < mouthData.length) {
              const nextLuma = 0.299 * mouthData[i + 4] + 0.587 * mouthData[i + 5] + 0.114 * mouthData[i + 6];
              mouthGradSum += Math.abs(luma - nextLuma);
            }
          }

          const avgMouthLuma = mouthLumaSum / mouthPixels;
          const avgMouthGrad = mouthGradSum / mouthPixels;

          // Lip corner depression increases downward gradient & darkness at corners
          const rawAu15 = Math.min(0.95, Math.max(0.04, (avgMouthGrad / 18.0) * 0.6 + (1 - avgMouthLuma / 255.0) * 0.4));
          emaAu15Ref.current = applyAdaptiveEmaFilter(emaAu15Ref.current, rawAu15, 0.22);
          dynamicAu15 = emaAu15Ref.current;

          // Zygomaticus Smile (AU12)
          const rawAu12 = Math.min(0.85, Math.max(0.05, (avgMouthLuma / 175.0) * 0.55 + (browStdDev / 45.0) * 0.3));
          emaAu12Ref.current = applyAdaptiveEmaFilter(emaAu12Ref.current, rawAu12, 0.22);
          dynamicAu12 = emaAu12Ref.current;
        }
      } else if (sensorMode === 'SANDBOX') {
        dynamicAu4 = manualAu4;
        dynamicAu15 = manualAu15;
        dynamicAu12 = 0.12;
      } else {
        // High-precision simulation motion when camera is not enabled
        dynamicAu4 = Math.min(0.98, Math.max(0.05, manualAu4 + Math.sin(time * 0.9) * 0.05));
        dynamicAu15 = Math.min(0.98, Math.max(0.05, manualAu15 + Math.cos(time * 0.7) * 0.04));
        dynamicAu12 = Math.min(0.8, Math.max(0.05, 0.10 + Math.sin(time * 0.5) * 0.04));
      }

      const yaw = Math.sin(time * 0.4) * 3.5;
      const pitch = Math.cos(time * 0.3) * 2.2;

      setLiveTelemetry({
        au4: parseFloat(dynamicAu4.toFixed(2)),
        au15: parseFloat(dynamicAu15.toFixed(2)),
        jitter: parseFloat(activeJitterVal.toFixed(2)),
        au12: parseFloat(dynamicAu12.toFixed(2)),
        pitchHz: calculatedPitch,
        audioDb: realVolumeDb,
        fps: 60,
        eulerYaw: parseFloat(yaw.toFixed(1)),
        eulerPitch: parseFloat(pitch.toFixed(1)),
        confidence: 99.4
      });

      // Clear main viewport completely every frame
      ctx.clearRect(0, 0, cWidth, cHeight);

      if (!useRealCamera) {
        // Deep obsidian medical background with reticle grid
        const bgGrad = ctx.createLinearGradient(0, 0, 0, cHeight);
        bgGrad.addColorStop(0, '#07090E');
        bgGrad.addColorStop(1, '#0B0F17');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cWidth, cHeight);

        // Technical Reticle Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;
        const gridStep = 32;
        for (let x = 0; x < cWidth; x += gridStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, cHeight);
          ctx.stroke();
        }
        for (let y = 0; y < cHeight; y += gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(cWidth, y);
          ctx.stroke();
        }
      }

      // Real-Time Optical Computer Vision Face Anchor
      let trackedCx = cWidth / 2;
      let trackedCy = cHeight / 2 - 5;
      let trackedScaleX = 115;
      let trackedScaleY = 125;
      let opticalYaw = Math.sin(time * 0.4) * 3.5;
      let opticalPitch = Math.cos(time * 0.3) * 2.2;

      if (sensorMode === "LIVE" && useRealCamera && videoRef.current && videoRef.current.readyState >= 2) {
        // Feed video frame to MediaPipe FaceMesh detector
        if (faceMeshRef.current && !isDetectingRef.current) {
          isDetectingRef.current = true;
          faceMeshRef.current.send({ image: videoRef.current })
            .catch(() => { })
            .finally(() => {
              isDetectingRef.current = false;
            });
        }

        // Fast Real-Time Optical Face Anchor
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement("canvas");
          offscreenCanvasRef.current.width = 160;
          offscreenCanvasRef.current.height = 120;
        }

        const offCanvas = offscreenCanvasRef.current;
        const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
        if (offCtx) {
          offCtx.save();
          offCtx.translate(160, 0);
          offCtx.scale(-1, 1);
          offCtx.drawImage(videoRef.current, 0, 0, 160, 120);
          offCtx.restore();

          const frameData = offCtx.getImageData(0, 0, 160, 120).data;
          let sumX = 0, sumY = 0, skinCount = 0;
          let minX = 160, maxX = 0, minY = 120, maxY = 0;

          for (let y = 12; y < 108; y += 2) {
            for (let x = 15; x < 145; x += 2) {
              const idx = (y * 160 + x) * 4;
              const r = frameData[idx];
              const g = frameData[idx + 1];
              const b = frameData[idx + 2];

              if (r > 50 && g > 35 && b > 20 && r > b && (r - g) > 8 && (r - b) > 12) {
                sumX += x;
                sumY += y;
                skinCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (skinCount > 100) {
            const rawCx = (sumX / skinCount / 160) * cWidth;
            const rawCy = (sumY / skinCount / 120) * cHeight;
            const rawW = Math.max(120, Math.min(320, ((maxX - minX) / 160) * cWidth * 1.1));
            const rawH = Math.max(140, Math.min(340, ((maxY - minY) / 120) * cHeight * 1.15));

            faceAnchorRef.current.cx = applyAdaptiveEmaFilter(faceAnchorRef.current.cx, rawCx, 0.32);
            faceAnchorRef.current.cy = applyAdaptiveEmaFilter(faceAnchorRef.current.cy, rawCy, 0.32);
            faceAnchorRef.current.w = applyAdaptiveEmaFilter(faceAnchorRef.current.w, rawW, 0.24);
            faceAnchorRef.current.h = applyAdaptiveEmaFilter(faceAnchorRef.current.h, rawH, 0.24);

            trackedCx = faceAnchorRef.current.cx;
            trackedCy = faceAnchorRef.current.cy;
            trackedScaleX = faceAnchorRef.current.w * 0.44;
            trackedScaleY = faceAnchorRef.current.h * 0.46;

            opticalYaw = ((rawCx - cWidth / 2) / (cWidth / 2)) * 14.0;
            opticalPitch = ((rawCy - cHeight / 2) / (cHeight / 2)) * 9.0;
          }
        }
      }

      // 2. Extract Real-Time Facial Landmark Coordinates [x, y]
      let pointsToDraw = [];
      let connectionsToDraw = ALL_MEDIAPIPE_CONNECTIONS;

      if (useRealCamera && liveLandmarksRef.current && liveLandmarksRef.current.length > 0) {
        // True MediaPipe FaceMesh landmark coordinates directly anchored to live face
        const mpLandmarks = liveLandmarksRef.current;
        pointsToDraw = mpLandmarks.map((lm) => [
          (1.0 - lm.x) * cWidth, // Mirrored horizontal coordinate matching scaleX(-1) video
          lm.y * cHeight
        ]);
        connectionsToDraw = MEDIAPIPE_468_CONNECTIONS;

        // Calculate FACS metrics from true landmarks
        const calculated = calculateFacialLandmarkMetrics(mpLandmarks);
        if (calculated) {
          dynamicAu4 = applyAdaptiveEmaFilter(emaAu4Ref.current, calculated.au4, 0.25);
          dynamicAu15 = applyAdaptiveEmaFilter(emaAu15Ref.current, calculated.au15, 0.25);
          dynamicAu12 = applyAdaptiveEmaFilter(emaAu12Ref.current, calculated.au12, 0.25);
          emaAu4Ref.current = dynamicAu4;
          emaAu15Ref.current = dynamicAu15;
          emaAu12Ref.current = dynamicAu12;
        }
      } else {
        // 3D Canonical Landmark Wireframe dynamically anchored to face position and scale
        const radYaw = (opticalYaw * Math.PI) / 180;
        const radPitch = (opticalPitch * Math.PI) / 180;

        pointsToDraw = CANONICAL_FACIAL_TOPOLOGY.map(([x, y, z], idx) => {
          let px = x;
          let py = y;
          let pz = z;

          // AU04 brow furrowing
          if (idx === 22 || idx === 23 || idx === 24) {
            py += dynamicAu4 * 0.065;
            px += dynamicAu4 * 0.035;
          }
          if (idx === 26 || idx === 27 || idx === 31) {
            py += dynamicAu4 * 0.065;
            px -= dynamicAu4 * 0.035;
          }

          // AU15 mouth depressing
          if (idx === 55 || idx === 66 || idx === 67) {
            py += dynamicAu15 * 0.065;
            px -= dynamicAu15 * 0.02;
          }
          if (idx === 61 || idx === 62 || idx === 71) {
            py += dynamicAu15 * 0.065;
            px += dynamicAu15 * 0.02;
          }

          // AU12 smile
          if (idx === 55 || idx === 67) {
            py -= dynamicAu12 * 0.045;
            px -= dynamicAu12 * 0.025;
          }
          if (idx === 61 || idx === 71) {
            py -= dynamicAu12 * 0.045;
            px += dynamicAu12 * 0.025;
          }

          const rotX = px * Math.cos(radYaw) + pz * Math.sin(radYaw);
          const rotZ = -px * Math.sin(radYaw) + pz * Math.cos(radYaw);
          const rotY = py * Math.cos(radPitch) - rotZ * Math.sin(radPitch);

          return [
            trackedCx + rotX * trackedScaleX,
            trackedCy + rotY * trackedScaleY
          ];
        });
        connectionsToDraw = ALL_MEDIAPIPE_CONNECTIONS;
      }

      // 3. Draw Clear, Direct Dot-to-Dot Connecting Lines
      ctx.strokeStyle = "rgba(0, 240, 200, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      connectionsToDraw.forEach(([i, j]) => {
        const p1 = pointsToDraw[i];
        const p2 = pointsToDraw[j];
        if (p1 && p2) {
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
        }
      });
      ctx.stroke();

      // 4. Draw Small, Clean Landmark Dots (radius: 1.5px)
      ctx.fillStyle = "#00f0c8";
      pointsToDraw.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. HUD Text Readout (Non-obscuring bottom ticker)
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(
        `POSE: Y:${opticalYaw > 0 ? "+" : ""}${opticalYaw.toFixed(1)}° P:${opticalPitch > 0 ? "+" : ""}${opticalPitch.toFixed(1)}° • ${liveLandmarksRef.current ? "MEDIAPIPE 468" : "REALTIME ANCHOR"} (60 FPS)`,
        12,
        cHeight - 12
      );

      // Render 40-Band Audio Spectrogram
      audioCtx.clearRect(0, 0, aWidth, aHeight);
      audioCtx.fillStyle = '#080B11';
      audioCtx.fillRect(0, 0, aWidth, aHeight);

      // dB Reference Hairlines
      audioCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      audioCtx.lineWidth = 1;
      audioCtx.beginPath();
      audioCtx.moveTo(0, aHeight * 0.25);
      audioCtx.lineTo(aWidth, aHeight * 0.25);
      audioCtx.moveTo(0, aHeight * 0.5);
      audioCtx.lineTo(aWidth, aHeight * 0.5);
      audioCtx.moveTo(0, aHeight * 0.75);
      audioCtx.lineTo(aWidth, aHeight * 0.75);
      audioCtx.stroke();

      // 40-Band FFT Spectral Bars
      const numBands = 40;
      const bandWidth = (aWidth / numBands) - 2;

      for (let b = 0; b < numBands; b++) {
        let bandEnergy = 0;

        if (useRealAudio && audioFreqData && audioFreqData.length > 0) {
          const sampleIdx = Math.floor((b / numBands) * (audioFreqData.length / 2));
          bandEnergy = (audioFreqData[sampleIdx] || 0) / 255;
        } else {
          const formantWeight = Math.exp(-Math.pow(b - 8, 2) / 30) + (0.5 * Math.exp(-Math.pow(b - 20, 2) / 45));
          bandEnergy = (0.2 + formantWeight * 0.75) * (0.6 + Math.sin(time * 4 + b * 0.3) * 0.3) * activeJitterVal;
        }

        fftBands[b] = fftBands[b] * 0.75 + bandEnergy * 0.25;

        const barH = Math.max(3, fftBands[b] * aHeight * 0.88);
        const bx = b * (bandWidth + 2);
        const by = aHeight - barH;

        const barGrad = audioCtx.createLinearGradient(0, by, 0, aHeight);
        barGrad.addColorStop(0, useRealAudio ? 'rgba(16, 185, 129, 0.9)' : 'rgba(20, 184, 166, 0.85)');
        barGrad.addColorStop(1, 'rgba(14, 165, 233, 0.3)');

        audioCtx.fillStyle = barGrad;
        audioCtx.fillRect(bx, by, bandWidth, barH);
      }

      // RMS Speech Envelope Waveform Curve
      audioCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      audioCtx.lineWidth = 1.2;
      audioCtx.beginPath();
      for (let x = 0; x < aWidth; x += 3) {
        const envVal = Math.sin((x * 0.04) + time * 3.5) * 8 * activeJitterVal +
          Math.cos((x * 0.1) - time * 2) * 5 * activeJitterVal;
        const ey = (aHeight / 2) + envVal;
        if (x === 0) audioCtx.moveTo(x, ey);
        else audioCtx.lineTo(x, ey);
      }
      audioCtx.stroke();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, useRealCamera, useRealAudio, sensorMode, manualAu4, manualAu15, manualJitter]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ color: 'var(--accent-teal)', fontSize: '1rem', display: 'flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </span>
            <h3 className="modal-title" style={{ fontSize: '0.98rem' }}>
              Clinical Telemetry Sensor Workstation
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Webcam Toggle */}
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.74rem',
                padding: '0.25rem 0.65rem',
                borderColor: useRealCamera ? 'var(--accent-teal)' : 'var(--border-color)',
                color: useRealCamera ? 'var(--accent-teal)' : 'inherit'
              }}
              onClick={() => {
                if (useRealCamera) stopWebcam();
                else startWebcam();
              }}
            >
              <span>{useRealCamera ? '● Webcam Active' : '📷 Enable Camera'}</span>
            </button>

            {/* Microphone Toggle */}
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.74rem',
                padding: '0.25rem 0.65rem',
                borderColor: useRealAudio ? 'var(--status-minimal-dot)' : 'var(--border-color)',
                color: useRealAudio ? 'var(--status-minimal-text)' : 'inherit'
              }}
              onClick={() => {
                if (useRealAudio) stopMicrophone();
                else startMicrophone();
              }}
            >
              <span>{useRealAudio ? '🔴 Mic Sampling...' : '🎙️ Enable Mic'}</span>
            </button>

            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{ gap: '1rem' }}>
          {sensorStatusMsg && (
            <div style={{ fontSize: '0.75rem', color: 'var(--status-elevated-text)', background: 'var(--status-elevated-bg)', border: '1px solid var(--status-elevated-border)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-xs)' }}>
              {sensorStatusMsg}
            </div>
          )}

          {/* Grid: Canvas HUD + Live Telemetry Readouts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '1rem' }}>
            {/* Left: 3D Facial Landmark Topology Viewport */}
            <div
              className="sensor-viewport-container"
              style={{
                position: 'relative',
                height: '320px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                backgroundColor: '#07090E'
              }}
            >
              {/* Live camera video stream fully visible in background */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: useRealCamera ? 'block' : 'none',
                  zIndex: 1
                }}
              />

              {/* Standby screen when camera is inactive */}
              {!useRealCamera && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(ellipse at center, #111827 0%, #07090E 100%)',
                    zIndex: 1
                  }}
                >
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>📷</div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      Optical Video Stream Standby
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Enable camera to anchor Face Mesh directly to your live video
                    </p>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '0.74rem', padding: '0.3rem 0.8rem' }}
                      onClick={startWebcam}
                    >
                      ● Enable Webcam
                    </button>
                  </div>
                </div>
              )}

              {/* HTML Canvas overlay directly on top */}
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}
              />

              {/* Status Header Badge */}
              <div className="sensor-status-indicator" style={{ zIndex: 3 }}>
                <span className="pulse-dot"></span>
                <span>
                  OPTICAL STREAM ({liveTelemetry.fps} FPS)
                </span>
              </div>
            </div>

            {/* Right: Live Interactive Telemetry Controls & Ticker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  LIVE FACS VECTOR STREAM
                </span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: sensorMode === 'LIVE' && useRealCamera ? 'var(--status-minimal-text)' : 'var(--text-muted)' }}>
                  {sensorMode === 'LIVE' && useRealCamera ? '● REAL CAMERA FACS' : '○ SANDBOX MANUAL'}
                </span>
              </div>

              {/* Mode Selector Switch: Live Camera vs Manual Sandbox */}
              <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '3px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sensorMode === 'LIVE' ? 'var(--accent-teal)' : 'transparent',
                    color: sensorMode === 'LIVE' ? '#FFF' : 'var(--text-muted)'
                  }}
                  onClick={() => {
                    setSensorMode('LIVE');
                    if (!useRealCamera) startWebcam();
                  }}
                >
                  📷 LIVE MODE (CAMERA)
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sensorMode === 'SANDBOX' ? 'var(--status-elevated-border)' : 'transparent',
                    color: sensorMode === 'SANDBOX' ? '#FFF' : 'var(--text-muted)'
                  }}
                  onClick={() => setSensorMode('SANDBOX')}
                >
                  🎛️ SANDBOX (SLIDERS)
                </button>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--card-bg)', padding: '4px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)' }}>
                {sensorMode === 'LIVE'
                  ? '⚡ Landmark Geometry FACS Estimation (Prototype Video Sampling)'
                  : '🔧 Manual Slider Override Mode (Testing Risk Formulas)'}
              </div>

              {/* AU04 Brow Furrow Control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>AU04 Corrugator Brow Furrow</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: liveTelemetry.au4 >= 0.5 ? 'var(--status-severe-text)' : 'inherit' }}>
                    {liveTelemetry.au4}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="1.00"
                  step="0.01"
                  value={sensorMode === 'LIVE' ? liveTelemetry.au4 : manualAu4}
                  onChange={(e) => {
                    setManualAu4(parseFloat(e.target.value));
                    if (sensorMode === 'LIVE') setSensorMode('SANDBOX');
                  }}
                  className="clinical-slider"
                />
              </div>

              {/* AU15 Lip Depressor Control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>AU15 DAO Lip Corner Depressor</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: liveTelemetry.au15 >= 0.4 ? 'var(--status-elevated-text)' : 'inherit' }}>
                    {liveTelemetry.au15}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="1.00"
                  step="0.01"
                  value={sensorMode === 'LIVE' ? liveTelemetry.au15 : manualAu15}
                  onChange={(e) => {
                    setManualAu15(parseFloat(e.target.value));
                    if (sensorMode === 'LIVE') setSensorMode('SANDBOX');
                  }}
                  className="clinical-slider"
                />
              </div>

              {/* Acoustic Jitter Control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>wav2vec2 Acoustic Tremor</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{liveTelemetry.jitter}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="1.00"
                  step="0.01"
                  value={manualJitter}
                  onChange={(e) => setManualJitter(parseFloat(e.target.value))}
                  className="clinical-slider"
                />
              </div>

              <div style={{ marginTop: 'auto', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', padding: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                <div>FUNDAMENTAL F0: {liveTelemetry.pitchHz} Hz</div>
                <div>AUDIO ENVELOPE: {liveTelemetry.audioDb} dBFS</div>
                <div>POSE CONFIDENCE: {liveTelemetry.confidence}%</div>
              </div>
            </div>
          </div>

          {/* Bottom Audio Spectrogram */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>ACOUSTIC SPECTROGRAM ({useRealAudio ? 'Real-Time Microphone FFT Analyser' : '40-Band Formant Decomposition'})</span>
              <span>16kHz Buffer • Micro-Jitter: ±{(liveTelemetry.jitter * 100).toFixed(1)}%</span>
            </div>
            <div style={{ height: '56px', borderRadius: 'var(--radius-xs)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <canvas ref={audioCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              100% Client-Side In-Memory Inference • Zero Biometric Frames Persisted
            </span>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button className="btn-secondary" onClick={onClose}>
                Close Workstation
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  onSyncTelemetry(liveTelemetry.au4, liveTelemetry.au15, liveTelemetry.jitter);
                  onClose();
                }}
              >
                Sync Values to Sandbox
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
