export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reason: string;
  detectedSignals: string[];
}

export function validateResumeText(text: string): ValidationResult {
  const lower = text.toLowerCase();
  const detectedSignals: string[] = [];
  let score = 0;

  // 1. Email address
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) {
    score += 15;
    detectedSignals.push("email");
  }

  // 2. Phone number
  const phoneRegex = /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/;
  if (phoneRegex.test(text)) {
    score += 10;
    detectedSignals.push("phone");
  }

  // 3. Job titles
  const jobTitles = [
    "engineer", "developer", "designer", "manager", "analyst",
    "consultant", "architect", "scientist", "specialist",
    "director", "intern", "lead", "senior", "junior",
  ];
  const jobMatches = jobTitles.filter((t) => lower.includes(t));
  if (jobMatches.length > 0) {
    score += Math.min(20, jobMatches.length * 8);
    detectedSignals.push(`job_title: ${jobMatches.slice(0, 2).join(", ")}`);
  }

  // 4. Education
  const eduKeywords = [
    "bachelor", "master", "b.s.", "m.s.", "b.tech", "m.tech",
    "university", "college", "degree", "phd", "mba",
  ];
  const eduMatches = eduKeywords.filter((k) => lower.includes(k));
  if (eduMatches.length > 0) {
    score += 15;
    detectedSignals.push("education");
  }

  // 5. Section headers (very strong signal)
  const sectionKeywords = [
    "experience", "skills", "education", "projects", "summary",
    "work history", "employment", "certifications", "achievements",
    "objective", "profile",
  ];
  const sectionMatches = sectionKeywords.filter((k) => lower.includes(k));
  if (sectionMatches.length >= 2) {
    score += 25;
    detectedSignals.push(`${sectionMatches.length} sections`);
  } else if (sectionMatches.length === 1) {
    score += 10;
    detectedSignals.push("1 section");
  }

  // 6. Dates (year ranges)
  const yearRegex = /\b(19|20)\d{2}\b/g;
  const years = text.match(yearRegex) || [];
  if (years.length >= 2) {
    score += 10;
    detectedSignals.push(`${years.length} dates`);
  }

  // 7. Length check — resumes are usually 500-8000 characters
  if (text.length < 200) {
    return {
      isValid: false,
      confidence: 0,
      reason: "Document is too short to be a resume",
      detectedSignals,
    };
  }

  // 8. Gibberish check — too many non-alphanumeric characters
  const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
  if (alphanumericRatio < 0.5) {
    return {
      isValid: false,
      confidence: 0,
      reason: "Document contains too much non-text content (may be a scanned image or gibberish)",
      detectedSignals,
    };
  }

  const confidence = Math.min(100, score);
  const isValid = confidence >= 50;

  let reason = "";
  if (isValid) {
    reason = "Looks like a valid resume";
  } else if (confidence >= 30) {
    reason = "This doesn't look like a standard resume. Please upload a resume PDF.";
  } else {
    reason = "This document doesn't appear to be a resume. Please upload your resume.";
  }

  return {
    isValid,
    confidence,
    reason,
    detectedSignals,
  };
}