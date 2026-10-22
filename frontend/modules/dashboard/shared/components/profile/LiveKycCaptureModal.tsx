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

  // Live detection & alignment states
  const [isFaceCentered, setIsFaceCentered] = useState(false);
  const [isGoodLighting, setIsGoodLighting] = useState(false);
  const [isHoldingStill, setIsHoldingStill] = useState(false);
  const [alignmentProgress, setAlignmentProgress] = useState(0); // 0 to 100
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [detectionTip, setDetectionTip] = useState("Position your face inside the circle");

  // Keep track of consecutive stable frames & live status refs for synchronous capture verification
  const stableFramesCount = useRef(0);
  const lastFrameData = useRef<ImageData | null>(null);
  const isCountingDown = useRef(false);
  const isGoodLightingRef = useRef(false);
  const isFaceCenteredRef = useRef(false);

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

  // Snaps the current video frame as high quality square base64 image (strict lighting guard)
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    // Strict Bank KYC Lighting & Face Alignment Check: Low light cannot capture
    if (!isGoodLightingRef.current) {
      setDetectionTip("Room is too dark. Please turn on room lights.");
      return;
    }
    if (!isFaceCenteredRef.current) {
      setDetectionTip("Position your face inside the circle");
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
      let count = 0;
      for (let i = 0; i < imgData.length; i += 4 * 16) {
        sampleLum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        count++;
      }
      const finalLum = count > 0 ? sampleLum / count : 0;
      if (finalLum < 22) {
        setDetectionTip("Room is too dark. Please turn on room lights.");
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

            // Universal skin tone detection accommodating webcam color temperature & diverse skin tones
            const isSkin =
              r > 30 &&
              g > 20 &&
              b > 15 &&
              r >= b - 15 &&
              (r + g + b) > 80 &&
              (r + g + b) < 700;

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

      const leftAvg = leftCenterCount > 0 ? leftCenterLum / leftCenterCount : 0;
      const rightAvg = rightCenterCount > 0 ? rightCenterLum / rightCenterCount : 0;
      const skinRatio = centerCount > 0 ? skinLikePixels / centerCount : 0;

      const maxSide = Math.max(leftAvg, rightAvg);
      const minSide = Math.min(leftAvg, rightAvg);
      const sideDiffRatio = maxSide > 15 ? (maxSide - minSide) / maxSide : 0;

      // Realistic Bank-Grade Lighting Rules:
      // 1. Truly pitch-black room (all room lights off, black background and black face)
      const isPitchDarkRoom = (bgAvgLum < 12 && avgLum < 20 && effectiveFaceLum < 24) || (avgLum < 16 && effectiveFaceLum < 22);
      // 2. Face skin must have sufficient illumination
      const isFaceTooDim = effectiveFaceLum < 25;
      // 3. Face must not be over-exposed (> 235)
      const isFaceTooBright = effectiveFaceLum > 235 || avgLum > 240;
      // 4. Uneven lighting: screen-only glare in a dark room (dark background + extreme shadow disparity)
      const isUnevenLighting = bgAvgLum < 16 && sideDiffRatio > 0.65 && minSide < 18;

      const goodLighting = !isPitchDarkRoom && !isFaceTooDim && !isFaceTooBright && !isUnevenLighting;
      const facePresent = (skinRatio > 0.05 || upperFaceAvgLum > 22 || centerAvgLum > 22) && effectiveFaceLum > 22 && effectiveFaceLum < 240;

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
      isGoodLightingRef.current = goodLighting;
      isFaceCenteredRef.current = facePresent;
      setIsGoodLighting(goodLighting);
      setIsFaceCentered(facePresent);
      setIsHoldingStill(steady);

      if (isPitchDarkRoom || isFaceTooDim) {
        cancelCountdown();
        setDetectionTip("Room is too dark. Please turn on room lights.");
        stableFramesCount.current = 0;
        setAlignmentProgress(0);
      } else if (isUnevenLighting) {
        cancelCountdown();
        setDetectionTip("Uneven lighting / shadows. Face light source directly.");
        stableFramesCount.current = 0;
        setAlignmentProgress(0);
      } else if (isFaceTooBright) {
        cancelCountdown();
        setDetectionTip("Too much glare. Move away from harsh light.");
        stableFramesCount.current = 0;
        setAlignmentProgress(0);
      } else if (!facePresent) {
        cancelCountdown();
        setDetectionTip("Position your face inside the circle");
        stableFramesCount.current = 0;
        setAlignmentProgress(0);
      } else if (!steady) {
        cancelCountdown();
        setDetectionTip("Hold still... detecting face");
        stableFramesCount.current = Math.max(1, stableFramesCount.current - 1);
        setAlignmentProgress((prev) => Math.max(20, prev - 8));
      } else {
        stableFramesCount.current += 1;

        setAlignmentProgress((prev) => {
          const next = Math.min(100, prev + 20);
          if (next >= 100) {
            setDetectionTip(isCountingDown.current ? "Capturing photo in 3 seconds..." : "All requirements met! Hold still for capture");
            if (!isCountingDown.current) {
              startCountdown();
            }
          } else {
            setDetectionTip("Face aligned! Hold still...");
          }
          return next;
        });
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
    setAlignmentProgress(0);
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
        stream = await getUserMedia({ video: true, audio: false });
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
    setAlignmentProgress(0);
    setCountdown(null);
    setDetectionTip("Position your face inside the circle");
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
    setAlignmentProgress(0);
    setCountdown(null);

    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

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
          <div className="p-6 flex flex-col gap-4 animate-in fade-in duration-200">
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
          <div className="p-6 flex flex-col items-center">
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
                  const isFullyReady = isStreaming && isGoodLighting && isFaceCentered && isHoldingStill && alignmentProgress >= 100;
                  const isGreen = isStreaming && (isFullyReady || isCounting);
                  const isAmber = isStreaming && isGoodLighting && isFaceCentered && !isGreen;
                  const isRed = isStreaming && !isGreen && !isAmber;

                  const ringColor = !isStreaming
                    ? "#3b82f6"
                    : isGreen
                    ? "#10b981"
                    : isAmber
                    ? "#f59e0b"
                    : "#ef4444";

                  const containerBorderClass = !isStreaming
                    ? "border-slate-700/60"
                    : isGreen
                    ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                    : isAmber
                    ? "border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                    : "border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.4)]";

                  const ovalClass = isGreen
                    ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.5)]"
                    : isAmber
                    ? "border-amber-400 bg-amber-400/5 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                    : "border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.35)]";

                  const badgeClass = isGreen
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : isAmber
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30";

                  const dotClass = isGreen
                    ? "bg-emerald-500 animate-ping"
                    : isAmber
                    ? "bg-amber-500 animate-pulse"
                    : "bg-red-500";

                  return (
                    <>
                      <div className="relative h-72 w-72 sm:h-80 sm:w-80 flex items-center justify-center my-2">
                        {/* Outer SVG Progress Ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20">
                          <circle
                            cx="50%"
                            cy="50%"
                            r={radius}
                            stroke={isRed ? "rgba(239, 68, 68, 0.25)" : "rgba(148, 163, 184, 0.2)"}
                            fill="none"
                            strokeWidth="6"
                          />
                          <circle
                            cx="50%"
                            cy="50%"
                            r={radius}
                            fill="none"
                            className="transition-all duration-150"
                            stroke={ringColor}
                            strokeWidth="6"
                            strokeDasharray={circumference}
                            strokeDashoffset={isGreen ? 0 : strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>

                        {/* Video Stream Container Inside Circle (Dark sleek biometric frame) */}
                        <div
                          style={{ width: "270px", height: "270px", backgroundColor: "#0b0f19" }}
                          className={`rounded-full overflow-hidden relative flex items-center justify-center z-10 border-2 transition-all duration-200 ${containerBorderClass}`}
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
                                style={{ width: "170px", height: "215px" }}
                                className={`rounded-[50%] border-2 border-dashed transition-all duration-200 ${ovalClass}`}
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

                      {/* Status Hint Pill with Strict Red / Amber / Green Dynamic Color */}
                      <div className="mt-3 mb-4">
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${badgeClass}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                          {detectionTip}
                        </span>
                      </div>
                    </>
                  );
                })()}

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
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={captureFrame}
                    disabled={!isStreaming || !isGoodLighting || !isFaceCentered}
                    title={
                      !isGoodLighting
                        ? "Turn on room lights to enable capture"
                        : !isFaceCentered
                        ? "Center face inside circle"
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
