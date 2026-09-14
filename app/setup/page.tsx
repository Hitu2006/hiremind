"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [jobRole, setJobRole] = useState("Frontend Engineer");
  const [isStarting, setIsStarting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("resumeText");
    if (saved) setResumeText(saved);
    const savedFile = sessionStorage.getItem("resumeFileName");
    if (savedFile) setFileName(savedFile);
    const savedRole = sessionStorage.getItem("jobRole");
    if (savedRole) setJobRole(savedRole);
  }, []);

  // ==========================================
  // PDF PARSING
  // ==========================================
  const handleFileUpload = async (file: File) => {
    setIsParsing(true);
    setParseError(null);

    try {
      if (!file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".txt")) {
        throw new Error("Please upload a PDF or TXT file");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File is too large. Please upload a file under 5MB");
      }

      let extractedText = "";

      if (file.name.toLowerCase().endsWith(".txt")) {
        extractedText = await file.text();
      } else {
        extractedText = await extractPdfText(file);
      }

      extractedText = extractedText.replace(/\s+/g, " ").replace(/\s\s+/g, "\n").trim();

      if (extractedText.length < 50) {
        throw new Error(
          "Could not extract enough text from the file. Is it an image-based PDF? Try pasting the text manually."
        );
      }

      setResumeText(extractedText);
      setFileName(file.name);
      setShowManualPaste(false);
    } catch (err) {
      console.error("PDF parse error:", err);
      setParseError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClearResume = () => {
    setResumeText("");
    setFileName("");
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    sessionStorage.removeItem("resumeText");
    sessionStorage.removeItem("resumeFileName");
  };

  // ==========================================
  // START INTERVIEW — GENERATE QUESTIONS FIRST
  // ==========================================
  const handleStartInterview = async () => {
    if (!resumeText.trim()) {
      alert("Please upload your resume before starting the interview.");
      return;
    }

    setIsStarting(true);
    setIsGenerating(true);
    setStatusMessage("Analyzing your resume...");

    // Save to sessionStorage immediately
    sessionStorage.setItem("resumeText", resumeText.trim());
    sessionStorage.setItem("resumeFileName", fileName);
    sessionStorage.setItem("jobRole", jobRole);

    try {
      // Give the user a moment to see the message
      await new Promise((r) => setTimeout(r, 400));
      setStatusMessage("Generating personalized questions...");

      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeText.trim(),
          jobRole,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions generated");
      }

      // Save questions to sessionStorage for the interview page
      sessionStorage.setItem("interviewQuestions", JSON.stringify(data.questions));
      console.log("✅ Generated questions:", data.questions);

      setStatusMessage("Ready! Starting interview...");
      await new Promise((r) => setTimeout(r, 400));

      const sessionId = `session-${Date.now()}`;
      router.push(`/interview?sessionId=${sessionId}`);
    } catch (error) {
      console.error("Setup error:", error);
      alert(
        "Failed to generate personalized questions. Please try again, or refresh the page."
      );
      setIsStarting(false);
      setIsGenerating(false);
      setStatusMessage("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-4xl font-bold mb-3">Set Up Your Interview</h1>
          <p className="text-slate-400">
            Upload your resume and pick a role. Our AI will generate personalized questions.
          </p>
        </div>

        {/* Job Role */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 mb-6">
          <label className="block text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide">
            🎯 Target Job Role
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {["Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Data Scientist", "DevOps Engineer", "Mobile Engineer"].map((role) => (
              <button
                key={role}
                onClick={() => setJobRole(role)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  jobRole === role
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Resume Upload */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 mb-6">
          <label className="block text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide">
            📎 Upload Your Resume
          </label>

          {resumeText && !isParsing && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-slate-950 font-bold">✓</div>
                    <div>
                      <p className="font-semibold text-green-400">Resume loaded</p>
                      <p className="text-xs text-slate-400">{fileName} · {resumeText.length} characters extracted</p>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-cyan-400">Preview extracted text</summary>
                    <p className="text-xs text-slate-400 mt-2 p-3 bg-slate-950 rounded max-h-32 overflow-y-auto font-mono whitespace-pre-wrap">
                      {resumeText.slice(0, 500)}
                      {resumeText.length > 500 ? "..." : ""}
                    </p>
                  </details>
                </div>
                <button onClick={handleClearResume} className="text-slate-500 hover:text-red-400 transition-colors text-sm">
                  Replace
                </button>
              </div>
            </div>
          )}

          {!resumeText && !isParsing && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl p-10 text-center cursor-pointer transition-all group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📄</div>
              <p className="text-lg font-semibold mb-1">Drop your resume here</p>
              <p className="text-sm text-slate-400 mb-4">or click to browse · PDF or TXT · max 5MB</p>
              <div className="inline-block bg-cyan-400 text-slate-950 font-semibold py-2 px-6 rounded-lg">Choose File</div>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={handleFileInputChange} className="hidden" />
            </div>
          )}

          {isParsing && (
            <div className="border-2 border-cyan-400/50 rounded-xl p-10 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-cyan-400 font-semibold">Extracting text from your resume...</p>
            </div>
          )}

          {parseError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-semibold text-sm mb-1">⚠️ Could not parse file</p>
              <p className="text-xs text-slate-400">{parseError}</p>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={() => setShowManualPaste(!showManualPaste)}
              className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
            >
              {showManualPaste ? "− Hide manual paste" : "+ Or paste resume text manually"}
            </button>
            {showManualPaste && (
              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  setFileName("pasted-resume.txt");
                }}
                placeholder="Paste your resume text here..."
                className="w-full h-48 bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-4 font-mono text-sm leading-relaxed focus:outline-none focus:border-cyan-400 resize-none mt-3"
              />
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
          <p className="text-sm text-cyan-300 font-semibold mb-2">✨ How this works</p>
          <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <li>• Your resume is parsed <strong>in your browser</strong> — nothing uploaded to a server</li>
            <li>• Our AI <strong>generates 5 custom interview questions</strong> based on your specific background</li>
            <li>• The questions adapt to your experience level — junior, mid, or senior</li>
            <li>• Feedback references your actual projects and skills</li>
          </ul>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartInterview}
          disabled={!resumeText.trim() || isStarting || isParsing}
          className="w-full bg-cyan-400 text-slate-950 font-bold py-4 rounded-lg text-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-950"></span>
              {statusMessage || "Generating questions..."}
            </span>
          ) : isStarting ? (
            "Starting..."
          ) : (
            "🎤 Start AI Interview"
          )}
        </button>

        {isGenerating && (
          <p className="text-center text-xs text-cyan-400 mt-4 animate-pulse">
            Our AI is reading your resume and crafting personalized questions...
          </p>
        )}

        {!isGenerating && (
          <p className="text-center text-xs text-slate-500 mt-4">
            Your camera will activate on the next screen
          </p>
        )}
      </div>
    </main>
  );
}