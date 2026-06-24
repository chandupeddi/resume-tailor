import { readFileSync } from "fs";

/**
 * Common tech skills / tools for keyword extraction
 */
const KNOWN_SKILLS = new Set([
  // Languages
  "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang",
  "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "sql",
  "html", "css", "bash", "shell",
  // Frameworks & Libraries
  "react", "angular", "vue", "next.js", "nextjs", "node.js", "nodejs",
  "express", "django", "flask", "fastapi", "spring", "rails",
  "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
  "spark", "hadoop", "airflow", "dbt", "kafka",
  // Databases
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  "dynamodb", "cassandra", "sqlite", "oracle", "snowflake", "bigquery",
  "redshift",
  // Cloud & DevOps
  "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
  "terraform", "jenkins", "ci/cd", "github actions", "gitlab",
  "linux", "nginx",
  // Tools
  "git", "jira", "confluence", "figma", "tableau", "power bi", "looker",
  "excel", "jupyter", "databricks", "sagemaker",
  // Concepts
  "machine learning", "deep learning", "nlp", "natural language processing",
  "computer vision", "data engineering", "data science", "data analytics",
  "etl", "api", "rest", "graphql", "microservices", "agile", "scrum",
]);

/**
 * Analyze a job description text file and extract structured information.
 */
export async function analyzeJD(filePath) {
  const text = readFileSync(filePath, "utf-8");
  return analyzeJDText(text);
}

/**
 * Analyze raw JD text (exported for use by AI providers).
 */
export function analyzeJDText(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const fullText = text.toLowerCase();

  const analysis = {
    jobTitle: extractJobTitle(lines),
    company: extractCompany(lines, text),
    requiredSkills: [],
    preferredSkills: [],
    responsibilities: [],
    industryTerms: [],
    experienceLevel: extractExperienceLevel(text),
    keywords: [],
    matchScore: 0,
  };

  // Extract skills by matching against known skill set
  const foundSkills = new Set();
  for (const skill of KNOWN_SKILLS) {
    if (fullText.includes(skill.toLowerCase())) {
      foundSkills.add(skill);
    }
  }

  // Classify into required vs preferred based on section context
  const { required, preferred } = classifySkills(text, foundSkills);
  analysis.requiredSkills = required;
  analysis.preferredSkills = preferred;

  // Extract responsibilities
  analysis.responsibilities = extractBulletSection(
    text,
    /responsibilit|what you.?ll do|the role|day.to.day|your impact/i
  );

  // Extract all meaningful keywords (nouns and noun phrases)
  analysis.keywords = extractKeywords(text);

  // Industry terms = keywords not in common skills
  analysis.industryTerms = analysis.keywords.filter(
    (k) => !foundSkills.has(k.toLowerCase())
  );

  return analysis;
}

function extractJobTitle(lines) {
  // Job title is often in the first few lines or after "Job Title:" / "Position:"
  for (const line of lines.slice(0, 10)) {
    const match = line.match(/^(?:job\s+title|position|role)\s*[:\-]\s*(.+)/i);
    if (match) return match[1].trim();
  }
  // Fallback: first line that looks like a title (short, capitalized, no colon)
  for (const line of lines.slice(0, 5)) {
    if (line.length > 3 && line.length < 80 && !line.includes(":") && !line.includes("http")) {
      return line;
    }
  }
  return "";
}

function extractCompany(lines, text) {
  // Look for "Company:" header
  for (const line of lines.slice(0, 15)) {
    const match = line.match(/^(?:company|organization|employer)\s*[:\-]\s*(.+)/i);
    if (match) return match[1].trim();
  }

  // Look for "About <Company>" but skip generic phrases like "About the Role"
  const skipAbout = /^about\s+(the|this|our|your)\b/i;
  for (const line of lines.slice(0, 20)) {
    const aboutMatch = line.match(/^about\s+(.+)/i);
    if (aboutMatch && aboutMatch[1].length < 50 && !skipAbout.test(line)) {
      return aboutMatch[1].trim();
    }
  }

  // Try standalone short line after the job title (line 2 or 3)
  for (const line of lines.slice(1, 4)) {
    const trimmed = line.trim();
    if (
      trimmed.length > 1 &&
      trimmed.length < 40 &&
      !trimmed.includes(":") &&
      !trimmed.includes("http") &&
      /^[A-Z]/.test(trimmed) &&
      !/^(about|the|we|our|this|location|remote|hybrid|salary|apply)/i.test(trimmed)
    ) {
      return trimmed;
    }
  }

  // Try "at <Company>" pattern
  const atMatch = text.match(/\bat\s+([A-Z][A-Za-z\s&.]{1,30}?)(?:\s*[,\n\-])/);
  if (atMatch) return atMatch[1].trim();

  return "";
}

function extractExperienceLevel(text) {
  const lower = text.toLowerCase();
  const yearMatch = lower.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1]);
    if (years <= 2) return "entry";
    if (years <= 5) return "mid";
    if (years <= 8) return "senior";
    return "lead";
  }

  if (/\b(senior|sr\.?|lead|principal|staff)\b/i.test(text)) return "senior";
  if (/\b(junior|jr\.?|entry.level|associate|graduate)\b/i.test(text)) return "entry";
  if (/\b(mid.level|intermediate)\b/i.test(text)) return "mid";

  return "mid"; // default
}

function classifySkills(text, foundSkills) {
  const lower = text.toLowerCase();
  const required = [];
  const preferred = [];

  // Find preferred/bonus section boundaries
  const prefIdx = lower.search(/nice.to.have|preferred|bonus|plus|ideal/i);

  for (const skill of foundSkills) {
    const skillIdx = lower.indexOf(skill.toLowerCase());
    if (prefIdx > 0 && skillIdx > prefIdx) {
      preferred.push(skill);
    } else {
      required.push(skill);
    }
  }

  return { required, preferred };
}

function extractBulletSection(text, headerPattern) {
  const lines = text.split("\n");
  const bullets = [];
  let inSection = false;

  for (const line of lines) {
    if (headerPattern.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // Stop at next section header (short all-caps or bold-looking line)
      if (/^[A-Z\s]{5,}$/.test(line.trim()) && line.trim().length < 50) break;
      if (/^(what|who|about|requirement|qualif)/i.test(line.trim())) break;

      const bullet = line.replace(/^[\s•\-\*\d.]+/, "").trim();
      if (bullet.length > 15) bullets.push(bullet);
    }
  }
  return bullets;
}

function extractKeywords(text) {
  // Extract significant words (longer than 3 chars, not common stopwords)
  const stopwords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
    "her", "was", "one", "our", "out", "has", "have", "been", "will",
    "with", "this", "that", "from", "they", "were", "which", "their",
    "what", "about", "would", "there", "when", "make", "like", "time",
    "just", "know", "take", "people", "into", "year", "your", "some",
    "them", "than", "then", "look", "only", "come", "over", "such",
    "also", "back", "after", "work", "well", "these", "should", "must",
    "able", "ability", "strong", "experience", "including", "etc",
    "role", "team", "join", "company", "looking", "working", "using",
  ]);

  const words = text.toLowerCase().match(/\b[a-z][\w.+-]*\b/g) || [];
  const freq = {};

  for (const w of words) {
    if (w.length > 3 && !stopwords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }

  // Return top keywords by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([word]) => word);
}

// Re-export for URL-based analysis
import { fetchJDFromURL } from "./url-fetcher.js";

/**
 * Analyze a job description from a URL.
 */
export async function analyzeJDFromURL(url) {
  const text = await fetchJDFromURL(url);
  return analyzeJDText(text);
}
