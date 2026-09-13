"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Result {
  question: string;
  topic: string;
  difficulty: string;
  score: number;
  transcript: string;
  strengths: string;
  weaknesses: string;
  suggestedAnswer: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read the results we saved from the interview page
    const stored = sessionStorage.getItem("interviewResults");
    const storedWarnings = sessionStorage.getItem("warningCount");

    if (storedWarnings) {
      setWarningCount(parseInt(storedWarnings));
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setResults(parsed);
        const avg =
          parsed.reduce((sum: number, r: Result) => sum + (r.score || 0), 0) /
          parsed.length;
        setAvgScore(Math.round(avg * 10) / 10);
      } catch (e) {
        console.error("Failed to parse results:", e);
      }
    }
    setLoading(false);
  }, []);

  // Print styles — inject once when this component mounts
  useEffect(() => {
    const styleId = "print-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @media print {
        /* Force light theme for printing */
        body, main {
          background: white !important;
          color: black !important;
        }
        
        /* Remove dark backgrounds from cards */
        .bg-slate-900, .bg-slate-950, .bg-slate-800,
        [class*="bg-gradient"] {
          background: white !important;
          border-color: #e5e7eb !important;
        }
        
        /* Force all text to black */
        * {
          color: black !important;
          border-color: #d1d5db !important;
        }
        
        /* Keep colored accents readable */
        .text-cyan-400 { color: #0891b2 !important; }
        .text-cyan-300 { color: #0891b2 !important; }
        .text-green-400 { color: #16a34a !important; }
        .text-red-400 { color: #dc2626 !important; }
        .text-yellow-400 { color: #ca8a04 !important; }
        .text-slate-400 { color: #6b7280 !important; }
        .text-slate-500 { color: #6b7280 !important; }
        .text-slate-300 { color: #374151 !important; }
        .text-slate-200 { color: #111827 !important; }
        
        /* Hide non-essential UI when printing */
        .print\\:hidden { display: none !important; }
        
        /* Page layout */
        main { padding: 20px !important; }
        .mx-auto { max-width: 100% !important; }
        
        /* Avoid page breaks inside cards */
        .space-y-6 > div { 
          page-break-inside: avoid;
          margin-bottom: 20px !important;
        }
        
        /* Header for the printed doc */
        main::before {
          content: "HireMind — AI Interview Report";
          display: block;
          font-size: 22px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #0891b2;
          color: #0891b2 !important;
        }
        
        /* Footer with date */
        main::after {
          content: "Generated on ${new Date().toLocaleDateString()}";
          display: block;
          text-align: center;
          font-size: 11px;
          color: #6b7280 !important;
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 6) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    return "Needs Work";
  };

  const handleRestart = () => {
    sessionStorage.removeItem("interviewResults");
    sessionStorage.removeItem("warningCount");
    window.location.href = "/interview";
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-400"></div>
      </main>
    );
  }

  if (results.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-2xl font-bold mb-3">No Report Found</h1>
          <p className="text-slate-400 mb-6">
            We couldn&apos;t find any interview results. Please complete an interview first.
          </p>
          <Link
            href="/interview"
            className="inline-block bg-cyan-400 text-slate-950 font-semibold py-3 px-6 rounded-lg hover:bg-cyan-500 transition-all"
          >
            Start an Interview
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Interview Report</h1>
          <p className="text-slate-400">AI-powered feedback on your performance</p>
        </div>

        {/* Proctoring Alert Banner */}
        {warningCount > 0 && (
          <div
            className={`rounded-lg p-4 mb-6 border ${
              warningCount >= 3
                ? "bg-red-500/10 border-red-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{warningCount >= 3 ? "🚫" : "⚠️"}</div>
              <div className="flex-1">
                <p
                  className={`font-semibold mb-1 ${
                    warningCount >= 3 ? "text-red-400" : "text-yellow-400"
                  }`}
                >
                  Proctoring Alert: {warningCount} warning
                  {warningCount > 1 ? "s" : ""} detected
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {warningCount >= 3
                    ? "This interview was automatically terminated due to repeated violations. The candidate switched tabs, looked away from the screen, or became undetectable multiple times."
                    : `The candidate triggered ${warningCount} proctoring warning${
                        warningCount > 1 ? "s" : ""
                      } during the session. This may indicate tab-switching, distraction, or the candidate looking away from the screen.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overall Score Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 border border-slate-700 mb-8 text-center">
          <p className="text-slate-400 mb-2 uppercase tracking-wider text-sm">
            Overall Score
          </p>
          <p className={`text-7xl font-bold mb-2 ${getScoreColor(avgScore)}`}>
            {avgScore}
            <span className="text-3xl text-slate-500">/10</span>
          </p>
          <p className={`text-lg font-semibold ${getScoreColor(avgScore)}`}>
            {getScoreLabel(avgScore)}
          </p>
          <p className="text-slate-500 text-sm mt-4">
            Based on {results.length} question{results.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Per-Question Breakdown */}
        <div className="space-y-6">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="bg-slate-900 rounded-lg p-6 border border-slate-700"
            >
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-700">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold bg-cyan-500 text-slate-950 px-2 py-1 rounded print:bg-cyan-500 print:text-white">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs text-slate-400">{result.topic}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-400">
                      {result.difficulty}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium">{result.question}</p>
                </div>
                <div className="text-right">
                  <div
                    className={`text-3xl font-bold ${getScoreColor(result.score)}`}
                  >
                    {result.score}
                  </div>
                  <p className="text-xs text-slate-500">/10</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wide">
                    ✓ Strengths
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {result.strengths}
                  </p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wide">
                    ⚠ Areas to Improve
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {result.weaknesses}
                  </p>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wide">
                  💡 Suggested Answer
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {result.suggestedAnswer}
                </p>
              </div>

              <div className="bg-slate-950 rounded border border-slate-800 p-4">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  🎤 What you said
                </p>
                <p className="text-sm text-slate-300 italic leading-relaxed">
                  &ldquo;{result.transcript}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons — hidden when printing */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 print:hidden">
          <button
            onClick={handleDownloadPdf}
            className="flex-1 text-center bg-white text-slate-950 font-semibold py-3 rounded-lg hover:bg-slate-200 transition-all"
          >
            📥 Download Report (PDF)
          </button>
          <button
            onClick={handleRestart}
            className="flex-1 text-center bg-cyan-400 text-slate-950 font-semibold py-3 rounded-lg hover:bg-cyan-500 transition-all"
          >
            🔄 Take Another Interview
          </button>
          <Link
            href="/"
            className="flex-1 text-center bg-slate-800 text-white font-semibold py-3 rounded-lg hover:bg-slate-700 transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}