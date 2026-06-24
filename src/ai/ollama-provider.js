import { execSync } from "child_process";

const DEFAULT_MODEL = "mistral";
const OLLAMA_URL = "http://localhost:11434";

export class OllamaProvider {
  constructor(model) {
    this.model = model;
  }

  /**
   * Create and validate an Ollama provider.
   * Auto-detects Ollama, prompts to pull model if missing.
   */
  static async create(opts = {}) {
    const model = opts.model || DEFAULT_MODEL;

    // Check if Ollama is running
    const running = await isOllamaRunning();
    if (!running) {
      throw new Error(
        "Ollama is not running.\n\n" +
        "To use local AI, install and start Ollama:\n" +
        "  1. Install: https://ollama.com/download\n" +
        "  2. Start:   ollama serve\n" +
        "  3. Pull model: ollama pull " + model + "\n\n" +
        "Then re-run with: resume-tailor --ai ollama"
      );
    }

    // Check if model is available
    const hasModel = await isModelAvailable(model);
    if (!hasModel) {
      console.log(`\nModel "${model}" not found locally. Pulling now...`);
      console.log(`This is a one-time download (~4GB for mistral).\n`);
      try {
        execSync(`ollama pull ${model}`, { stdio: "inherit" });
      } catch {
        throw new Error(
          `Failed to pull model "${model}".\n` +
          `Try manually: ollama pull ${model}`
        );
      }
    }

    return new OllamaProvider(model);
  }

  /**
   * Enhance a tailored resume using local AI.
   * Rewrites summary and bullets to better match the JD.
   */
  async enhance(tailored, jdAnalysis) {
    const enhanced = structuredClone(tailored);

    // Rewrite summary
    if (enhanced.summary) {
      enhanced.summary = await this._rewrite(
        "professional resume summary",
        enhanced.summary,
        jdAnalysis
      );
    }

    // Rewrite experience bullets
    for (const exp of enhanced.experience) {
      const rewrittenBullets = [];
      for (const bullet of exp.bullets) {
        const rewritten = await this._rewrite(
          "resume bullet point",
          bullet,
          jdAnalysis
        );
        rewrittenBullets.push(rewritten);
      }
      exp.bullets = rewrittenBullets;
    }

    // Rewrite project descriptions
    for (const proj of enhanced.projects) {
      if (proj.description) {
        proj.description = await this._rewrite(
          "project description for a resume",
          proj.description,
          jdAnalysis
        );
      }
    }

    return enhanced;
  }

  async _rewrite(type, original, jdAnalysis) {
    const prompt = buildPrompt(type, original, jdAnalysis);
    const response = await ollamaGenerate(this.model, prompt);
    // Clean up: remove quotes, extra whitespace, "Here's" preambles
    return cleanAIResponse(response, original);
  }
}

function buildPrompt(type, original, jdAnalysis) {
  const skills = [...jdAnalysis.requiredSkills, ...jdAnalysis.preferredSkills].join(", ");
  const title = jdAnalysis.jobTitle || "the target role";

  return `You are a resume writing expert. Rewrite the following ${type} to better match a job posting for "${title}".

Target job keywords: ${skills}

Original text:
"${original}"

Rules:
- Keep the same meaning and facts. Do NOT invent new achievements or metrics.
- Use terminology from the job posting where it naturally fits.
- Keep it concise (same length or shorter).
- Use strong action verbs.
- Do NOT add any preamble like "Here's" or "Sure". Just output the rewritten text directly.
- Output ONLY the rewritten text, nothing else.

Rewritten:`;
}

async function ollamaGenerate(model, prompt) {
  const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 300 },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Ollama API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.response || "";
}

async function isOllamaRunning() {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

async function isModelAvailable(model) {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await resp.json();
    return data.models?.some((m) => m.name === model || m.name.startsWith(model + ":"));
  } catch {
    return false;
  }
}

function cleanAIResponse(response, original) {
  let text = response.trim();
  // Remove surrounding quotes
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }
  // Remove preambles
  text = text.replace(/^(here'?s?|sure|certainly|of course)[^:]*:\s*/i, "");
  // If AI returned garbage or empty, fall back to original
  if (text.length < 10 || text.length > original.length * 3) {
    return original;
  }
  return text;
}
