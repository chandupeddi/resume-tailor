import { readFileSync } from "fs";

/**
 * Parse a structured JSON resume.
 * Expects the same format as our internal schema.
 */
export async function parseJSON(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));

  // Normalize to our internal format
  return {
    name: raw.name || "",
    contact: {
      email: raw.contact?.email || raw.email || "",
      phone: raw.contact?.phone || raw.phone || "",
      linkedin: raw.contact?.linkedin || raw.linkedin || "",
      location: raw.contact?.location || raw.location || "",
      website: raw.contact?.website || raw.website || "",
    },
    summary: raw.summary || raw.profile || raw.objective || "",
    experience: (raw.experience || raw.work || []).map((e) => ({
      company: e.company || e.organization || "",
      title: e.title || e.position || e.role || "",
      location: e.location || "",
      startDate: e.startDate || e.start || "",
      endDate: e.endDate || e.end || "",
      bullets: e.bullets || e.highlights || e.description?.split("\n") || [],
    })),
    projects: (raw.projects || []).map((p) => ({
      title: p.title || p.name || "",
      tech: Array.isArray(p.tech) ? p.tech.join(", ") : p.tech || "",
      description: p.description || "",
    })),
    skills: (raw.skills || []).map((s) => ({
      category: s.category || s.name || "",
      items: Array.isArray(s.items) ? s.items : (s.items || "").split(",").map((i) => i.trim()),
    })),
    education: (raw.education || []).map((e) => ({
      school: e.school || e.institution || "",
      degree: e.degree || "",
      gpa: e.gpa || "",
      startDate: e.startDate || "",
      endDate: e.endDate || "",
    })),
    certifications: raw.certifications || [],
  };
}
