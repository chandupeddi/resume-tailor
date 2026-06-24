# resume-tailor

A CLI tool that tailors your resume to any job description. Reorders skills, rewrites bullet points, and generates a polished `.docx` — all from your terminal.

Supports **free local AI** via [Ollama](https://ollama.com), cloud AI via OpenAI, PDF/DOCX/JSON input, cover letters, and multiple templates.

## Install

```bash
npm install -g resume-tailor
```

Or clone and link locally:

```bash
git clone https://github.com/YOUR_USERNAME/resume-tailor.git
cd resume-tailor
npm install
npm link
```

**Requirements:** Node.js >= 18. Ollama (optional, for free local AI).

## Quick Start

```bash
# Basic — keyword matching only (no AI, instant)
resume-tailor -r my-resume.docx -j job-description.txt

# With free local AI (requires Ollama)
resume-tailor -r my-resume.docx -j job-description.txt --ai ollama

# From a job posting URL
resume-tailor -r my-resume.pdf --jd-url "https://careers.google.com/jobs/view/123"

# With cover letter + classic template
resume-tailor -r my-resume.docx -j jd.txt --cover-letter --template classic

# With OpenAI
resume-tailor -r my-resume.docx -j jd.txt --ai openai --api-key sk-...
```

Output: `./output/CompanyName_Role/Resume_CompanyName_Role.docx`

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│ Parse Resume │────>│  Analyze JD  │────>│ Tailor Engine │
│ .docx/.pdf/  │     │  (keywords)  │     │  (reorder &   │
│  .json       │     │              │     │   match)      │
└──────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │   AI Enhance   │
                                          │  (optional)    │
                                          └───────┬───────┘
                                                  │
                                   ┌──────────────┼──────────────┐
                                   ▼                             ▼
                           ┌───────────────┐           ┌─────────────────┐
                           │ Generate .docx │           │ Cover Letter    │
                           │ (3 templates)  │           │ (optional)      │
                           └───────────────┘           └─────────────────┘
```

### Without AI (default)
- Extracts keywords from the job description
- Reorders your skills so JD-relevant ones come first
- Reorders experience bullets by keyword relevance
- Reorders projects by relevance
- Calculates a match score

### With AI (`--ai ollama` or `--ai openai`)
Everything above, plus:
- Rewrites your professional summary to echo the JD's language
- Rewrites bullet points using the JD's terminology
- Rewrites project descriptions to highlight relevant aspects
- **Never invents experience or metrics** — only rephrases what you already have

## Supported Formats

| Input | Formats |
|-------|---------|
| Resume | `.docx`, `.pdf`, `.json` |
| Job Description | `.txt` file, or `--jd-url` for URLs |
| Output | `.docx` (3 templates) |

## Templates

| Template | Style |
|----------|-------|
| `modern` (default) | Clean blue accents, Arial, centered header |
| `classic` | Traditional black & white, Georgia serif, left-aligned |
| `minimal` | Ultra-clean, subtle grays, Helvetica |

```bash
resume-tailor -r resume.docx -j jd.txt --template classic
```

## JSON Resume Format

You can provide your resume as structured JSON:

```json
{
  "name": "Jane Smith",
  "contact": {
    "email": "jane@example.com",
    "phone": "555-0100",
    "linkedin": "linkedin.com/in/janesmith",
    "location": "San Francisco, CA"
  },
  "summary": "Data engineer with 5 years of experience...",
  "experience": [
    {
      "title": "Senior Data Engineer",
      "company": "Acme Corp",
      "startDate": "Jan 2022",
      "endDate": "Present",
      "bullets": [
        "Built real-time data pipelines processing 2M events/day",
        "Reduced query latency by 40% through index optimization"
      ]
    }
  ],
  "skills": [
    { "category": "Languages", "items": ["Python", "SQL", "Java"] },
    { "category": "Cloud", "items": ["AWS", "GCP", "Docker"] }
  ],
  "projects": [
    {
      "title": "ML Pipeline Orchestrator",
      "tech": "Python, Airflow, Docker",
      "description": "Built an automated ML training pipeline..."
    }
  ],
  "education": [
    { "degree": "M.S. Computer Science", "school": "Stanford University", "gpa": "3.9" }
  ],
  "certifications": ["AWS Solutions Architect"]
}
```

## Setting Up Ollama (Free Local AI)

1. Install: https://ollama.com/download
2. Start: `ollama serve`
3. First run auto-pulls Mistral 7B (~4GB one-time download)

Use a different model: `--ai ollama --model llama3.1`

## CLI Reference

```
Usage: resume-tailor [options]

Options:
  -V, --version          Output version number
  -r, --resume <path>    Path to your resume (.docx, .pdf, or .json)
  -j, --jd <path>        Path to job description text file
  --jd-url <url>         URL of job posting (LinkedIn, Indeed, etc.)
  -o, --output <path>    Output directory (default: ./output)
  --ai <provider>        AI provider: ollama, openai, or none (default: none)
  --model <model>        AI model (default: mistral / gpt-4o-mini)
  --api-key <key>        API key for cloud AI (or set OPENAI_API_KEY)
  --template <name>      Resume template: modern, classic, minimal (default: modern)
  --cover-letter         Also generate a cover letter
  --verbose              Show detailed output
  -h, --help             Display help
```

## Project Structure

```
resume-tailor/
├── bin/resume-tailor.js       # CLI entry point
├── src/
│   ├── parser/                # Resume parsing (.docx, .pdf, .json)
│   ├── analyzer/              # JD analysis + URL fetching
│   ├── tailor/                # Keyword matching & reordering
│   ├── ai/                    # AI providers (Ollama, OpenAI)
│   └── generator/             # .docx generation + templates
├── test/                      # Test suite (43 tests)
└── package.json
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ideas welcome:

- New resume templates
- Better PDF parsing
- More AI providers (Anthropic, Groq, local llama.cpp)
- LinkedIn/Indeed URL scraping improvements
- YAML resume format

## License

MIT — see [LICENSE](LICENSE).
