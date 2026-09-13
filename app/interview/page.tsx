"use client";


import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface Question {
  id: number;
  text: string;
  topic: string;
  difficulty: string;
}

const MOCK_QUESTIONS: Question[] = [
  { id: 1, text: "Tell me about your experience with React. What projects have you built?", topic: "React Fundamentals", difficulty: "Medium" },
  { id: 2, text: "How would you optimize a component that renders a list of 10,000 items?", topic: "Performance Optimization", difficulty: "Hard" },
  { id: 3, text: "Explain the difference between useCallback and useMemo hooks.", topic: "React Hooks", difficulty: "Medium" },
  { id: 4, text: "How do you handle state management in large applications?", topic: "State Management", difficulty: "Hard" },
  { id: 5, text: "What is your approach to testing React components?", topic: "Testing", difficulty: "Medium" },
];

export default function InterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "demo-session";

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Proctoring refs
  const faceDetectorRef = useRef<any>(null);
  const proctorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceMissingStartRef = useRef<number | null>(null);
  const offScreenStartRef = useRef<number | null>(null);
  const lastWarningTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const warningCountRef = useRef(0);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");

  // Proctoring state
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [proctoringActive, setProctoringActive] = useState(false);

  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];

  // Sync refs with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  // ==========================================
  // 1. CAMERA INITIALIZATION
  // ==========================================
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraActive(true);
          };
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to access camera");
      }
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // ==========================================
  // 2. RECORDING TIMER
  // ==========================================
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // ==========================================
  // 3. PROCTORING: WARNING TRIGGER
  // ==========================================
  const triggerWarning = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastWarningTimeRef.current < 5000) return;
    lastWarningTimeRef.current = now;

    const newCount = warningCountRef.current + 1;
    setWarningCount(newCount);
    warningCountRef.current = newCount;
    setWarningMessage(message);
    setShowWarning(true);

    console.warn(`⚠️ PROCTORING WARNING ${newCount}/3: ${message}`);

    setTimeout(() => setShowWarning(false), 4000);

    if (newCount >= 3) {
      console.error("🚫 3 warnings reached. Auto-submitting interview.");
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsInterviewComplete(true);
      }, 500);
    }
  }, []);

  // ==========================================
  // 4. PROCTORING: TAB SWITCH DETECTION
  // ==========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRecordingRef.current) {
        triggerWarning("Please do not switch tabs or windows during the interview");
      }
    };

    const handleBlur = () => {
      if (isRecordingRef.current) {
        setTimeout(() => {
          if (document.hidden && isRecordingRef.current) {
            triggerWarning("Please stay on the interview screen");
          }
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [triggerWarning]);

  // ==========================================
  // 5. PROCTORING: FACE DETECTION
  // ==========================================
  useEffect(() => {
    if (!isRecording || !cameraActive) {
      setProctoringActive(false);
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current);
        proctorIntervalRef.current = null;
      }
      return;
    }

    setProctoringActive(true);
    console.log("🎥 Proctoring started");

    if (!videoCanvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      videoCanvasRef.current = canvas;
    }

    const initFaceDetector = async () => {
      if ("FaceDetector" in window && !faceDetectorRef.current) {
        try {
          // @ts-ignore
          faceDetectorRef.current = new window.FaceDetector({
            fastMode: true,
            maxDetectedFaces: 1,
          });
          console.log("✅ FaceDetector API initialized");
        } catch (e) {
          console.warn("FaceDetector init failed, using fallback:", e);
        }
      }
    };

    initFaceDetector();

    proctorIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !isRecordingRef.current) return;

      const canvas = videoCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        if (faceDetectorRef.current) {
          try {
            const faces = await faceDetectorRef.current.detect(canvas);
            if (faces.length === 0) {
              if (!faceMissingStartRef.current) {
                faceMissingStartRef.current = Date.now();
              } else if (Date.now() - faceMissingStartRef.current > 4000) {
                triggerWarning("No face detected. Please ensure your face is visible.");
                faceMissingStartRef.current = null;
              }
            } else {
              faceMissingStartRef.current = null;
            }
          } catch (e) {
            // FaceDetector threw, ignore silently
          }
        }
      } catch (e) {
        // Canvas draw failed, ignore
      }
    }, 1000);

    return () => {
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current);
        proctorIntervalRef.current = null;
      }
      setProctoringActive(false);
    };
  }, [isRecording, cameraActive, triggerWarning]);

  // ==========================================
  // 6. RECORDING CONTROLS
  // ==========================================
  const startRecording = () => {
    if (!streamRef.current) return;
    try {
      chunksRef.current = [];
      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlobs((prev) => [...prev, blob]);
        console.log("✅ Answer recorded, size:", blob.size, "bytes");
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      faceMissingStartRef.current = null;
      offScreenStartRef.current = null;
    } catch (e) {
      console.error("Failed to start recording:", e);
    }
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          setRecordedBlobs((prev) => [...prev, blob]);
          console.log("✅ Answer stopped, size:", blob.size, "bytes");
          resolve();
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } else {
        resolve();
      }
    });
  };

  const handleSubmitAnswer = async () => {
    await stopRecording();

    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setRecordingTime(0);
    } else {
      setIsInterviewComplete(true);
    }
  };

  // ==========================================
  // 7. AI ANALYSIS (WITH RESUME CONTEXT)
  // ==========================================
  const handleFinishInterview = async () => {
    console.log("🔴🔴🔴 HANDLE FINISH INTERVIEW CALLED 🔴🔴🔴");
    console.log("🔴 recordedBlobs count:", recordedBlobs.length);
    console.log("🔴 warnings received:", warningCount);

    if (recordedBlobs.length === 0) {
      console.warn("⚠️ No recorded blobs! Nothing to analyze.");
      setError("No recordings found. Please record at least one answer.");
      return;
    }

    // ✅ Pull resume & job role from sessionStorage
    const resumeText = sessionStorage.getItem("resumeText") || "";
    const jobRole = sessionStorage.getItem("jobRole") || "Software Engineer";
    console.log(`🔴 Resume length: ${resumeText.length} chars`);
    console.log(`🔴 Job role: ${jobRole}`);

    setIsAnalyzing(true);
    setAnalysisProgress("Starting analysis...");

    try {
      const analysisResults = [];

      for (let i = 0; i < recordedBlobs.length; i++) {
        const blob = recordedBlobs[i];
        const question = MOCK_QUESTIONS[i];

        setAnalysisProgress(`Analyzing answer ${i + 1} of ${recordedBlobs.length}...`);

        const formData = new FormData();
        formData.append("audio", blob, `answer-${i}.webm`);
        formData.append("question", question.text);
        formData.append("topic", question.topic);
        // ✅ Send resume and job role to the API
        formData.append("resume", resumeText);
        formData.append("jobRole", jobRole);

        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`❌ API error for Q${i + 1}:`, errText);
          analysisResults.push({
            question: question.text,
            topic: question.topic,
            difficulty: question.difficulty,
            score: 0,
            transcript: "(Analysis failed)",
            strengths: "Could not analyze this answer.",
            weaknesses: "Please try again.",
            suggestedAnswer: "N/A",
          });
          continue;
        }

        const data = await response.json();

        analysisResults.push({
          question: question.text,
          topic: question.topic,
          difficulty: question.difficulty,
          score: data.score,
          transcript: data.transcript,
          strengths: data.strengths,
          weaknesses: data.weaknesses,
          suggestedAnswer: data.suggestedAnswer,
        });
      }

      setAnalysisProgress("Finalizing report...");
      sessionStorage.setItem("interviewResults", JSON.stringify(analysisResults));
      sessionStorage.setItem("sessionId", sessionId);
      sessionStorage.setItem("warningCount", String(warningCount));

      router.push(`/results?sessionId=${sessionId}`);
    } catch (error) {
      console.error("❌ Analysis failed:", error);
      setError("Something went wrong during analysis. Check console for details.");
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ==========================================
  // 8. RENDER: ANALYZING SCREEN
  // ==========================================
  if (isAnalyzing) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6 text-white">
        <div className="text-center max-w-lg w-full">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-cyan-400 mx-auto mb-8"></div>
          <h1 className="text-3xl font-bold mb-3">Analyzing your interview</h1>
          <p className="text-slate-400 mb-8">Our AI is listening and evaluating your answers</p>

          <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
            <p className="text-cyan-400 font-mono text-sm">{analysisProgress}</p>
            <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full animate-pulse" style={{ width: "70%" }}></div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-6">This usually takes 3-5 seconds per answer</p>
        </div>
      </main>
    );
  }

  // ==========================================
  // 9. RENDER: COMPLETE SCREEN
  // ==========================================
  if (isInterviewComplete) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6 text-white">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-6">{warningCount >= 3 ? "🚫" : "🎉"}</div>
          <h1 className="text-4xl font-bold mb-4">
            {warningCount >= 3 ? "Interview Ended" : "Interview Complete!"}
          </h1>
          {warningCount >= 3 ? (
            <p className="text-red-400 mb-4">
              Your interview was automatically ended due to repeated violations ({warningCount} warnings).
            </p>
          ) : (
            <p className="text-slate-300 mb-2">
              You answered <span className="text-cyan-400 font-semibold">{recordedBlobs.length}</span> out of {MOCK_QUESTIONS.length} questions.
            </p>
          )}
          {warningCount > 0 && warningCount < 3 && (
            <p className="text-yellow-400 text-sm mb-4">
              ⚠️ You received {warningCount} warning{warningCount > 1 ? "s" : ""} during this interview.
            </p>
          )}
          <p className="text-slate-400 text-sm mb-8">
            Ready to generate your personalized AI report?
          </p>
          <button
            onClick={handleFinishInterview}
            className="w-full bg-cyan-400 text-slate-950 font-semibold py-3 rounded-lg hover:bg-cyan-500 mb-4 transition-all"
          >
            ✨ Generate AI Report
          </button>
          <Link href="/" className="text-cyan-400 hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================
  // 10. RENDER: INTERVIEW SCREEN
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Live Interview</h1>
            <p className="text-sm text-slate-400 mt-1">
              Question {currentQuestionIndex + 1} of {MOCK_QUESTIONS.length}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-mono font-bold ${isRecording ? "text-red-400" : "text-cyan-400"}`}>
              {formatTime(recordingTime)}
            </div>
            <p className="text-xs text-slate-400">Recording time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video border-2 border-slate-700">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full z-10">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">REC</span>
                </div>
              )}

              {cameraActive && !isRecording && (
                <div className="absolute bottom-4 left-4 bg-green-600/80 px-3 py-1 rounded-full text-xs font-semibold z-10">
                  ✓ Camera Active
                </div>
              )}

              {proctoringActive && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-yellow-600/90 px-3 py-1 rounded-full z-10">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold">PROCTORING</span>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center">
                  <p className="text-red-400 font-bold mb-2">Error</p>
                  <p className="text-slate-300 text-sm">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 bg-cyan-500 text-slate-950 px-4 py-2 rounded font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs font-semibold bg-cyan-500 text-slate-950 px-2 py-1 rounded">
                  {currentQuestion.topic}
                </span>
                <span className="text-xs text-slate-400">{currentQuestion.difficulty}</span>
              </div>
              <p className="text-lg leading-relaxed text-slate-100">{currentQuestion.text}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startRecording}
                disabled={isRecording || !cameraActive}
                className="flex-1 bg-cyan-400 text-slate-950 font-semibold py-3 rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isRecording ? "🔴 Recording..." : "🎤 Start Answering"}
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={!isRecording}
                className="flex-1 bg-slate-700 text-white font-semibold py-3 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ✓ Submit Answer
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <h2 className="font-semibold mb-4 text-sm">Status</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Camera</span>
                  <span className={cameraActive ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                    {cameraActive ? "✓ Active" : "✗ Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Recording</span>
                  <span className={isRecording ? "text-green-400 font-semibold" : "text-slate-400"}>
                    {isRecording ? "✓ Active" : "○ Idle"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Answers</span>
                  <span className="text-cyan-400 font-semibold">
                    {recordedBlobs.length} / {MOCK_QUESTIONS.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Warnings</span>
                  <span className={warningCount > 0 ? "text-red-400 font-semibold" : "text-slate-400"}>
                    {warningCount} / 3
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <h2 className="font-semibold mb-3 text-sm">Progress</h2>
              <div className="space-y-2">
                {MOCK_QUESTIONS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx < currentQuestionIndex
                        ? "bg-green-500"
                        : idx === currentQuestionIndex
                          ? "bg-cyan-400"
                          : "bg-slate-700"
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
              <h2 className="font-semibold mb-2 text-sm text-red-400">⚠️ Proctoring Active</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                This interview is being monitored. Tab switching, looking away,
                or hiding your face will result in warnings. 3 warnings = auto-submit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WARNING MODAL */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-red-600 text-white px-8 py-8 rounded-2xl shadow-2xl text-center max-w-md mx-4 animate-bounce">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-xl font-bold mb-2">Warning!</p>
            <p className="text-sm mb-4 opacity-90">{warningMessage}</p>
            <div className="bg-white/20 rounded-full px-4 py-2 inline-block">
              <p className="text-sm font-bold">{warningCount} / 3 warnings</p>
            </div>
            {warningCount >= 3 && (
              <p className="text-xs mt-4 text-red-100">
                Interview is being terminated...
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}