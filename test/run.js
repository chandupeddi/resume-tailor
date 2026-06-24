import { parseResume } from "../src/parser/index.js";
import { analyzeJDText } from "../src/analyzer/jd-analyzer.js";
import { tailorResume } from "../src/tailor/tailor-engine.js";
import { generateResume } from "../src/generator/docx-generator.js";
import { generateCoverLetter } from "../src/generator/cover-letter-generator.js";
import { getTemplate, listTemplates } from "../src/generator/templates.js";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
let errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.log(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

async function runTests() {
  console.log("\n\x1b[1mresume-tailor test suite\x1b[0m\n");

  // ─── Parser Tests ───
  console.log("\x1b[36m■ Parser\x1b[0m");

  // JSON parsing
  const resumePath = resolve(__dirname, "fixtures/sample-resume.json");
  const resume = await parseResume(resumePath);
  assert(resume.name === "Jane Smith", "JSON: parses name");
  assert(resume.contact.email === "jane.smith@email.com", "JSON: parses email");
  assert(resume.experience.length === 2, "JSON: parses 2 experience entries");
  assert(resume.experience[0].bullets.length === 5, "JSON: parses 5 bullets for first job");
  assert(resume.skills.length === 5, "JSON: parses 5 skill categories");
  assert(resume.projects.length === 2, "JSON: parses 2 projects");
  assert(resume.education.length === 1, "JSON: parses education");
  assert(resume.certifications.length === 2, "JSON: parses 2 certifications");

  // Unsupported format
  try {
    await parseResume("test.xyz");
    assert(false, "Rejects unsupported format");
  } catch (e) {
    assert(e.message.includes("Unsupported"), "Rejects unsupported format with clear error");
  }

  // ─── JD Analyzer Tests ───
  console.log("\n\x1b[36m■ JD Analyzer\x1b[0m");

  const jdText = readFileSync(resolve(__dirname, "fixtures/sample-jd.txt"), "utf-8");
  const jd = analyzeJDText(jdText);
  assert(jd.jobTitle === "Data Engineer", "Extracts job title");
  assert(jd.company === "Google", "Extracts company name");
  assert(jd.requiredSkills.length > 0, `Finds ${jd.requiredSkills.length} required skills`);
  assert(jd.preferredSkills.length > 0, `Finds ${jd.preferredSkills.length} preferred skills`);
  assert(jd.requiredSkills.some(s => s.toLowerCase() === "python"), "Finds Python as required");
  assert(jd.requiredSkills.some(s => s.toLowerCase() === "sql"), "Finds SQL as required");
  assert(jd.experienceLevel === "mid", "Identifies mid-level (3+ years)");
  assert(jd.keywords.length > 0, `Extracts ${jd.keywords.length} keywords`);
  assert(jd.responsibilities.length > 0, `Extracts ${jd.responsibilities.length} responsibilities`);

  // Edge case: minimal JD
  const minimalJD = analyzeJDText("Software Engineer\nAcme Corp\nWe need someone who knows Python.");
  assert(minimalJD.jobTitle === "Software Engineer", "Minimal JD: extracts title");
  assert(minimalJD.requiredSkills.some(s => s.toLowerCase() === "python"), "Minimal JD: finds Python");

  // ─── Tailor Engine Tests ───
  console.log("\n\x1b[36m■ Tailor Engine\x1b[0m");

  const tailored = tailorResume(resume, jd);
  assert(tailored._matchScore > 0, `Match score: ${tailored._matchScore}%`);
  assert(tailored._matchScore <= 100, "Match score is <= 100");
  assert(tailored._matchedSkills.length > 0, `Matched ${tailored._matchedSkills.length} skills`);
  assert(Array.isArray(tailored._missingSkills), "Reports missing skills");
  assert(tailored.skills.length === resume.skills.length, "Preserves all skill categories");
  assert(tailored.experience.length === resume.experience.length, "Preserves all experience");
  assert(tailored.projects.length === resume.projects.length, "Preserves all projects");

  // Verify reordering happened (skills with more matches should be first)
  const firstCatMatches = tailored.skills[0]._matchCount || 0;
  const lastCatMatches = tailored.skills[tailored.skills.length - 1]._matchCount || 0;
  assert(firstCatMatches >= lastCatMatches, "Skills reordered: most relevant category first");

  // ─── Template Tests ───
  console.log("\n\x1b[36m■ Templates\x1b[0m");

  const templates = listTemplates();
  assert(templates.length === 3, "Has 3 templates (modern, classic, minimal)");
  assert(templates.some(t => t.key === "modern"), "Has modern template");
  assert(templates.some(t => t.key === "classic"), "Has classic template");
  assert(templates.some(t => t.key === "minimal"), "Has minimal template");

  const modern = getTemplate("modern");
  assert(modern.colors.primary === "2563EB", "Modern template has blue primary");

  const classic = getTemplate("classic");
  assert(classic.fonts.heading === "Georgia", "Classic template uses Georgia");

  try {
    getTemplate("nonexistent");
    assert(false, "Rejects unknown template");
  } catch (e) {
    assert(e.message.includes("Unknown template"), "Rejects unknown template with clear error");
  }

  // ─── Docx Generator Tests ───
  console.log("\n\x1b[36m■ Docx Generator\x1b[0m");

  const outDir = resolve(__dirname, "../test-output");
  mkdirSync(outDir, { recursive: true });

  // Test each template
  for (const tmpl of ["modern", "classic", "minimal"]) {
    const outFile = resolve(outDir, `test-resume-${tmpl}.docx`);
    await generateResume(tailored, jd, outFile, { template: tmpl });
    assert(existsSync(outFile), `${tmpl}: generates .docx`);
    const size = readFileSync(outFile).length;
    assert(size > 1000, `${tmpl}: file has content (${size} bytes)`);
  }

  // ─── Cover Letter Tests ───
  console.log("\n\x1b[36m■ Cover Letter Generator\x1b[0m");

  const coverFile = resolve(outDir, "test-cover-letter.docx");
  await generateCoverLetter(tailored, jd, coverFile);
  assert(existsSync(coverFile), "Generates cover letter .docx");
  const coverSize = readFileSync(coverFile).length;
  assert(coverSize > 500, `Cover letter has content (${coverSize} bytes)`);

  // ─── Summary ───
  console.log(`\n\x1b[1m${passed} passed, ${failed} failed\x1b[0m`);
  if (errors.length) {
    console.log("\nFailed tests:");
    errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("\nTest error:", err);
  process.exit(1);
});
