export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  detectedSignals: string[];
}

export function validateResumeText(text: string): ValidationResult {
  const lower = text.toLowerCase();
  const detectedSignals: string[] = [];
  const detectedWarnings: string[] = [];

  let identityScore = 0;
  let careerScore = 0;
  let presentationPenalty = 0;

  // ==========================================
  // IDENTITY SIGNALS (must have at least 2)
  // ==========================================

  // 1. Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emails = text.match(new RegExp(emailRegex, "g")) || [];
  if (emails.length > 0) {
    identityScore += 20;
    detectedSignals.push(`email (${emails.length})`);
  }

  // 2. Phone number
  const phoneRegex = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
  if (phoneRegex.test(text)) {
    identityScore += 15;
    detectedSignals.push("phone");
  }

  // 3. LinkedIn / GitHub URL
  if (/linkedin\.com|github\.com|portfolio/i.test(text)) {
    identityScore += 15;
    detectedSignals.push("professional link");
  }

  // 4. Proper-case name near top (first 200 chars)
  const header = text.slice(0, 200);
  const nameRegex = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/;
  if (nameRegex.test(header)) {
    identityScore += 15;
    detectedSignals.push("name at top");
  }

  // ==========================================
  // CAREER SIGNALS (must have at least 2)
  // ==========================================

  // 5. Job titles
  const jobTitles = [
    "engineer", "developer", "designer", "manager", "analyst",
    "consultant", "architect", "scientist", "specialist",
    "director", "intern", "lead", "senior", "junior",
  ];
  const jobMatches = jobTitles.filter((t) => lower.includes(t));
  if (jobMatches.length >= 2) {
    careerScore += 20;
    detectedSignals.push(`${jobMatches.length} job titles`);
  } else if (jobMatches.length === 1) {
    careerScore += 8;
    detectedSignals.push("1 job title");
  }

  // 6. Education
  const eduKeywords = [
    "bachelor", "master", "b.s.", "m.s.", "b.tech", "m.tech",
    "university", "college", "degree", "phd", "mba",
  ];
  if (eduKeywords.filter((k) => lower.includes(k)).length > 0) {
    careerScore += 15;
    detectedSignals.push("education");
  }

  // 7. Resume section headers (STRONGEST signal)
  const sectionKeywords = [
    "work experience", "professional experience", "employment history",
    "skills", "technical skills", "projects", "education",
    "certifications", "achievements", "work history", "summary",
    "objective", "profile", "interests", "references",
  ];
  const sectionMatches = sectionKeywords.filter((k) => lower.includes(k));
  if (sectionMatches.length >= 3) {
    careerScore += 30;
    detectedSignals.push(`${sectionMatches.length} resume sections`);
  } else if (sectionMatches.length === 2) {
    careerScore += 15;
    detectedSignals.push("2 resume sections");
  } else if (sectionMatches.length === 1) {
    careerScore += 5;
    detectedSignals.push("1 resume section");
  }

  // 8. Work history dates (year ranges)
  const yearRangeRegex = /\b(19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current)/gi;
  const yearRanges = text.match(yearRangeRegex) || [];
  if (yearRanges.length >= 1) {
    careerScore += 15;
    detectedSignals.push(`${yearRanges.length} date ranges`);
  }

  // ==========================================
  // PRESENTATION / REPORT PENALTIES
  // ==========================================

  // Presentation markers
  const presentationKeywords = [
    "slide", "presentation", "agenda", "topics covered",
    "thank you", "questions?", "q&a", "outline", "table of contents",
    "chapter", "figure", "table", "appendix", "references",
  ];
  const presentationMatches = presentationKeywords.filter((k) => lower.includes(k));
  if (presentationMatches.length >= 2) {
    presentationPenalty += 40;
    detectedWarnings.push(`presentation content (${presentationMatches.length} markers)`);
  }

  // Academic report markers
  const reportKeywords = [
    "abstract", "introduction", "literature review", "methodology",
    "conclusion", "bibliography", "hypothesis", "experiment",
    "objective:", "aim:", "scope:",
  ];
  const reportMatches = reportKeywords.filter((k) => lower.includes(k));
  if (reportMatches.length >= 3) {
    presentationPenalty += 30;
    detectedWarnings.push(`academic report (${reportMatches.length} markers)`);
  }

  // Too few emails for a resume with a career
  if (emails.length === 0) {
    presentationPenalty += 20;
    detectedWarnings.push("no email address");
  }

  // ==========================================
  // LENGTH CHECK
  // ==========================================
  if (text.length < 300) {
    return {
      isValid: false,
      confidence: 0,
      reason: "Document is too short to be a resume",
      detectedSignals,
    };
  }

  if (text.length > 15000) {
    presentationPenalty += 20;
    detectedWarnings.push("unusually long");
  }

  // ==========================================
  // FINAL DECISION
  // ==========================================

  // Rule 1: Must have at least 30 identity points (name + email/phone/link)
  // Rule 2: Must have at least 25 career points (job titles + sections + dates)
  // Rule 3: Penalties can't exceed career score

  const totalScore = identityScore + careerScore - presentationPenalty;
  const confidence = Math.max(0, Math.min(100, totalScore));

  let isValid = false;
  let reason = "";

  if (identityScore < 25) {
    reason = "Missing personal identification (name, email, or phone). This looks more like a document than a resume.";
  } else if (careerScore < 30) {
    reason = "Missing professional content (job titles, sections, work history). This doesn't appear to be a resume.";
  } else if (presentationPenalty >= 40) {
    reason = `This looks like a presentation or report, not a resume. Found: ${detectedWarnings.join(", ")}`;
  } else if (confidence >= 60) {
    isValid = true;
    reason = "Looks like a valid resume";
  } else {
    reason = "This document doesn't appear to be a resume";
  }

  return {
    isValid,
    confidence,
    reason,
    detectedSignals: [...detectedSignals, ...detectedWarnings.map((w) => `⚠ ${w}`)],
  };
}