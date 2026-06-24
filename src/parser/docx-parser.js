import mammoth from "mammoth";
import { readFileSync } from "fs";

/**
 * Parse a .docx resume into structured data.
 * Uses mammoth to extract text, then applies heuristics to identify sections.
 */
export async function parseDocx(filePath) {
  const buffer = readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  return parseResumeText(text);
}

/**
 * Heuristic parser: splits resume text into sections based on common headings.
 */
function parseResumeText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const resume = {
    name: "",
    contact: { email: "", phone: "", linkedin: "", location: "", website: "" },
    summary: "",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
  };

  // Extract name — usually the first non-empty line
  if (lines.length > 0) {
    resume.name = lines[0];
  }

  // Extract contact info from first few lines
  const contactBlock = lines.slice(0, 8).join(" ");
  const emailMatch = contactBlock.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) resume.contact.email = emailMatch[0];

  const phoneMatch = contactBlock.match(/[\+]?[\d\s\-().]{10,}/);
  if (phoneMatch) resume.contact.phone = phoneMatch[0].trim();

  const linkedinMatch = contactBlock.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) resume.contact.linkedin = linkedinMatch[0];

  // Identify sections by common headings
  const sectionPatterns = {
    summary: /^(professional\s+)?summary|^profile|^objective|^about/i,
    experience: /^(professional\s+)?experience|^work\s+experience|^employment/i,
    projects: /^(key\s+)?projects|^personal\s+projects/i,
    skills: /^(technical\s+)?skills|^competencies|^technologies/i,
    education: /^education/i,
    certifications: /^certifications?|^licenses?/i,
  };

  // Find section boundaries
  const sections = [];
  for (let i = 0; i < lines.length; i++) {
    for (const [name, pattern] of Object.entries(sectionPatterns)) {
      // Match headings: all-caps, or heading-style text
      const cleaned = lines[i].replace(/[^a-zA-Z\s]/g, "").trim();
      if (pattern.test(cleaned)) {
        sections.push({ name, startIndex: i + 1 });
      }
    }
  }

  // Sort by position and extract content between sections
  sections.sort((a, b) => a.startIndex - b.startIndex);

  for (let s = 0; s < sections.length; s++) {
    const start = sections[s].startIndex;
    const end = s + 1 < sections.length ? sections[s + 1].startIndex - 1 : lines.length;
    const content = lines.slice(start, end);
    const sectionName = sections[s].name;

    switch (sectionName) {
      case "summary":
        resume.summary = content.join(" ");
        break;

      case "experience":
        resume.experience = parseExperience(content);
        break;

      case "projects":
        resume.projects = parseProjects(content);
        break;

      case "skills":
        resume.skills = parseSkills(content);
        break;

      case "education":
        resume.education = parseEducation(content);
        break;

      case "certifications":
        resume.certifications = content.filter((l) => l.length > 3);
        break;
    }
  }

  return resume;
}

function parseExperience(lines) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    // Detect job title / company lines (heuristic: contains date range)
    const dateMatch = line.match(
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}\s*[-–]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4})/i
    );

    if (dateMatch) {
      if (current) entries.push(current);
      current = {
        company: "",
        title: "",
        location: "",
        startDate: "",
        endDate: "",
        bullets: [],
        _raw: line,
      };
      // Try to extract title and company from the line
      const beforeDate = line.substring(0, line.indexOf(dateMatch[0])).trim();
      const parts = beforeDate.split(/[|,–-]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        current.title = parts[0];
        current.company = parts[1];
      } else if (parts.length === 1) {
        current.title = parts[0];
      }
      const dates = dateMatch[0].split(/[-–]/);
      current.startDate = dates[0]?.trim() || "";
      current.endDate = dates[1]?.trim() || "";
    } else if (current) {
      // Bullet point or continuation
      const bullet = line.replace(/^[•\-\*]\s*/, "").trim();
      if (bullet.length > 10) {
        current.bullets.push(bullet);
      } else if (!current.company && bullet.length > 2) {
        current.company = bullet;
      }
    }
  }
  if (current) entries.push(current);
  return entries;
}

function parseProjects(lines) {
  const projects = [];
  let current = null;

  for (const line of lines) {
    // Project titles tend to be short lines or lines with tech stack in parens/brackets
    const techMatch = line.match(/[[(](.*?)[\])]/);
    if (techMatch && line.length < 150 && !line.startsWith("•")) {
      if (current) projects.push(current);
      const title = line.replace(/[[(].*?[\])]/, "").replace(/[|–-]\s*$/, "").trim();
      current = {
        title: title || line,
        tech: techMatch[1] || "",
        description: "",
      };
    } else if (current) {
      const text = line.replace(/^[•\-\*]\s*/, "").trim();
      current.description += (current.description ? " " : "") + text;
    }
  }
  if (current) projects.push(current);
  return projects;
}

function parseSkills(lines) {
  const skills = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 40) {
      const category = line.substring(0, colonIdx).replace(/^[•\-\*]\s*/, "").trim();
      const items = line
        .substring(colonIdx + 1)
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length > 0) {
        skills.push({ category, items });
      }
    }
  }
  return skills;
}

function parseEducation(lines) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const degreeMatch = line.match(
      /\b(Bachelor|Master|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D|MBA|Associate)/i
    );
    if (degreeMatch) {
      if (current) entries.push(current);
      current = {
        school: "",
        degree: line.replace(/^[•\-\*]\s*/, "").trim(),
        gpa: "",
        startDate: "",
        endDate: "",
      };
      const gpaMatch = line.match(/GPA[:\s]*(\d\.\d+)/i);
      if (gpaMatch) current.gpa = gpaMatch[1];
    } else if (current && !current.school) {
      current.school = line.replace(/^[•\-\*]\s*/, "").trim();
    }
  }
  if (current) entries.push(current);
  return entries;
}
