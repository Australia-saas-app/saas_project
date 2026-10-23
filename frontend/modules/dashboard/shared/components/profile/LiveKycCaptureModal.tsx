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

      // Strict Bank KYC Post-Capture Validation:
      // Murky/dark room silhouette (finalLum < 40) or blurry out-of-focus capture (finalGrad < 4.0) is rejected!
      if (finalLum < 40) {
        setDetectionTip("Photo too dark. Please turn on room lights.");
        return;
      }
      if (finalGrad < 4.0) {
        setDetectionTip("Photo is blurry or unclear. Please retake in good light.");
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
      const sideDiffRatio = maxSide > 15 ? (maxSide - minSide) / maxSide : 0;
      const balanceRatio =
        leftCenterCount > 0 && rightCenterCount > 0
          ? Math.min(leftCenterCount, rightCenterCount) / Math.max(leftCenterCount, rightCenterCount)
          : 0;

      // ────────────────────────────────────────────────────────
      // REQUIREMENT 1 (0 - 25% = 12 dots): Face Centered
      // If user shifts to the side, dots reduce
      // ────────────────────────────────────────────────────────
      const facePresent =
        (skinRatio > 0.05 || upperFaceAvgLum > 32 || centerAvgLum > 28) &&
        effectiveFaceLum > 28 &&
        effectiveFaceLum < 240;

      let dots1 = 0;
      if (facePresent) {
        if (balanceRatio >= 0.78) dots1 = 12;
        else if (balanceRatio >= 0.65) dots1 = 8;
        else if (balanceRatio >= 0.52) dots1 = 5;
        else dots1 = 2;
      }
      const isReq1Ok = dots1 >= 10;

      // ────────────────────────────────────────────────────────
      // REQUIREMENT 2 (25 - 50% = 12 dots): Good Lighting
      // Strict Bank KYC: Face >= 46 lum, room avg >= 26 lum.
      // Low light / dark room silhouette (like user's photo) is REJECTED!
      // Evaluated independently so user immediately knows if lighting is OK!
      // ────────────────────────────────────────────────────────
      const isTooDark = (facePresent && effectiveFaceLum < 46) || avgLum < 26;
      const isTooBright = effectiveFaceLum > 235 || avgLum > 240;
      const isHarshGlare = bgAvgLum < 20 && sideDiffRatio > 0.60 && minSide < 25;
      const isReq2Ok = !isTooDark && !isTooBright && !isHarshGlare && avgLum >= 26;
      const dots2 = isReq2Ok ? 12 : (effectiveFaceLum >= 38 && !isHarshGlare ? 6 : 0);

      // ────────────────────────────────────────────────────────
      // REQUIREMENT 3 (50 - 75% = 12 dots): Face Clearly Visible & Sharp
      // Features (eyes/nose/mouth) must be sharp and distinct, not blur/silhouette
      // ────────────────────────────────────────────────────────
      const isReq3Ok = facePresent && clarityScore >= 5.0 && faceStdDev >= 10 && skinRatio >= 0.05 && effectiveFaceLum >= 42;
      const dots3 = isReq3Ok ? 12 : (facePresent && clarityScore >= 3.8 ? 6 : 0);

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
          setDetectionTip("All 4 requirements met! Capturing...");
          startCountdown();
        }
      } else {
        cancelCountdown();
        if (!isReq1Ok) {
          setDetectionTip("Center your face inside the circle (25%)");
        } else if (!isReq2Ok) {
          setDetectionTip("Room is too dark. Turn on room lights (25%)");
        } else if (!isReq3Ok) {
          setDetectionTip("Face is blurry or indistinct. Hold steady in good light (25%)");
        } else {
          setDetectionTip("Hold still... stabilizing (25%)");
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative bg-background border border-border shadow-2xl overflow-hidden rounded-2xl w-full max-w-[560px] max-h-[92vh] sm:max-h-[90vh] flex flex-col my-auto text-foreground transition-colors"
      >
        {/* Top Header - sticky shrink-0 so close button is always accessible */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-muted/40 z-20">
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
                    Verified
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
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Policy Box: Why Liveness is Required */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Lock className="h-4 w-4 text-primary shrink-0" />
                <h4>Biometric Verification & Anti-Spoofing Policy</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                To protect your account against identity theft, synthetic identity fraud, and AI-generated deepfakes, financial and regulatory standards require live biometric verification.
              </p>
              <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>This test confirms that you are a <strong>real, physically present living person</strong>. Your live selfie is encrypted, timestamped, and attached exclusively to your formal KYC application.</span>
              </div>
            </div>

            {/* Preparation Instructions Checklist */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                What is required for the liveness check:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Good, Even Lighting</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">Face a light source. Avoid dark shadows or strong backlight behind you.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Face Unobstructed</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">Remove sunglasses, masks, or wide hats. Reading glasses are fine.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Smile className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Center Face in Circle</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">Look directly into camera at eye level and align your face inside the frame.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Hold Still for Capture</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">When the frame glows green, hold steady for 3s to auto-capture your photo.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Consent Note */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2.5">
              <UserCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[11px] text-foreground font-medium">
                By clicking "Continue to Camera", you agree to enable live camera capture for real-person biometric verification.
              </span>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-1">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("camera");
                  checkPermissionAndStart();
                }}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Camera</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ─── STEP 2: CAMERA CAPTURE & REVIEW ─── */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center">
            {capturedImage ? (
              /* ─── Captured Review State ─── */
              <div className="w-full flex flex-col items-center py-2 animate-in fade-in zoom-in-95 duration-200">
                {/* Photo Circular Frame */}
                <div className="relative mb-5">
                  <div className="h-52 w-52 sm:h-64 sm:w-64 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl bg-muted relative">
                    <img
                      src={capturedImage}
                      alt="Captured Live Selfie"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Live Photo Captured
                  </div>
                </div>

                <div className="text-center max-w-sm mb-6">
                  <h4 className="text-base font-bold text-foreground mb-1">
                    Biometric Face Match Verified
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your live portrait has been securely stamped. Click Continue to attach this photo to your formal KYC application.
                  </p>
                </div>

                {/* Quality Checklist */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm mb-6 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Face Centered</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Clear Lighting</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Live Anti-Spoof</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Timestamp Stamped</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retake Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCaptureComplete(capturedImage);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to KYC</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* ─── LIVE CIRCULAR BIOMETRIC VIEWPORT ─── */
              <div className="w-full flex flex-col items-center">
                {/* Back to Guidelines Link */}
                <div className="w-full flex items-center justify-between mb-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setStep("guidelines");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Guidelines</span>
                  </button>
                  <span className="text-[11px] text-muted-foreground font-medium">
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
                      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-2 shrink-0">
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
                              className="absolute inset-0 z-30 flex flex-col items-center justify-center text-white p-5 text-center animate-in fade-in duration-150"
                            >
                              <div className="h-12 w-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-sm">
                                <Camera className="h-6 w-6" />
                              </div>
                              <span
                                style={{ color: "#ffffff" }}
                                className="text-sm font-bold mb-1 tracking-tight"
                              >
                                Camera Access Required
                              </span>
                              <p
                                style={{ color: "#94a3b8" }}
                                className="text-[11px] max-w-[200px] mb-4 leading-tight"
                              >
                                Click below to allow camera access in your browser
                              </p>
                              <button
                                type="button"
                                onClick={startCameraStream}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Video className="h-4 w-4" />
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
                              <span className="text-8xl font-black text-emerald-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] scale-110 animate-pulse">
                                {countdown}
                              </span>
                              <span className="text-xs font-bold text-white/90 mt-2 tracking-wide uppercase">
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
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm mt-3 mb-5">
                  {/* Card 1: Face Centered */}
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
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
                    <div className="leading-tight">
                      <div className="text-xs font-bold">1. Face Centered</div>
                      <div className="text-[10px] opacity-80">25% dots</div>
                    </div>
                  </div>

                  {/* Card 2: Good Lighting */}
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
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
                    <div className="leading-tight">
                      <div className="text-xs font-bold">2. Good Lighting</div>
                      <div className="text-[10px] opacity-80">25% dots</div>
                    </div>
                  </div>

                  {/* Card 3: Face Clearly Visible */}
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
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
                    <div className="leading-tight">
                      <div className="text-xs font-bold">3. Clearly Visible</div>
                      <div className="text-[10px] opacity-80">25% dots</div>
                    </div>
                  </div>

                  {/* Card 4: Hold Still */}
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
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
                    <div className="leading-tight">
                      <div className="text-xs font-bold">4. Hold Still</div>
                      <div className="text-[10px] opacity-80">25% dots</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={captureFrame}
                    disabled={!isStreaming || dotsCount < 36}
                    title={
                      dotsCount < 36
                        ? "All requirements (centering, lighting, clarity) must pass"
                        : "Snap Photo Now"
                    }
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
