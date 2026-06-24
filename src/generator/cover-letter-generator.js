import { writeFileSync } from "fs";
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
} from "docx";

const PRIMARY = "2563EB";
const DARK = "1F2937";
const MEDIUM = "4B5563";

/**
 * Generate a cover letter .docx from resume data and JD analysis.
 */
export async function generateCoverLetter(resume, jdAnalysis, outputPath, opts = {}) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const company = jdAnalysis.company || "the company";
  const role = jdAnalysis.jobTitle || "the position";
  const name = resume.name || "Applicant";

  // Build cover letter paragraphs
  const paragraphs = opts.paragraphs || buildDefaultParagraphs(resume, jdAnalysis);
  const greeting = opts.greeting || "Dear Hiring Manager,";

  const sections = [];

  // Header — Name
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: name.toUpperCase(),
          bold: true,
          size: 32,
          font: "Arial",
          color: DARK,
        }),
      ],
    })
  );

  // Contact line
  const contactParts = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.contact.location,
  ].filter(Boolean);

  if (contactParts.length) {
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: 18,
            font: "Arial",
            color: MEDIUM,
          }),
        ],
      })
    );
  }

  // Divider
  sections.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: { color: "D1D5DB", space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      children: [],
    })
  );

  // Date
  sections.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: today, size: 20, font: "Arial", color: DARK }),
      ],
    })
  );

  // Greeting
  sections.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: greeting, size: 22, font: "Arial", color: DARK, bold: true }),
      ],
    })
  );

  // Body paragraphs
  for (const para of paragraphs) {
    sections.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: para, size: 21, font: "Arial", color: DARK }),
        ],
      })
    );
  }

  // Closing
  sections.push(
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: "Sincerely,", size: 21, font: "Arial", color: DARK }),
      ],
    })
  );

  sections.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: name, size: 21, font: "Arial", color: DARK, bold: true }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1008, bottom: 1008, left: 1200, right: 1200 },
          },
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputPath, buffer);
}

/**
 * Build default cover letter paragraphs from resume data + JD analysis.
 * This is the non-AI version — structured but generic.
 */
function buildDefaultParagraphs(resume, jdAnalysis) {
  const company = jdAnalysis.company || "your organization";
  const role = jdAnalysis.jobTitle || "this position";
  const name = resume.name?.split(" ")[0] || "I";

  // Find top matching skills
  const resumeText = [
    resume.summary,
    ...resume.experience.flatMap((e) => e.bullets),
    ...resume.skills.flatMap((s) => s.items),
  ].join(" ").toLowerCase();

  const matchedSkills = jdAnalysis.requiredSkills
    .filter((s) => resumeText.includes(s.toLowerCase()))
    .slice(0, 5);

  // Find the most recent/relevant experience
  const topExp = resume.experience[0];
  const topProject = resume.projects[0];

  // Opening
  const opening = `I am writing to express my interest in the ${role} position at ${company}. ` +
    (resume.summary
      ? `With a background in ${extractFocus(resume.summary)}, I am excited about the opportunity to contribute to your team.`
      : `I believe my experience and skills make me a strong candidate for this role.`);

  // Middle — experience + skills
  let middle = "";
  if (topExp) {
    middle = `In my role as ${topExp.title} at ${topExp.company}, ` +
      `${topExp.bullets[0] ? topExp.bullets[0].charAt(0).toLowerCase() + topExp.bullets[0].slice(1) : "I gained significant experience relevant to this position"}. `;
  }
  if (matchedSkills.length > 0) {
    middle += `My expertise in ${matchedSkills.slice(0, 3).join(", ")}${matchedSkills.length > 3 ? `, among other skills` : ""} aligns well with the requirements of this role.`;
  }

  // Project mention
  let projectPara = "";
  if (topProject) {
    projectPara = `Additionally, my ${topProject.title} project${topProject.tech ? ` (built with ${topProject.tech})` : ""} ` +
      `demonstrates my ability to deliver impactful results. ${topProject.description ? topProject.description.split(".")[0] + "." : ""}`;
  }

  // Closing
  const closing = `I am enthusiastic about the opportunity to bring my skills and experience to ${company} ` +
    `and would welcome the chance to discuss how I can contribute to your team. ` +
    `Thank you for considering my application. I look forward to hearing from you.`;

  const paragraphs = [opening, middle];
  if (projectPara) paragraphs.push(projectPara);
  paragraphs.push(closing);

  return paragraphs.filter(Boolean);
}

function extractFocus(summary) {
  // Extract the main focus from a summary (first noun phrase after common patterns)
  const match = summary.match(/(?:experience in|background in|specializing in|focused on|expertise in)\s+([^,.]+)/i);
  if (match) return match[1].trim();
  // Fallback: first ~50 chars
  return summary.substring(0, 60).replace(/\s+\S*$/, "").toLowerCase();
}
