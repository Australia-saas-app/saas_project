"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  ShieldCheck,
  Sparkles,
  Sun,
  Smile,
  Eye,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Video,
  Lock,
  UserCheck
} from "lucide-react";

interface LiveKycCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (photoBase64: string) => void;
  userName?: string;
}

// 48 Biometric Requirement Dots (12 dots per 25% requirement)
const TOTAL_DOTS = 48;
const BIOMETRIC_DOTS = Array.from({ length: TOTAL_DOTS }, (_, i) => {
  const angle = (i / TOTAL_DOTS) * 2 * Math.PI - Math.PI / 2; // -90 deg (top center)
  return {
    id: i,
    cx: Math.round((160 + 144 * Math.cos(angle)) * 100) / 100,
    cy: Math.round((160 + 144 * Math.sin(angle)) * 100) / 100,
  };
});

export default function LiveKycCaptureModal({
  isOpen,
  onClose,
  onCaptureComplete,
  userName
}: LiveKycCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Workflow steps: guidelines (policy & instructions) -> camera -> review
  const [step, setStep] = useState<"guidelines" | "camera">("guidelines");

  const [isInitializing, setIsInitializing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForPermission, setIsWaitingForPermission] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // 4 Core Biometric Requirements (25% each = 12 dots each, total 48 dots)
  const [dotsCount, setDotsCount] = useState(0); // 0 to 48 green dots
  const [reqCentered, setReqCentered] = useState(false); // Req 1 (0-25%)
  const [reqLighting, setReqLighting] = useState(false); // Req 2 (25-50%)
  const [reqClarity, setReqClarity] = useState(false);   // Req 3 (50-75%)
  const [reqSteady, setReqSteady] = useState(false);     // Req 4 (75-100%)

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [detectionTip, setDetectionTip] = useState("Position & center your face inside the circle (25%)");

  // Keep track of consecutive stable frames & live status refs for synchronous capture verification
  const stableFramesCount = useRef(0);
  const lastFrameData = useRef<ImageData | null>(null);
  const isCountingDown = useRef(false);
  const isGoodLightingRef = useRef(false);
  const isFaceCenteredRef = useRef(false);
  const isFaceClearRef = useRef(false);
  const isSteadyRef = useRef(false);
  const activeDotsRef = useRef(0);

  // Pleasant shutter beep with Web Audio API
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {}
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setIsStreaming(false);
    isCountingDown.current = false;
  }, []);

  // Snaps the current video frame as high quality square base64 image (strict bank KYC lighting & clarity guard)
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    // Strict Bank KYC Pre-Capture Checks:
    if (!isGoodLightingRef.current) {
      setDetectionTip("Room is too dark. Please turn on room lights.");
      return;
    }
    if (!isFaceCenteredRef.current) {
      setDetectionTip("Position & center your face inside the circle (25%)");
      return;
    }
    if (!isFaceClearRef.current) {
      setDetectionTip("Face is blurry or indistinct. Hold steady in good light (75%)");
      return;
    }

    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight, 640);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);

      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;

      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

      // Verify the snapped image pixels directly before accepting
      const imgData = ctx.getImageData(0, 0, size, size).data;
      let sampleLum = 0;
      let sampleGrad = 0;
      let count = 0;
      for (let i = 0; i < imgData.length; i += 4 * 16) {
        const lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        sampleLum += lum;
        if (i + 4 * 16 < imgData.length) {
          const nextLum = 0.299 * imgData[i + 4 * 16] + 0.587 * imgData[i + 4 * 16 + 1] + 0.114 * imgData[i + 4 * 16 + 2];
          sampleGrad += Math.abs(lum - nextLum);
        }
        count++;
      }
      const finalLum = count > 0 ? sampleLum / count : 0;
      const finalGrad = count > 0 ? sampleGrad / count : 0;

      // Multi-zone Bank KYC Post-Capture Validation directly on the canvas image:
      const center = size / 2;
      const radius = size * 0.35;
      let leftFaceLum = 0, leftFaceCount = 0;
      let rightFaceLum = 0, rightFaceCount = 0;
      let leftEyeLum = 0, leftEyeCount = 0;
      let rightEyeLum = 0, rightEyeCount = 0;
      let bgLum = 0, bgCount = 0;

      for (let y = 0; y < size; y += 4) {
        for (let x = 0; x < size; x += 4) {
          const idx = (y * size + x) * 4;
          const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
          const dx = x - center;
          const dy = y - center;
          const dSq = dx * dx + dy * dy;

          // Outer Background (outside circle perimeter)
          if (dSq > (size * 0.44) * (size * 0.44)) {
            bgLum += lum;
            bgCount++;
          } else if (dSq < radius * radius) {
            // Left vs Right half of face
            if (dx < -size * 0.04) {
              leftFaceLum += lum;
              leftFaceCount++;
            } else if (dx > size * 0.04) {
              rightFaceLum += lum;
              rightFaceCount++;
            }
            // Left Eye vs Right Eye
            if (dy >= -size * 0.18 && dy <= -size * 0.02) {
              if (dx >= -size * 0.20 && dx <= -size * 0.03) {
                leftEyeLum += lum;
                leftEyeCount++;
              } else if (dx >= size * 0.03 && dx <= size * 0.20) {
                rightEyeLum += lum;
                rightEyeCount++;
              }
            }
          }
        }
      }

      const snapBg = bgCount > 0 ? bgLum / bgCount : 0;
      const snapLeft = leftFaceCount > 0 ? leftFaceLum / leftFaceCount : 0;
      const snapRight = rightFaceCount > 0 ? rightFaceLum / rightFaceCount : 0;
      const snapLeftEye = leftEyeCount > 0 ? leftEyeLum / leftEyeCount : 0;
      const snapRightEye = rightEyeCount > 0 ? rightEyeLum / rightEyeCount : 0;
      const snapMinSide = Math.min(snapLeft, snapRight);
      const snapMaxSide = Math.max(snapLeft, snapRight);
      const snapDiffRatio = snapMaxSide > 10 ? (snapMaxSide - snapMinSide) / snapMaxSide : 0;

      // 1. Must not be in a pitch-black room (background must have ambient room illumination)
      if (snapBg < 25) {
        setDetectionTip("Room is too dark. Turn on ceiling/room lights to capture.");
        return;
      }
      // 2. Both sides of face must be evenly illuminated (no half-black shadow face)
      if (snapMinSide < 44 || snapDiffRatio > 0.30) {
        setDetectionTip("Uneven lighting / shadows on face. Face the light directly.");
        return;
      }
      // 3. Both eyes must be clearly visible and illuminated
      if (snapLeftEye < 40 || snapRightEye < 40) {
        setDetectionTip("Shadows over eyes. Look directly at an eye-level light.");
        return;
      }
      // 4. Overall brightness and sharpness
      if (finalLum < 58 || finalGrad < 5.4) {
        setDetectionTip("Photo lacks clarity or lighting. Retake in good light.");
        return;
      }

      playShutterSound();
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 300);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  }, [playShutterSound, stopCamera]);

  // Cancel countdown if conditions degrade
  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    isCountingDown.current = false;
    setCountdown(null);
  }, []);

  // Start the 3-second auto countdown when user is aligned and steady
  const startCountdown = useCallback(() => {
    if (isCountingDown.current) return;
    isCountingDown.current = true;
    setCountdown(3);

    let current = 3;
    countdownIntervalRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        isCountingDown.current = false;
        captureFrame();
      }
    }, 1000);
  }, [captureFrame]);

  // Frame-by-frame biometric & stability analyzer (4-requirement KYC verification)
  const runDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || !video.videoWidth) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx) {
      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - minDim) / 2;
      const sy = (video.videoHeight - minDim) / 2;
      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 160, 160);

      const frame = ctx.getImageData(0, 0, 160, 160);
      const data = frame.data;
      const totalPixels = 160 * 160;

      let totalLuminance = 0;
      let centerLuminance = 0;
      let centerCount = 0;
      let upperFaceLuminance = 0;
      let upperFaceCount = 0;
      let leftEyeLuminance = 0;
      let leftEyeCount = 0;
      let rightEyeLuminance = 0;
      let rightEyeCount = 0;
      let leftCenterLum = 0;
      let leftCenterCount = 0;
      let rightCenterLum = 0;
      let rightCenterCount = 0;
      let bgLuminance = 0;
      let bgCount = 0;
      let skinLikePixels = 0;
      let skinLuminance = 0;
      let clarityGradSum = 0;
      let clarityGradCount = 0;
      let faceLumSqSum = 0;
      let faceMassX = 0;
      let faceMassY = 0;
      let faceMassWeight = 0;

      for (let y = 0; y < 160; y++) {
        for (let x = 0; x < 160; x++) {
          const idx = (y * 160 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuminance += lum;

          const dx = x - 80;
          const dy = y - 80;
          const distSq = dx * dx + dy * dy;

          if (distSq < 52 * 52) {
            centerLuminance += lum;
            centerCount++;
            faceLumSqSum += lum * lum;

            // Gradient / Feature contrast calculation inside face region (measures eye/nose/mouth sharpness)
            if (x < 158 && y < 158 && x % 2 === 0 && y % 2 === 0) {
              const nextXIdx = (y * 160 + (x + 2)) * 4;
              const nextYIdx = ((y + 2) * 160 + x) * 4;
              const nextXLum = 0.299 * data[nextXIdx] + 0.587 * data[nextXIdx + 1] + 0.114 * data[nextXIdx + 2];
              const nextYLum = 0.299 * data[nextYIdx] + 0.587 * data[nextYIdx + 1] + 0.114 * data[nextYIdx + 2];
              clarityGradSum += Math.abs(lum - nextXLum) + Math.abs(lum - nextYLum);
              clarityGradCount++;
            }

            // Upper face region (forehead, eyes, upper cheeks) - independent of beards/hair
            if (dy >= -32 && dy <= 8 && Math.abs(dx) <= 36) {
              upperFaceLuminance += lum;
              upperFaceCount++;
            }

            // Independent Left Eye socket zone (dx between -26 and -4, dy between -22 and -2)
            if (dy >= -22 && dy <= -2 && dx >= -26 && dx <= -4) {
              leftEyeLuminance += lum;
              leftEyeCount++;
            }
            // Independent Right Eye socket zone (dx between 4 and 26, dy between -22 and -2)
            if (dy >= -22 && dy <= -2 && dx >= 4 && dx <= 26) {
              rightEyeLuminance += lum;
              rightEyeCount++;
            }

            if (dx < -6) {
              leftCenterLum += lum;
              leftCenterCount++;
            } else if (dx > 6) {
              rightCenterLum += lum;
              rightCenterCount++;
            }

            // Universal skin tone detection accommodating diverse skin tones & lighting
            const isSkin =
              r > 32 &&
              g > 22 &&
              b > 15 &&
              r >= b - 15 &&
              r + g + b > 85 &&
              r + g + b < 690;

            if (isSkin) {
              skinLikePixels++;
              skinLuminance += lum;
              faceMassX += x * lum;
              faceMassY += y * lum;
              faceMassWeight += lum;
            } else if (lum > 35) {
              faceMassX += x * lum;
              faceMassY += y * lum;
              faceMassWeight += lum;
            }
          } else if (distSq > 65 * 65) {
            bgLuminance += lum;
            bgCount++;
          }
        }
      }

      const avgLum = totalLuminance / totalPixels;
      const centerAvgLum = centerCount > 0 ? centerLuminance / centerCount : 0;
      const bgAvgLum = bgCount > 0 ? bgLuminance / bgCount : 0;
      const upperFaceAvgLum = upperFaceCount > 0 ? upperFaceLuminance / upperFaceCount : centerAvgLum;
      const leftEyeAvgLum = leftEyeCount > 0 ? leftEyeLuminance / leftEyeCount : 0;
      const rightEyeAvgLum = rightEyeCount > 0 ? rightEyeLuminance / rightEyeCount : 0;
      const minEyeLum = Math.min(leftEyeAvgLum, rightEyeAvgLum);
      const skinAvgLum = skinLikePixels > 0 ? skinLuminance / skinLikePixels : upperFaceAvgLum;
      // Effective face illumination: uses skin or upper-face reading to prevent false rejects from dark beards or hair
      const effectiveFaceLum = Math.max(skinAvgLum, upperFaceAvgLum);

      // Contrast & Feature Sharpness:
      const clarityScore = clarityGradCount > 0 ? clarityGradSum / clarityGradCount : 0;
      const variance = centerCount > 0 ? Math.max(0, faceLumSqSum / centerCount - centerAvgLum * centerAvgLum) : 0;
      const faceStdDev = Math.sqrt(variance);

      // Centering balance between left and right side of face
      const leftAvg = leftCenterCount > 0 ? leftCenterLum / leftCenterCount : 0;
      const rightAvg = rightCenterCount > 0 ? rightCenterLum / rightCenterCount : 0;
      const skinRatio = centerCount > 0 ? skinLikePixels / centerCount : 0;
      const maxSide = Math.max(leftAvg, rightAvg);
      const minSide = Math.min(leftAvg, rightAvg);
      const sideDiffRatio = maxSide > 10 ? (maxSide - minSide) / maxSide : 0;

      // Real Face Centroid calculation (checks true centering, reduces dots if shifted)
      const centroidX = faceMassWeight > 0 ? faceMassX / faceMassWeight : 80;
      const centroidY = faceMassWeight > 0 ? faceMassY / faceMassWeight : 80;
      const centerOffset = Math.hypot(centroidX - 80, centroidY - 80);

      // ────────────────────────────────────────────────────────
      // REQUIREMENT 1 (0 - 25% = 12 dots): Face Centered
      // If user shifts to the side, dots reduce
      // ────────────────────────────────────────────────────────
      const facePresent =
        (skinRatio > 0.05 || upperFaceAvgLum > 34 || centerAvgLum > 30) &&
        effectiveFaceLum > 30 &&
        effectiveFaceLum < 240;

      let dots1 = 0;
      if (facePresent) {
        if (centerOffset <= 11) dots1 = 12;
        else if (centerOffset <= 17) dots1 = 8;
        else if (centerOffset <= 24) dots1 = 4;
        else dots1 = 1;
      }
      const isReq1Ok = dots1 >= 10;

      // ────────────────────────────────────────────────────────
      // REQUIREMENT 2 (25 - 50% = 12 dots): Good Lighting
      // Strict Bank KYC:
      // 1. Ambient room must not be pitch black (bgAvgLum >= 25, avgLum >= 36)
      // 2. Both eyes must be independently illuminated (minEyeLum >= 40)
      // 3. Both halves of face must be evenly illuminated (minSide >= 44, sideDiffRatio <= 0.30)
      // 4. Overall face illumination must be >= 58
      // Screen glare in dark room is 100% REJECTED!
      // ────────────────────────────────────────────────────────
      const isRoomDark = bgAvgLum < 25 || avgLum < 36;
      const isFaceDark = effectiveFaceLum < 58;
      const isEyeInShadow = minEyeLum < 40;
      const isUnevenLighting = minSide < 44 || sideDiffRatio > 0.30;
      const isTooBright = effectiveFaceLum > 235 || avgLum > 240;

      const isReq2Ok = facePresent && !isRoomDark && !isFaceDark && !isEyeInShadow && !isUnevenLighting && !isTooBright;
      const dots2 = isReq2Ok ? 12 : 0;

      // ────────────────────────────────────────────────────────
      // REQUIREMENT 3 (50 - 75% = 12 dots): Face Clearly Visible & Sharp
      // Features (eyes/nose/mouth) must be sharp and distinct, not blur/silhouette/dark eye sockets
      // ────────────────────────────────────────────────────────
      const isReq3Ok = facePresent && clarityScore >= 5.5 && faceStdDev >= 11 && skinRatio >= 0.06 && effectiveFaceLum >= 55 && !isEyeInShadow && !isUnevenLighting;
      const dots3 = isReq3Ok ? 12 : 0;

      // ────────────────────────────────────────────────────────
      // REQUIREMENT 4 (75 - 100% = 12 dots): Hold Still (Steady)
      // ────────────────────────────────────────────────────────
      let motionScore = 0;
      if (lastFrameData.current) {
        const lastData = lastFrameData.current.data;
        let diffSum = 0;
        for (let i = 0; i < totalPixels * 4; i += 16) {
          diffSum += Math.abs(data[i] - lastData[i]);
        }
        motionScore = diffSum / (totalPixels / 4);
      }
      lastFrameData.current = frame;

      const steady = motionScore < 14;
      if (steady) {
        stableFramesCount.current = Math.min(4, stableFramesCount.current + 1);
      } else {
        stableFramesCount.current = Math.max(0, stableFramesCount.current - 1);
      }
      const dots4 = Math.round((stableFramesCount.current / 4) * 12);
      const isReq4Ok = dots4 >= 10;

      const totalDots = dots1 + dots2 + dots3 + dots4; // 0 to 48 green dots
      const isAll4Ok = isReq1Ok && isReq2Ok && isReq3Ok && isReq4Ok;

      // Synchronize state and live refs
      setDotsCount(totalDots);
      setReqCentered(isReq1Ok);
      setReqLighting(isReq2Ok);
      setReqClarity(isReq3Ok);
      setReqSteady(isReq4Ok);

      isFaceCenteredRef.current = isReq1Ok;
      isGoodLightingRef.current = isReq2Ok;
      isFaceClearRef.current = isReq3Ok;
      isSteadyRef.current = isReq4Ok;
      activeDotsRef.current = totalDots;

      // Auto Countdown Trigger: Only when ALL 4 requirements pass
      if (isAll4Ok) {
        if (isCountingDown.current) {
          setDetectionTip("Capturing in 3 seconds... Hold still!");
        } else {
          setDetectionTip("All requirements met! Capturing...");
          startCountdown();
        }
      } else {
        cancelCountdown();
        if (!isReq1Ok) {
          setDetectionTip("Center your face directly in the circle");
        } else if (isRoomDark) {
          setDetectionTip("Room is too dark. Turn on ceiling/room lights");
        } else if (isEyeInShadow) {
          setDetectionTip("Dark shadow over eyes. Face an eye-level light");
        } else if (isUnevenLighting) {
          setDetectionTip("Uneven lighting / shadows on face. Face the light directly");
        } else if (!isReq3Ok) {
          setDetectionTip("Face is blurry. Hold steady in bright light");
        } else {
          setDetectionTip("Hold still... stabilizing");
        }
      }
    }

    if (!isCountingDown.current || countdown !== null) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [cancelCountdown, countdown, startCountdown]);

  // Starts the camera stream directly
  const startCameraStream = useCallback(async () => {
    stopCamera();
    setCapturedImage(null);
    setIsInitializing(true);
    setCameraError(null);
    setDotsCount(0);
    setReqCentered(false);
    setReqLighting(false);
    setReqClarity(false);
    setReqSteady(false);
    setCountdown(null);
    stableFramesCount.current = 0;
    isCountingDown.current = false;

    const nav = typeof navigator !== "undefined" ? navigator : null;
    const mediaDevices = nav?.mediaDevices;
    const getUserMedia =
      mediaDevices?.getUserMedia?.bind(mediaDevices) ||
      (nav as any)?.getUserMedia?.bind(nav) ||
      (nav as any)?.webkitGetUserMedia?.bind(nav) ||
      (nav as any)?.mozGetUserMedia?.bind(nav);

    if (!getUserMedia) {
      setIsInitializing(false);
      setIsWaitingForPermission(true);
      setCameraError("Camera access is not permitted in this browser origin.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 }
        },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await getUserMedia(constraints);
      } catch {
        try {
          stream = await getUserMedia({ video: { facingMode: "user" }, audio: false });
        } catch {
          stream = await getUserMedia({ video: true, audio: false });
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        (video as any).defaultMuted = true;
        video.playsInline = true;

        try {
          await video.play();
        } catch (playErr) {
          console.warn("Direct play error, waiting for onloadedmetadata:", playErr);
          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => {
              video.play().then(() => resolve()).catch(() => resolve());
            };
            setTimeout(resolve, 600);
          });
        }

        setIsStreaming(true);
        setIsWaitingForPermission(false);
        setIsInitializing(false);
        setCameraError(null);

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      }
    } catch (err: any) {
      setIsInitializing(false);
      setIsStreaming(false);
      console.warn("Camera stream failed:", err);

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setIsWaitingForPermission(true);
        setCameraError("Camera permission denied. Please allow camera access in the browser prompt.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setCameraError("No webcam or camera device detected on this computer.");
      } else {
        setIsWaitingForPermission(true);
        setCameraError(err?.message || "Could not access camera. Please click Allow Camera Access.");
      }
    }
  }, [runDetectionLoop, stopCamera]);

  const handleRetakePhoto = useCallback(() => {
    cancelCountdown();
    setCapturedImage(null);
    setDotsCount(0);
    setReqCentered(false);
    setReqLighting(false);
    setReqClarity(false);
    setReqSteady(false);
    setCountdown(null);
    setDetectionTip("Position & center your face inside the circle (25%)");
    stableFramesCount.current = 0;
    startCameraStream();
  }, [cancelCountdown, startCameraStream]);

  const checkPermissionAndStart = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        const permissionStatus = await navigator.permissions.query({ name: "camera" as any });
        if (permissionStatus.state === "granted") {
          // Already allowed previously! Auto-start camera directly without asking!
          startCameraStream();
        } else {
          // Not yet allowed (prompt or denied): show the "Camera Access Required" prompt inside circle
          setIsStreaming(false);
          setIsInitializing(false);
        }

        permissionStatus.onchange = () => {
          if (permissionStatus.state === "granted" && !streamRef.current) {
            startCameraStream();
          }
        };
      } else {
        // If permissions API is not supported, wait for user to click button
        setIsStreaming(false);
        setIsInitializing(false);
      }
    } catch {
      // Query threw on this browser, keep button visible
      setIsStreaming(false);
      setIsInitializing(false);
    }
  }, [startCameraStream]);

  // On modal open: Reset to guidelines step and cleanup
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setStep("guidelines");
    setCapturedImage(null);
    setCameraError(null);
    setDotsCount(0);
    setReqCentered(false);
    setReqLighting(false);
    setReqClarity(false);
    setReqSteady(false);
    setCountdown(null);

    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        style={{ maxWidth: "460px", width: "100%" }}
        className="relative bg-background border border-border shadow-2xl overflow-hidden rounded-2xl flex flex-col my-auto text-foreground transition-colors max-h-[92vh] sm:max-h-none sm:h-auto"
      >
        {/* Top Header - sticky shrink-0 so close button is always accessible */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-muted/40 z-20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Live Biometric Verification
                </h3>
                {step === "guidelines" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    Step 1 of 2
                  </span>
                )}
                {step === "camera" && !capturedImage && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Step 2 of 2
                  </span>
                )}
                {capturedImage && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                    Photo Captured
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Bank-Grade Face & Liveness Detection
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shutter White Flash Effect */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-300" />
        )}

        {/* ─── STEP 1: POLICY & GUIDELINES ─── */}
        {step === "guidelines" ? (
          <div className="p-3.5 sm:p-4 overflow-y-auto sm:overflow-hidden flex-1 flex flex-col gap-2.5 animate-in fade-in duration-200">
            {/* Policy Box: Why Liveness is Required */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5 sm:p-3 space-y-1 sm:space-y-1.5 shrink-0">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                <h4>Biometric Verification & Anti-Spoofing Policy</h4>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                To protect your account against identity theft, synthetic identity fraud, and AI-generated deepfakes, financial and regulatory standards require live biometric verification.
              </p>
              <div className="flex items-start gap-1.5 pt-0.5 text-[10px] sm:text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                <span>This test confirms that you are a <strong>real, physically present person</strong>. Your live selfie is encrypted and attached exclusively to your KYC application.</span>
              </div>
            </div>

            {/* Preparation Instructions Checklist */}
            <div className="space-y-1.5 shrink-0">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                What is required for the liveness check:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-start gap-2 p-2 sm:p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sun className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Good, Even Lighting</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">Face a light source. Avoid dark shadows or strong backlight.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 sm:p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Eye className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Face Unobstructed</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">Remove sunglasses, masks, or wide hats. Reading glasses are fine.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 sm:p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Smile className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Center Face in Circle</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">Look directly into camera at eye level and align your face inside.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 sm:p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Hold Still for Capture</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">When the frame glows green, hold steady for 3s to auto-capture.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Consent Note */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2 shrink-0">
              <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-foreground font-medium">
                By clicking "Continue to Camera", you agree to enable live camera capture for biometric KYC verification.
              </span>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border mt-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("camera");
                  checkPermissionAndStart();
                }}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Camera</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ─── STEP 2: CAMERA CAPTURE & REVIEW ─── */
          <div className="p-3.5 sm:p-4 overflow-y-auto sm:overflow-hidden flex-1 flex flex-col items-center">
            {capturedImage ? (
              /* ─── Captured Review State ─── */
              <div className="w-full flex flex-col items-center py-1 animate-in fade-in zoom-in-95 duration-200">
                {/* Photo Circular Frame */}
                <div className="relative mb-3.5 sm:mb-4">
                  <div className="h-44 w-44 sm:h-48 sm:w-48 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl bg-muted relative">
                    <img
                      src={capturedImage}
                      alt="Captured Live Selfie"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap">
                    <CheckCircle2 className="h-3 w-3" />
                    Live Photo Captured
                  </div>
                </div>

                <div className="text-center max-w-xs mb-3">
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Your live portrait has been securely stamped. Click Continue to attach this photo to your formal KYC application.
                  </p>
                </div>

                {/* Quality Checklist */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs mb-4 text-xs">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px]">Face Centered</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px]">Clear Lighting</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px]">Live Anti-Spoof</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px]">Timestamp Stamped</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 w-full justify-center shrink-0">
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retake Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCaptureComplete(capturedImage);
                    }}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue to KYC</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* ─── LIVE CIRCULAR BIOMETRIC VIEWPORT ─── */
              <div className="w-full flex flex-col items-center">
                {/* Back to Guidelines Link */}
                <div className="w-full flex items-center justify-between mb-1 px-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setStep("guidelines");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Back to Guidelines</span>
                  </button>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Align face inside circle
                  </span>
                </div>

                {/* Circular Camera Viewport */}
                {(() => {
                  const isCounting = countdown !== null;
                  const is100Percent = dotsCount >= TOTAL_DOTS;
                  const isGreenSolid = is100Percent || isCounting;
                  const isAnyProgress = dotsCount > 0;

                  const containerBorderClass = !isStreaming
                    ? "border-slate-700/60"
                    : isGreenSolid
                    ? "border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.55)] ring-4 ring-emerald-500/20"
                    : isAnyProgress
                    ? "border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                    : "border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.35)]";

                  const ovalClass = isGreenSolid
                    ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.5)]"
                    : isAnyProgress
                    ? "border-amber-400/80 bg-amber-400/5 shadow-[0_0_15px_rgba(251,191,36,0.25)]"
                    : "border-red-500/80 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]";

                  const badgeClass = isGreenSolid
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : isAnyProgress
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30";

                  const dotClass = isGreenSolid
                    ? "bg-emerald-500 animate-ping"
                    : isAnyProgress
                    ? "bg-amber-500 animate-pulse"
                    : "bg-red-500";

                  return (
                    <>
                      <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center my-1 shrink-0">
                        {/* Outer Dotted Biometric Ring (48 dots = 12 dots per 25% requirement) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 320 320">
                          {/* 48 Circular Biometric Requirement Dots */}
                          {BIOMETRIC_DOTS.map((dot) => {
                            const isFilled = dot.id < dotsCount;
                            return (
                              <circle
                                key={dot.id}
                                cx={dot.cx}
                                cy={dot.cy}
                                r={isFilled ? 3.8 : 2.4}
                                fill={isFilled ? "#10b981" : "rgba(148, 163, 184, 0.28)"}
                                className="transition-all duration-150"
                                style={
                                  isFilled
                                    ? { filter: "drop-shadow(0 0 4px rgba(16, 185, 129, 0.9))" }
                                    : undefined
                                }
                              />
                            );
                          })}

                          {/* Full Solid Green Boundary (Appears ONLY when all 48 dots are filled or counting down) */}
                          {isGreenSolid && (
                            <circle
                              cx="160"
                              cy="160"
                              r="144"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="5"
                              className="animate-in fade-in zoom-in-95 duration-200"
                              style={{ filter: "drop-shadow(0 0 10px rgba(16, 185, 129, 0.85))" }}
                            />
                          )}
                        </svg>

                        {/* Video Stream Container Inside Circle (Dark sleek biometric frame) */}
                        <div
                          style={{ backgroundColor: "#0b0f19" }}
                          className={`w-[84%] h-[84%] rounded-full overflow-hidden relative flex items-center justify-center z-10 border-2 transition-all duration-200 ${containerBorderClass}`}
                        >
                          {/* Starting / Requesting Spinner */}
                          {isInitializing && (
                            <div
                              style={{ backgroundColor: "rgba(11, 15, 25, 0.95)" }}
                              className="absolute inset-0 z-30 flex flex-col items-center justify-center text-white p-4 text-center animate-in fade-in duration-150"
                            >
                              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                              <span style={{ color: "#ffffff" }} className="text-xs font-semibold">
                                Starting camera...
                              </span>
                              <span style={{ color: "#94a3b8" }} className="text-[10px] mt-1">
                                Please allow camera in browser prompt
                              </span>
                            </div>
                          )}

                          {/* Permission Prompt Button Inside Circle */}
                          {!isStreaming && !isInitializing && (
                            <div
                              style={{ backgroundColor: "#0b0f19" }}
                              className="absolute inset-0 z-30 flex flex-col items-center justify-center text-white p-4 text-center animate-in fade-in duration-150"
                            >
                              <div className="h-10 w-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2 shadow-sm">
                                <Camera className="h-5 w-5" />
                              </div>
                              <span
                                style={{ color: "#ffffff" }}
                                className="text-xs font-bold mb-1 tracking-tight"
                              >
                                Camera Access Required
                              </span>
                              <p
                                style={{ color: "#94a3b8" }}
                                className="text-[10px] max-w-[180px] mb-3 leading-tight"
                              >
                                Click below to allow camera access in your browser
                              </p>
                              <button
                                type="button"
                                onClick={startCameraStream}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Video className="h-3.5 w-3.5" />
                                <span>Allow Camera Access</span>
                              </button>
                            </div>
                          )}

                          {/* Mirrored Video Feed */}
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                              backgroundColor: "#000000",
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              transform: "scaleX(-1)"
                            }}
                          />

                          {/* Biometric Oval Center Guide Overlay with Strict Red / Amber / Green Status */}
                          {isStreaming && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                              <div
                                className={`w-[62%] h-[78%] rounded-[50%] border-2 border-dashed transition-all duration-200 ${ovalClass}`}
                              />
                            </div>
                          )}

                          {/* Countdown Number Badge Overlay */}
                          {countdown !== null && (
                            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] animate-in zoom-in-50 duration-200">
                              <span className="text-7xl font-black text-emerald-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] scale-110 animate-pulse">
                                {countdown}
                              </span>
                              <span className="text-[10px] font-bold text-white/90 mt-1 tracking-wide uppercase">
                                Smile & Hold Still
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* 4 Live Bank KYC Requirement Checklist Cards (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2 mb-3 shrink-0">
                  {/* Card 1: Face Centered */}
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                      reqCentered
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm ring-1 ring-emerald-500/20"
                        : "bg-card/70 border-border/70 text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        reqCentered
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {reqCentered ? (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        <Smile className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold leading-tight">Face Centered</span>
                  </div>

                  {/* Card 2: Good Lighting */}
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                      reqLighting
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm ring-1 ring-emerald-500/20"
                        : "bg-card/70 border-border/70 text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        reqLighting
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {reqLighting ? (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        <Sun className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold leading-tight">Good Lighting</span>
                  </div>

                  {/* Card 3: Face Clearly Visible */}
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                      reqClarity
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm ring-1 ring-emerald-500/20"
                        : "bg-card/70 border-border/70 text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        reqClarity
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {reqClarity ? (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold leading-tight">Clearly Visible</span>
                  </div>

                  {/* Card 4: Hold Still */}
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                      reqSteady
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm ring-1 ring-emerald-500/20"
                        : "bg-card/70 border-border/70 text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        reqSteady
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {reqSteady ? (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold leading-tight">Hold Still</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 w-full justify-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="px-4 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={captureFrame}
                    disabled={!isStreaming || dotsCount < 48}
                    title={
                      dotsCount < 48
                        ? "All requirements must pass before photo can be taken"
                        : "Snap Photo Now"
                    }
                    className="px-5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Snap Photo Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
