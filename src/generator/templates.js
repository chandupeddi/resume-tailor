import {
  Paragraph, TextRun, AlignmentType, BorderStyle,
  TabStopType, TabStopPosition,
} from "docx";

/**
 * Template registry.
 * Each template defines colors, fonts, and section builders.
 */
const TEMPLATES = {
  modern: {
    name: "Modern",
    description: "Clean blue accents, professional look",
    colors: { primary: "2563EB", dark: "1F2937", medium: "4B5563", divider: "D1D5DB" },
    fonts: { heading: "Arial", body: "Arial" },
    headingSize: 36,
    bodySize: 20,
    sectionHeadingSize: 22,
    nameAlign: AlignmentType.CENTER,
    sectionStyle: "underline", // underline, border, or caps-only
  },
  classic: {
    name: "Classic",
    description: "Traditional black & white, serif fonts, left-aligned",
    colors: { primary: "000000", dark: "000000", medium: "333333", divider: "000000" },
    fonts: { heading: "Georgia", body: "Georgia" },
    headingSize: 34,
    bodySize: 21,
    sectionHeadingSize: 24,
    nameAlign: AlignmentType.LEFT,
    sectionStyle: "border",
  },
  minimal: {
    name: "Minimal",
    description: "Ultra-clean, subtle gray tones, modern sans-serif",
    colors: { primary: "6B7280", dark: "111827", medium: "6B7280", divider: "E5E7EB" },
    fonts: { heading: "Helvetica", body: "Helvetica" },
    headingSize: 32,
    bodySize: 19,
    sectionHeadingSize: 20,
    nameAlign: AlignmentType.LEFT,
    sectionStyle: "caps-only",
  },
};

export function getTemplate(name) {
  const template = TEMPLATES[name.toLowerCase()];
  if (!template) {
    const available = Object.keys(TEMPLATES).join(", ");
    throw new Error(`Unknown template: "${name}"\nAvailable templates: ${available}`);
  }
  return template;
}

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([key, t]) => ({
    key,
    name: t.name,
    description: t.description,
  }));
}

/**
 * Build common document elements using a template's style.
 */
export function buildName(text, template) {
  return new Paragraph({
    alignment: template.nameAlign,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: template.headingSize,
        font: template.fonts.heading,
        color: template.colors.dark,
      }),
    ],
  });
}

export function buildSubtitle(text, template) {
  return new Paragraph({
    alignment: template.nameAlign,
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        size: Math.round(template.sectionHeadingSize * 0.9),
        font: template.fonts.heading,
        color: template.colors.primary,
        bold: true,
      }),
    ],
  });
}

export function buildContactLine(parts, template) {
  return new Paragraph({
    alignment: template.nameAlign,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: parts.join("  |  "),
        size: 18,
        font: template.fonts.body,
        color: template.colors.medium,
      }),
    ],
  });
}

export function buildSectionHeading(text, template) {
  const para = {
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: template.sectionHeadingSize,
        font: template.fonts.heading,
        color: template.colors.primary,
        allCaps: true,
      }),
    ],
  };

  if (template.sectionStyle === "border") {
    para.border = {
      bottom: {
        color: template.colors.primary,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 8,
      },
    };
  }

  return new Paragraph(para);
}

export function buildDivider(template) {
  if (template.sectionStyle === "caps-only") {
    // Minimal template: just spacing, no line
    return new Paragraph({ spacing: { before: 80, after: 80 }, children: [] });
  }
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    border: {
      bottom: {
        color: template.colors.divider,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [],
  });
}

export function buildBodyText(text, template) {
  return new TextRun({
    text,
    size: template.bodySize,
    font: template.fonts.body,
    color: template.colors.dark,
  });
}

export function buildSecondaryText(text, template) {
  return new TextRun({
    text,
    size: template.bodySize - 2,
    font: template.fonts.body,
    color: template.colors.medium,
  });
}

export { TEMPLATES };
