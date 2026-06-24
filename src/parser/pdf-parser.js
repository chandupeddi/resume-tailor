import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

/**
 * Parse a .pdf resume into structured data.
 */
export async function parsePDF(filePath) {
  const buffer = readFileSync(filePath);
  const data = await pdf(buffer);
  const text = data.text;
  return parseResumeText(text);
}

function parseResumeText(text) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

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

  for (const line of lines.slice(0, 5)) {
    if (
      !line.includes("@") && !line.match(/^\d{3}/) &&
      !line.includes("linkedin") && !line.includes("http") &&
      line.length > 2 && line.length < 60
    ) {
      resume.name = line;
      break;
    }
  }

  const contactBlock = lines.slice(0, 10).join(" ");
  const emailMatch = contactBlock.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) resume.contact.email = emailMatch[0];
  const phoneMatch = contactBlock.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) resume.contact.phone = phoneMatch[0].trim();
  const linkedinMatch = contactBlock.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) resume.contact.linkedin = linkedinMatch[0];

  const sectionPatterns = {
    summary: /^(professional\s+)?summary|^profile|^objective|^about\s+me/i,
    experience: /^(professional\s+)?experience|^work\s+experience|^employment/i,
    projects: /^(key\s+)?projects|^personal\s+projects/i,
    skills: /^(technical\s+)?skills|^competencies|^technologies/i,
    education: /^education/i,
    certifications: /^certifications?|^licenses?/i,
  };

  const sections = [];
  for (let i = 0; i < lines.length; i++) {
    const cleaned = lines[i].replace(/[^a-zA-Z\s]/g, "").trim();
    for (const [name, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(cleaned) && cleaned.length < 40) {
        sections.push({ name, startIndex: i + 1 });
      }
    }
  }
  sections.sort((a, b) => a.startIndex - b.startIndex);

  for (let s = 0; s < sections.length; s++) {
    const start = sections[s].startIndex;
    const end = s + 1 < sections.length ? sections[s + 1].startIndex - 1 : lines.length;
    const content = lines.slice(start, end);

    switch (sections[s].name) {
      case "summary": resume.summary = content.join(" "); break;
      case "experience": resume.experience = parseExperience(content); break;
      case "projects": resume.projects = parseProjects(content); break;
      case "skills": resume.skills = parseSkills(content); break;
      case "education": resume.education = parseEducation(content); break;
      case "certifications": resume.certifications = content.filter((l) => l.length > 3); break;
    }
  }
  return resume;
}

function parseExperience(lines) {
  const entries = [];
  let current = null;
  for (const line of lines) {
    const dateMatch = line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}\s*[-–—]\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4})/i)
      || line.match(/\b(20\d{2})\s*[-–—]\s*(Present|Current|20\d{2})\b/i);
    if (dateMatch) {
      if (current) entries.push(current);
      current = { company: "", title: "", location: "", startDate: "", endDate: "", bullets: [] };
      const beforeDate = line.substring(0, line.indexOf(dateMatch[0])).trim();
      const parts = beforeDate.split(/[|,–—-]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) { current.title = parts[0]; current.company = parts[1]; }
      else if (parts.length === 1) { current.title = parts[0]; }
      const dates = dateMatch[0].split(/[-–—]/);
      current.startDate = dates[0]?.trim() || "";
      current.endDate = dates[1]?.trim() || "";
    } else if (current) {
      const bullet = line.replace(/^[•●○◦▪▸►\-\*]\s*/, "").trim();
      if (bullet.length > 10) current.bullets.push(bullet);
      else if (!current.company && bullet.length > 2) current.company = bullet;
    }
  }
  if (current) entries.push(current);
  return entries;
}

function parseProjects(lines) {
  const projects = [];
  let current = null;
  for (const line of lines) {
    const techMatch = line.match(/[[(](.*?)[\])]/);
    if (techMatch && line.length < 150 && !/^[•●\-\*]/.test(line)) {
      if (current) projects.push(current);
      const title = line.replace(/[[(].*?[\])]/, "").replace(/[|–-]\s*$/, "").trim();
      current = { title: title || line, tech: techMatch[1] || "", description: "" };
    } else if (current) {
      const text = line.replace(/^[•●\-\*]\s*/, "").trim();
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
      const items = line.substring(colonIdx + 1).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
      if (items.length > 0) skills.push({ category, items });
    }
  }
  return skills;
}

function parseEducation(lines) {
  const entries = [];
  let current = null;
  for (const line of lines) {
    const degreeMatch = line.match(/\b(Bachelor|Master|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D|MBA|Associate|Diploma)/i);
    if (degreeMatch) {
      if (current) entries.push(current);
      current = { school: "", degree: line.replace(/^[•\-\*]\s*/, "").trim(), gpa: "", startDate: "", endDate: "" };
      const gpaMatch = line.match(/GPA[:\s]*(\d\.\d+)/i);
      if (gpaMatch) current.gpa = gpaMatch[1];
    } else if (current && !current.school) {
      current.school = line.replace(/^[•\-\*]\s*/, "").trim();
    }
  }
  if (current) entries.push(current);
  return entries;
}
