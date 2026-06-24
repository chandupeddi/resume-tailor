const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider {
  constructor(model, apiKey) {
    this.model = model;
    this.apiKey = apiKey;
  }

  static async create(opts = {}) {
    const model = opts.model || DEFAULT_MODEL;
    const apiKey = opts.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAI API key required.\n\n" +
        "Provide it via:\n" +
        "  --api-key sk-...\n" +
        "  or set OPENAI_API_KEY environment variable\n\n" +
        "For free local AI, use: --ai ollama"
      );
    }

    return new OpenAIProvider(model, apiKey);
  }

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
        const rewritten = await this._rewrite("resume bullet point", bullet, jdAnalysis);
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
    const skills = [...jdAnalysis.requiredSkills, ...jdAnalysis.preferredSkills].join(", ");
    const title = jdAnalysis.jobTitle || "the target role";

    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "You are a resume writing expert. Rewrite text to better match job descriptions. " +
              "Keep the same facts — never invent achievements or metrics. " +
              "Use job posting terminology where it naturally fits. " +
              "Output ONLY the rewritten text, no preamble.",
          },
          {
            role: "user",
            content:
              `Rewrite this ${type} for a "${title}" role.\n` +
              `Target keywords: ${skills}\n\n` +
              `Original: "${original}"\n\nRewritten:`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenAI API error: ${resp.status} — ${err}`);
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim() || original;

    // Clean up
    let cleaned = text;
    if ((cleaned.startsWith('"') && cleaned.endsWith('"'))) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned.length < 10 ? original : cleaned;
  }
}
