import { writeFileSync } from "fs";
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle, TabStopType, TabStopPosition,
} from "docx";
import {
  getTemplate, buildName, buildSubtitle, buildContactLine,
  buildSectionHeading, buildDivider, buildBodyText, buildSecondaryText,
} from "./templates.js";

/**
 * Generate a professional .docx resume from tailored data.
 * @param {object} resume - Tailored resume data
 * @param {object} jdAnalysis - JD analysis results
 * @param {string} outputPath - Output file path
 * @param {object} opts - { template: "modern"|"classic"|"minimal" }
 */
export async function generateResume(resume, jdAnalysis, outputPath, opts = {}) {
  const tmpl = getTemplate(opts.template || "modern");
  const sections = [];

  // Header
  sections.push(buildName(resume.name, tmpl));

  const subtitle = resume._targetTitle || jdAnalysis.jobTitle || "";
  if (subtitle) {
    sections.push(buildSubtitle(subtitle, tmpl));
  }

  const contactParts = [
    resume.contact.email, resume.contact.phone,
    resume.contact.linkedin, resume.contact.location,
    resume.contact.website,
  ].filter(Boolean);
  if (contactParts.length) {
    sections.push(buildContactLine(contactParts, tmpl));
  }

  sections.push(buildDivider(tmpl));

  // Summary
  if (resume.summary) {
    sections.push(buildSectionHeading("Professional Summary", tmpl));
    sections.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [buildBodyText(resume.summary, tmpl)],
      })
    );
    sections.push(buildDivider(tmpl));
  }

  // Experience
  if (resume.experience.length) {
    sections.push(buildSectionHeading("Professional Experience", tmpl));

    for (const exp of resume.experience) {
      // Title + Company + Dates
      sections.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({
              text: exp.title || "",
              bold: true,
              size: tmpl.bodySize + 2,
              font: tmpl.fonts.heading,
              color: tmpl.colors.dark,
            }),
            ...(exp.company ? [
              new TextRun({
                text: `  |  ${exp.company}`,
                size: tmpl.bodySize,
                font: tmpl.fonts.body,
                color: tmpl.colors.medium,
              }),
            ] : []),
            new TextRun({ text: "\t" }),
            new TextRun({
              text: [exp.startDate, exp.endDate].filter(Boolean).join(" – "),
              size: tmpl.bodySize - 2,
              font: tmpl.fonts.body,
              color: tmpl.colors.medium,
              italics: true,
            }),
          ],
        })
      );

      if (exp.location) {
        sections.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [buildSecondaryText(exp.location, tmpl)],
          })
        );
      }

      for (const bullet of exp.bullets) {
        sections.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [buildBodyText(bullet, tmpl)],
          })
        );
      }
    }
    sections.push(buildDivider(tmpl));
  }

  // Projects
  if (resume.projects.length) {
    sections.push(buildSectionHeading("Key Projects", tmpl));

    for (const proj of resume.projects) {
      const titleChildren = [
        new TextRun({
          text: proj.title,
          bold: true,
          size: tmpl.bodySize,
          font: tmpl.fonts.heading,
          color: tmpl.colors.dark,
        }),
      ];
      if (proj.tech) {
        titleChildren.push(
          new TextRun({
            text: `  [${proj.tech}]`,
            size: tmpl.bodySize - 2,
            font: tmpl.fonts.body,
            color: tmpl.colors.primary,
          })
        );
      }

      sections.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: titleChildren }));

      if (proj.description) {
        sections.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [buildBodyText(proj.description, tmpl)],
          })
        );
      }
    }
    sections.push(buildDivider(tmpl));
  }

  // Skills
  if (resume.skills.length) {
    sections.push(buildSectionHeading("Technical Skills", tmpl));

    for (const skill of resume.skills) {
      sections.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `${skill.category}: `,
              bold: true,
              size: tmpl.bodySize,
              font: tmpl.fonts.body,
              color: tmpl.colors.dark,
            }),
            new TextRun({
              text: skill.items.join(", "),
              size: tmpl.bodySize,
              font: tmpl.fonts.body,
              color: tmpl.colors.medium,
            }),
          ],
        })
      );
    }
    sections.push(buildDivider(tmpl));
  }

  // Education
  if (resume.education.length) {
    sections.push(buildSectionHeading("Education", tmpl));

    for (const edu of resume.education) {
      const children = [
        new TextRun({
          text: edu.degree,
          bold: true,
          size: tmpl.bodySize,
          font: tmpl.fonts.heading,
          color: tmpl.colors.dark,
        }),
      ];
      if (edu.gpa) {
        children.push(buildSecondaryText(`  |  GPA: ${edu.gpa}`, tmpl));
      }
      sections.push(new Paragraph({ spacing: { before: 80, after: 20 }, children }));

      if (edu.school) {
        sections.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [buildSecondaryText(edu.school, tmpl)],
          })
        );
      }
    }
    sections.push(buildDivider(tmpl));
  }

  // Certifications
  if (resume.certifications.length) {
    sections.push(buildSectionHeading("Certifications", tmpl));

    for (const cert of resume.certifications) {
      sections.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [buildBodyText(cert, tmpl)],
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 1008, right: 1008 },
        },
      },
      children: sections,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputPath, buffer);
}
