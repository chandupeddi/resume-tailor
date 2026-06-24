/**
 * Tailor engine: keyword-based resume optimization.
 * Reorders sections and highlights relevant content without AI.
 */

/**
 * Tailor a parsed resume based on JD analysis.
 * Returns a new resume object with reordered/scored sections.
 */
export function tailorResume(resume, jdAnalysis) {
  const tailored = structuredClone(resume);
  const allJDSkills = [
    ...jdAnalysis.requiredSkills,
    ...jdAnalysis.preferredSkills,
  ].map((s) => s.toLowerCase());
  const jdKeywords = jdAnalysis.keywords.map((k) => k.toLowerCase());

  // 1. Reorder skills — categories with most JD matches come first
  tailored.skills = reorderSkills(tailored.skills, allJDSkills);

  // 2. Reorder experience bullets — JD-relevant bullets first
  tailored.experience = tailored.experience.map((exp) => ({
    ...exp,
    bullets: reorderByRelevance(exp.bullets, jdKeywords),
  }));

  // 3. Reorder projects — most relevant first
  tailored.projects = reorderProjects(tailored.projects, jdKeywords);

  // 4. Calculate match score
  tailored._matchScore = calculateMatchScore(resume, jdAnalysis);
  tailored._matchedSkills = findMatchedSkills(resume, allJDSkills);
  tailored._missingSkills = findMissingSkills(resume, allJDSkills);

  // Store JD title for output
  tailored._targetTitle = jdAnalysis.jobTitle;

  return tailored;
}

/**
 * Reorder skill categories so the most JD-relevant categories appear first.
 * Within each category, reorder items so JD-matching skills lead.
 */
function reorderSkills(skills, jdSkills) {
  return skills
    .map((category) => {
      // Reorder items within category
      const sorted = [...category.items].sort((a, b) => {
        const aMatch = jdSkills.some((s) => a.toLowerCase().includes(s) || s.includes(a.toLowerCase()));
        const bMatch = jdSkills.some((s) => b.toLowerCase().includes(s) || s.includes(b.toLowerCase()));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      const matchCount = sorted.filter((item) =>
        jdSkills.some((s) => item.toLowerCase().includes(s) || s.includes(item.toLowerCase()))
      ).length;

      return { ...category, items: sorted, _matchCount: matchCount };
    })
    .sort((a, b) => b._matchCount - a._matchCount);
}

/**
 * Reorder bullets by relevance to JD keywords.
 */
function reorderByRelevance(bullets, keywords) {
  return [...bullets].sort((a, b) => {
    const aScore = scoreText(a, keywords);
    const bScore = scoreText(b, keywords);
    return bScore - aScore;
  });
}

/**
 * Reorder projects by relevance to JD.
 */
function reorderProjects(projects, keywords) {
  return [...projects].sort((a, b) => {
    const aText = `${a.title} ${a.tech} ${a.description}`;
    const bText = `${b.title} ${b.tech} ${b.description}`;
    return scoreText(bText, keywords) - scoreText(aText, keywords);
  });
}

/**
 * Score a text block by how many JD keywords it contains.
 */
function scoreText(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score++;
  }
  return score;
}

/**
 * Calculate overall match percentage.
 */
function calculateMatchScore(resume, jdAnalysis) {
  const allJDSkills = [
    ...jdAnalysis.requiredSkills,
    ...jdAnalysis.preferredSkills,
  ];
  if (allJDSkills.length === 0) return 0;

  const resumeText = flattenResume(resume).toLowerCase();
  const matched = allJDSkills.filter((skill) =>
    resumeText.includes(skill.toLowerCase())
  );

  return Math.round((matched.length / allJDSkills.length) * 100);
}

function findMatchedSkills(resume, jdSkills) {
  const resumeText = flattenResume(resume).toLowerCase();
  return jdSkills.filter((s) => resumeText.includes(s.toLowerCase()));
}

function findMissingSkills(resume, jdSkills) {
  const resumeText = flattenResume(resume).toLowerCase();
  return jdSkills.filter((s) => !resumeText.includes(s.toLowerCase()));
}

function flattenResume(resume) {
  const parts = [
    resume.summary,
    ...resume.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...resume.projects.map((p) => `${p.title} ${p.tech} ${p.description}`),
    ...resume.skills.flatMap((s) => [s.category, ...s.items]),
    ...resume.certifications,
  ];
  return parts.join(" ");
}
