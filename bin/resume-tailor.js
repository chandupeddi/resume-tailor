#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { resolve, dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { parseResume } from "../src/parser/index.js";
import { analyzeJD, analyzeJDFromURL } from "../src/analyzer/jd-analyzer.js";
import { tailorResume } from "../src/tailor/tailor-engine.js";
import { createAIProvider } from "../src/ai/adapter.js";
import { generateResume } from "../src/generator/docx-generator.js";
import { generateCoverLetter } from "../src/generator/cover-letter-generator.js";

const program = new Command();

program
  .name("resume-tailor")
  .description("Tailor your resume to any job description")
  .version("0.1.0")
  .requiredOption("-r, --resume <path>", "Path to your resume (.docx)")
  .option("-j, --jd <path>", "Path to job description text file")
  .option("--jd-url <url>", "URL of job posting (LinkedIn, Indeed, etc.)")
  .option("-o, --output <path>", "Output directory", "./output")
  .option("--ai <provider>", "AI provider: ollama, openai, or none", "none")
  .option("--model <model>", "AI model to use (default: mistral for ollama, gpt-4o-mini for openai)")
  .option("--api-key <key>", "API key for cloud AI providers")
  .option("--template <name>", "Resume template: modern, classic, or minimal", "modern")
  .option("--cover-letter", "Also generate a cover letter", false)
  .option("--verbose", "Show detailed output", false)
  .action(async (opts) => {
    try {
      await run(opts);
    } catch (err) {
      console.error(chalk.red(`\nError: ${err.message}`));
      if (opts.verbose) console.error(err.stack);
      process.exit(1);
    }
  });

async function run(opts) {
  const resumePath = resolve(opts.resume);
  const outputDir = resolve(opts.output);

  // Validate inputs
  if (!existsSync(resumePath)) {
    throw new Error(`Resume not found: ${resumePath}`);
  }
  if (!opts.jd && !opts.jdUrl) {
    throw new Error("Provide either --jd <file> or --jd-url <url>");
  }

  // Step 1: Parse resume
  let spinner = ora("Parsing resume...").start();
  const resumeData = await parseResume(resumePath);
  spinner.succeed(`Parsed resume: ${resumeData.name || "Unknown"}`);

  // Step 2: Analyze JD (from file or URL)
  let jdAnalysis;
  if (opts.jdUrl) {
    spinner = ora(`Fetching job posting from URL...`).start();
    jdAnalysis = await analyzeJDFromURL(opts.jdUrl);
    spinner.succeed(`Analyzed JD: ${jdAnalysis.jobTitle || "Unknown Role"} at ${jdAnalysis.company || "Unknown Company"}`);
  } else {
    const jdPath = resolve(opts.jd);
    if (!existsSync(jdPath)) {
      throw new Error(`Job description not found: ${jdPath}`);
    }
    spinner = ora("Analyzing job description...").start();
    jdAnalysis = await analyzeJD(jdPath);
    spinner.succeed(`Analyzed JD: ${jdAnalysis.jobTitle || "Unknown Role"} at ${jdAnalysis.company || "Unknown Company"}`);
  }

  // Step 3: Tailor (keyword matching)
  spinner = ora("Tailoring resume to job description...").start();
  let tailored = tailorResume(resumeData, jdAnalysis);
  spinner.succeed("Keyword-based tailoring complete");

  // Step 4: AI enhancement (optional)
  if (opts.ai && opts.ai !== "none") {
    spinner = ora(`Enhancing with AI (${opts.ai})...`).start();
    const ai = await createAIProvider(opts.ai, {
      model: opts.model,
      apiKey: opts.apiKey,
    });
    tailored = await ai.enhance(tailored, jdAnalysis);
    spinner.succeed("AI enhancement complete");
  }

  // Step 5: Generate output
  const companySlug = (jdAnalysis.company || "Company").replace(/[^a-zA-Z0-9]/g, "_");
  const roleSlug = (jdAnalysis.jobTitle || "Role").replace(/[^a-zA-Z0-9]/g, "_");
  const outFolder = resolve(outputDir, `${companySlug}_${roleSlug}`);
  mkdirSync(outFolder, { recursive: true });

  const outFile = resolve(outFolder, `Resume_${companySlug}_${roleSlug}.docx`);
  spinner = ora("Generating .docx...").start();
  await generateResume(tailored, jdAnalysis, outFile, { template: opts.template });
  spinner.succeed(`Resume saved: ${outFile}`);

  // Cover letter (optional)
  if (opts.coverLetter) {
    const coverFile = resolve(outFolder, `Cover_Letter_${companySlug}_${roleSlug}.docx`);
    spinner = ora("Generating cover letter...").start();
    await generateCoverLetter(tailored, jdAnalysis, coverFile);
    spinner.succeed(`Cover letter saved: ${coverFile}`);
  }

  // Summary
  console.log("");
  console.log(chalk.green("Done!"));
  console.log(chalk.dim(`  Resume:  ${outFile}`));
  if (opts.coverLetter) {
    const coverFile = resolve(outFolder, `Cover_Letter_${companySlug}_${roleSlug}.docx`);
    console.log(chalk.dim(`  Cover:   ${coverFile}`));
  }

  if (jdAnalysis.matchScore) {
    console.log(chalk.dim(`  Match:   ${jdAnalysis.matchScore}% keyword overlap`));
  }
}

program.parse();
