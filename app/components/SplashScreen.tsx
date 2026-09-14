"use client";

import { useEffect, useState } from "react";
import HireMindLogo from "./HireMindLogo";

// Generate particles ONCE outside the component to avoid hydration mismatch
const PARTICLES = Array.from({ length: 20 }).map(() => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 3,
  duration: 3 + Math.random() * 3,
}));

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const fadeTimer = setTimeout(() => setIsFadingOut(true), 2400);
    const hideTimer = setTimeout(() => setIsVisible(false), 3100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Don't render on the server at all — prevents hydration mismatch
  if (!isMounted) return null;
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center overflow-hidden transition-opacity duration-700 ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Radial glow that pulses */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-cyan-500/20 blur-[120px] animate-glow" />
      </div>

      {/* Floating particle dots — safe now because we only render on client */}
      <div className="absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/60 animate-float"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Main logo — Target Pulse with cinematic zoom */}
      <div className="relative flex flex-col items-center gap-8 animate-cinematic-zoom">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-cyan-500/40 rounded-full scale-150" />
          <HireMindLogo size={160} animated={true} />
        </div>

        {/* Brand text with Space Grotesk */}
        <div className="text-center">
          <h1
            className="text-7xl font-bold text-white tracking-tight animate-text-reveal"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Hire<span className="text-cyan-400">Mind</span>
          </h1>
          <p
            className="text-slate-400 text-xs mt-4 tracking-[0.5em] uppercase animate-text-reveal"
            style={{
              fontFamily: "var(--font-display), sans-serif",
              animationDelay: "0.4s",
            }}
          >
            AI Interviewer
          </p>
        </div>
      </div>

      {/* Animated underline sweep */}
      <div className="absolute bottom-1/3 w-80 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-sweep" />

      <style jsx>{`
        @keyframes cinematic-zoom {
          0% {
            opacity: 0;
            transform: scale(0.4);
            filter: blur(20px);
          }
          50% {
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0px);
          }
        }
        .animate-cinematic-zoom {
          animation: cinematic-zoom 1.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        @keyframes text-reveal {
          0% {
            opacity: 0;
            transform: translateY(20px);
            letter-spacing: 0.5em;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: -0.02em;
          }
        }
        .animate-text-reveal {
          animation: text-reveal 1s cubic-bezier(0.19, 1, 0.22, 1) 0.5s backwards;
        }

        @keyframes glow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
        }
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 6s linear infinite;
        }

        @keyframes sweep {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          50% {
            transform: scaleX(1);
            opacity: 1;
          }
          100% {
            transform: scaleX(0);
            opacity: 0;
          }
        }
        .animate-sweep {
          animation: sweep 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}