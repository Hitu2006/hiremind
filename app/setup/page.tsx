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
  const [parseError, setParseError] = useState<string | null>(null);
  const [showManualPaste, setShowManualPaste] = useState(false);

  // Load any previously saved resume from sessionStorage
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
      // Validate file type
      if (!file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".txt")) {
        throw new Error("Please upload a PDF or TXT file");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File is too large. Please upload a file under 5MB");
      }

      let extractedText = "";

      if (file.name.toLowerCase().endsWith(".txt")) {
        // Simple text file
        extractedText = await file.text();
      } else {
        // PDF parsing
        extractedText = await extractPdfText(file);
      }

      // Clean up the extracted text
      extractedText = extractedText
        .replace(/\s+/g, " ")
        .replace(/\s\s+/g, "\n")
        .trim();

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
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker path (required for PDF.js)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    // Loop through all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
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
  // START INTERVIEW
  // ==========================================
  const handleStartInterview = () => {
    if (!resumeText.trim()) {
      alert("Please upload your resume before starting the interview.");
      return;
    }

    setIsStarting(true);

    sessionStorage.setItem("resumeText", resumeText.trim());
    sessionStorage.setItem("resumeFileName", fileName);
    sessionStorage.setItem("jobRole", jobRole);

    const sessionId = `session-${Date.now()}`;
    router.push(`/interview?sessionId=${sessionId}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-4xl font-bold mb-3">Set Up Your Interview</h1>
          <p className="text-slate-400">
            Upload your resume and pick a role. Our AI will tailor the interview to your background.
          </p>
        </div>

        {/* Job Role Selector */}
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

          {/* Success state — resume uploaded */}
          {resumeText && !isParsing && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-slate-950 font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-green-400">Resume loaded</p>
                      <p className="text-xs text-slate-400">
                        {fileName} · {resumeText.length} characters extracted
                      </p>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-cyan-400">
                      Preview extracted text
                    </summary>
                    <p className="text-xs text-slate-400 mt-2 p-3 bg-slate-950 rounded max-h-32 overflow-y-auto font-mono whitespace-pre-wrap">
                      {resumeText.slice(0, 500)}
                      {resumeText.length > 500 ? "..." : ""}
                    </p>
                  </details>
                </div>
                <button
                  onClick={handleClearResume}
                  className="text-slate-500 hover:text-red-400 transition-colors text-sm"
                >
                  Replace
                </button>
              </div>
            </div>
          )}

          {/* Dropzone — shown when no resume yet */}
          {!resumeText && !isParsing && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl p-10 text-center cursor-pointer transition-all group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📄</div>
              <p className="text-lg font-semibold mb-1">Drop your resume here</p>
              <p className="text-sm text-slate-400 mb-4">
                or click to browse · PDF or TXT · max 5MB
              </p>
              <div className="inline-block bg-cyan-400 text-slate-950 font-semibold py-2 px-6 rounded-lg">
                Choose File
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* Parsing state */}
          {isParsing && (
            <div className="border-2 border-cyan-400/50 rounded-xl p-10 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-cyan-400 font-semibold">Extracting text from your resume...</p>
              <p className="text-xs text-slate-500 mt-2">This usually takes 1-2 seconds</p>
            </div>
          )}

          {/* Error state */}
          {parseError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-semibold text-sm mb-1">⚠️ Could not parse file</p>
              <p className="text-xs text-slate-400">{parseError}</p>
            </div>
          )}

          {/* Fallback: manual paste */}
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
          <p className="text-sm text-cyan-300 font-semibold mb-2">💡 How this works</p>
          <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <li>• Your resume is parsed <strong>in your browser</strong> — nothing is uploaded to a server</li>
            <li>• The AI uses it as <strong>context</strong> to tailor questions and feedback</li>
            <li>• Feedback will reference your actual projects and skills</li>
            <li>• Supported formats: PDF and TXT</li>
          </ul>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartInterview}
          disabled={!resumeText.trim() || isStarting || isParsing}
          className="w-full bg-cyan-400 text-slate-950 font-bold py-4 rounded-lg text-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isStarting ? "Starting..." : "🎤 Start AI Interview"}
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Your camera will activate on the next screen
        </p>
      </div>
    </main>
  );
}