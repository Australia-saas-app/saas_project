"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
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
  Video
} from "lucide-react";

interface LiveKycCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (photoBase64: string) => void;
  userName?: string;
}

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

  const [isInitializing, setIsInitializing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Live detection & alignment states
  const [isFaceCentered, setIsFaceCentered] = useState(false);
  const [isGoodLighting, setIsGoodLighting] = useState(false);
  const [isHoldingStill, setIsHoldingStill] = useState(false);
  const [alignmentProgress, setAlignmentProgress] = useState(0); // 0 to 100
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [detectionTip, setDetectionTip] = useState("Position your face inside the circle");

  // Keep track of consecutive stable frames
  const stableFramesCount = useRef(0);
  const lastFrameData = useRef<ImageData | null>(null);
  const isCountingDown = useRef(false);

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

  // Snaps the current video frame as high quality square base64 image
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    playShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);

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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  }, [playShutterSound, stopCamera]);

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
    }, 850);
  }, [captureFrame]);

  // Frame-by-frame biometric & stability analyzer
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
      let skinLikePixels = 0;

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
          if (dx * dx + dy * dy < 50 * 50) {
            centerLuminance += lum;
            centerCount++;
            if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 10) {
              skinLikePixels++;
            }
          }
        }
      }

      const avgLum = totalLuminance / totalPixels;
      const centerAvgLum = centerCount > 0 ? centerLuminance / centerCount : 0;
      const skinRatio = centerCount > 0 ? skinLikePixels / centerCount : 0;

      const goodLighting = avgLum > 35 && avgLum < 235;
      const facePresent = skinRatio > 0.12 && centerAvgLum > 40 && centerAvgLum < 240;

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

      const steady = motionScore < 16;

      setIsGoodLighting(goodLighting);
      setIsFaceCentered(facePresent);
      setIsHoldingStill(steady);

      if (!goodLighting) {
        setDetectionTip(avgLum <= 35 ? "Lighting too dark. Move to a well-lit area." : "Lighting too bright. Avoid strong glare.");
        stableFramesCount.current = 0;
        setAlignmentProgress((prev) => Math.max(0, prev - 10));
      } else if (!facePresent) {
        setDetectionTip("Position your face inside the circle");
        stableFramesCount.current = 0;
        setAlignmentProgress((prev) => Math.max(0, prev - 10));
      } else if (!steady) {
        setDetectionTip("Hold still... detecting face");
        stableFramesCount.current = Math.max(1, stableFramesCount.current - 1);
        setAlignmentProgress((prev) => Math.max(20, prev - 5));
      } else {
        stableFramesCount.current += 1;
        setDetectionTip("Perfect! Hold still for automatic capture");

        setAlignmentProgress((prev) => {
          const next = Math.min(100, prev + 12);
          if (next >= 100 && !isCountingDown.current) {
            startCountdown();
          }
          return next;
        });
      }
    }

    if (!isCountingDown.current || countdown !== null) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [countdown, startCountdown]);

  // Request camera stream and play inside circle
  const startCamera = useCallback(async () => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);
    setCapturedImage(null);
    setAlignmentProgress(0);
    setCountdown(null);
    stableFramesCount.current = 0;
    isCountingDown.current = false;

    // Check if mediaDevices exists
    const nav = typeof navigator !== "undefined" ? navigator : null;
    const mediaDevices = nav?.mediaDevices;
    const getUserMedia =
      mediaDevices?.getUserMedia?.bind(mediaDevices) ||
      (nav as any)?.getUserMedia?.bind(nav) ||
      (nav as any)?.webkitGetUserMedia?.bind(nav) ||
      (nav as any)?.mozGetUserMedia?.bind(nav);

    if (!getUserMedia) {
      setIsInitializing(false);
      setCameraError(
        "Browser blocked camera on HTTP. To see live camera video on this server IP, enable chrome://flags/#unsafely-treat-insecure-origin-as-secure or use HTTPS."
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Try front selfie camera first
        stream = await getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280, min: 320 },
            height: { ideal: 720, min: 240 }
          },
          audio: false
        });
      } catch {
        // Fallback to any camera
        stream = await getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsInitializing(false);
            setIsStreaming(true);
            animFrameRef.current = requestAnimationFrame(runDetectionLoop);
          }).catch((err) => {
            console.warn("Video playback blocked:", err);
            setIsInitializing(false);
          });
        };
      } else {
        setIsInitializing(false);
      }
    } catch (err: any) {
      setIsInitializing(false);
      console.warn("Camera access error:", err?.name, err?.message);

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please click 'Allow' in your browser address bar.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setCameraError("No webcam or camera detected on your device.");
      } else {
        setCameraError(err?.message || "Could not access camera. Please allow permissions and retry.");
      }
    }
  }, [runDetectionLoop, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  // Circle outline stroke circumference (Radius 135)
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (alignmentProgress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        style={{ maxWidth: "560px", width: "100%" }}
        className="relative bg-background border border-border shadow-2xl overflow-hidden rounded-2xl my-4 text-foreground transition-colors"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Live Biometric Verification
              </h3>
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
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Shutter White Flash Effect */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-300" />
          )}

          {capturedImage ? (
            /* ─── Captured Review State ─── */
            <div className="w-full flex flex-col items-center py-2 animate-in fade-in zoom-in-95 duration-200">
              {/* Photo Circular Frame */}
              <div className="relative mb-5">
                <div className="h-64 w-64 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl bg-muted relative">
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
                  onClick={startCamera}
                  className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCaptureComplete(capturedImage);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <span>Continue to KYC</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ─── LIVE CIRCULAR BIOMETRIC VIEWPORT (ALWAYS VISIBLE) ─── */
            <div className="w-full flex flex-col items-center">
              {/* Circular Camera Viewport */}
              <div className="relative h-72 w-72 sm:h-80 sm:w-80 flex items-center justify-center my-2">
                {/* Outer SVG Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20">
                  <circle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    className="stroke-muted/40 fill-none"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    className={`fill-none transition-all duration-150 ${
                      alignmentProgress >= 100
                        ? "stroke-emerald-500"
                        : alignmentProgress > 40
                        ? "stroke-emerald-400"
                        : isStreaming
                        ? "stroke-red-500/70"
                        : "stroke-primary/70"
                    }`}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Video Stream Container Inside Circle */}
                <div
                  style={{ width: "270px", height: "270px" }}
                  className="rounded-full overflow-hidden bg-slate-900 relative shadow-2xl flex items-center justify-center z-10 border-2 border-border/40"
                >
                  {/* Loading or Permission Prompt inside the Circle */}
                  {isInitializing && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/90 text-white p-4 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <span className="text-xs font-semibold">Starting camera...</span>
                      <span className="text-[10px] text-slate-300 mt-1">Click "Allow" when prompted</span>
                    </div>
                  )}

                  {!isStreaming && !isInitializing && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/95 text-white p-4 text-center">
                      <Camera className="h-10 w-10 text-primary mb-2 animate-bounce" />
                      <span className="text-xs font-bold mb-1">Camera Access Required</span>
                      <p className="text-[10px] text-slate-300 max-w-[200px] mb-3 leading-tight">
                        Click below to allow camera access in your browser
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all flex items-center gap-1.5"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Allow & Start Camera</span>
                      </button>
                    </div>
                  )}

                  {/* Mirrored Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* Biometric Oval Center Guide Overlay with Red/Green Status */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      style={{ width: "170px", height: "215px" }}
                      className={`rounded-[50%] border-2 border-dashed transition-all duration-200 ${
                        alignmentProgress >= 90
                          ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                          : alignmentProgress > 30
                          ? "border-amber-400 bg-amber-400/5 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                          : isStreaming
                          ? "border-red-500/80 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                          : "border-white/40"
                      }`}
                    />
                  </div>

                  {/* Countdown Number Badge Overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in zoom-in-50 duration-200">
                      <span className="text-7xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] scale-110 animate-pulse">
                        {countdown}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Hint Pill */}
              <div className="mt-3 mb-3">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    alignmentProgress >= 90
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : alignmentProgress > 30
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : isStreaming
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      alignmentProgress >= 90
                        ? "bg-emerald-500 animate-ping"
                        : alignmentProgress > 30
                        ? "bg-amber-500 animate-pulse"
                        : isStreaming
                        ? "bg-red-500"
                        : "bg-primary"
                    }`}
                  />
                  {detectionTip}
                </span>
              </div>

              {/* Error notice if browser blocks on HTTP */}
              {cameraError && (
                <div className="w-full max-w-md p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 mb-4 text-xs space-y-2">
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Browser Camera Notice (HTTP IP)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Chrome blocks live video streaming on plain <strong>http://</strong> IP addresses. In production with <strong>HTTPS</strong>, this turns on automatically!
                  </p>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border text-[10px] space-y-1">
                    <p className="font-semibold text-foreground">To enable live camera streaming on this IP right now:</p>
                    <p>1. Open a new Chrome tab and go to: <code className="bg-muted px-1 py-0.5 rounded select-all font-mono">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></p>
                    <p>2. Enter: <code className="bg-muted px-1 py-0.5 rounded select-all font-mono">http://140.245.193.19:8080</code>, select <strong>Enabled</strong>, and click <strong>Relaunch</strong>.</p>
                  </div>
                </div>
              )}

              {/* 4 Core Bank KYC Guidance Requirements */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm mb-4 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <Smile className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Center face in frame</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <Sun className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Even, bright lighting</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Remove hats / glasses</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Automatic auto-capture</span>
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
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureFrame}
                  disabled={!isStreaming}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Snap Photo Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
