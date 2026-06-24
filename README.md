# resume-tailor

A CLI tool that tailors your resume to any job description. Reorders skills, rewrites bullet points, and generates a polished `.docx` — all from your terminal.

Supports **free local AI** via [Ollama](https://ollama.com), cloud AI via OpenAI, PDF/DOCX/JSON input, cover letters, and multiple templates.

---

## Installation

### 1. Install Node.js (if you don't have it)

Check if you have it:
```bash
node --version
```

If not installed, download from [nodejs.org](https://nodejs.org/) (v18 or higher).

### 2. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/resume-tailor.git
cd resume-tailor
```

### 3. Install dependencies

```bash
npm install
```

### 4. Link it globally

```bash
sudo npm link
```

> **Why `sudo`?** On macOS, npm needs permission to write to `/usr/local/lib/node_modules`. You'll be prompted for your Mac password.

> **If you don't want to use `sudo`**, skip `npm link` and run the tool directly:
> ```bash
> node ~/path/to/resume-tailor/bin/resume-tailor.js -r resume.docx -j jd.txt
> ```
> Or create an alias:
> ```bash
> echo 'alias resume-tailor="node ~/path/to/resume-tailor/bin/resume-tailor.js"' >> ~/.zshrc
> source ~/.zshrc
> ```

### 5. Verify it works

```bash
resume-tailor --help
```

You should see the list of available options.

---

## Quick Start

### Step 1: Prepare your files

You need two things:

1. **Your resume** — a `.docx`, `.pdf`, or `.json` file
2. **A job description** — save it as a `.txt` file

**How to create a JD text file:**
1. Copy the job description from the posting
2. Open Terminal and run:
   ```bash
   pbpaste > ~/Downloads/jd.txt
   ```
   This saves your clipboard as `jd.txt` in Downloads.

### Step 2: Run it

```bash
# Basic (no AI — instant keyword matching)
resume-tailor -r ~/Downloads/my-resume.docx -j ~/Downloads/jd.txt

# With cover letter
resume-tailor -r ~/Downloads/my-resume.docx -j ~/Downloads/jd.txt --cover-letter

# With a different template
resume-tailor -r ~/Downloads/my-resume.docx -j ~/Downloads/jd.txt --template classic

# With free local AI (see Ollama setup below)
resume-tailor -r ~/Downloads/my-resume.docx -j ~/Downloads/jd.txt --ai ollama --cover-letter

# From a job posting URL (instead of a .txt file)
resume-tailor -r ~/Downloads/my-resume.docx --jd-url "https://linkedin.com/jobs/view/12345"
```

> **Important:** Replace `~/Downloads/my-resume.docx` and `~/Downloads/jd.txt` with the actual paths to YOUR files. These are just examples.

### Step 3: Find your output

Output goes to `./output/CompanyName_Role/` in your current directory:
```
output/
└── Google_Data_Engineer/
    ├── Resume_Google_Data_Engineer.docx
    └── Cover_Letter_Google_Data_Engineer.docx    # if --cover-letter was used
```

Open the `.docx` files in Word, Google Docs, or Preview.

---

## Setting Up Ollama (Free Local AI)

Ollama runs an AI model on your laptop for free. No API keys, no cost, fully private.

### 1. Install Ollama

**macOS (Homebrew):**
```bash
brew install ollama
```

Or download from [ollama.com/download](https://ollama.com/download).

### 2. Start the Ollama server

Open a terminal and run:
```bash
ollama serve
```

> **This command keeps running** — it's a background server. Leave this terminal tab open.

### 3. Pull the AI model (one-time, ~4GB download)

Open a **new terminal tab** (`Cmd + T` on macOS) and run:
```bash
ollama pull mistral
```

> **You need two terminal tabs:** one running `ollama serve`, another for pulling models and running commands. The `ollama pull` command will fail if `ollama serve` isn't running in another tab.

### 4. Run with AI

```bash
resume-tailor -r ~/Downloads/my-resume.docx -j ~/Downloads/jd.txt --ai ollama
```

On first run, AI enhancement takes 30-60 seconds depending on your machine. Subsequent runs are faster.

**Use a different model:**
```bash
ollama pull llama3.1
resume-tailor -r resume.docx -j jd.txt --ai ollama --model llama3.1
```

---

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

---

## Supported Formats

| Input | Formats |
|-------|---------|
| Resume | `.docx`, `.pdf`, `.json` |
| Job Description | `.txt` file, or `--jd-url` for URLs |
| Output | `.docx` (3 templates) |

### Resume format notes

- **`.docx`** — Works with most resume formats, including resumes with spaced-out headings (e.g., "P R O F E S S I O N A L  S U M M A R Y")
- **`.pdf`** — Best effort parsing. Complex layouts with columns or tables may not parse perfectly. If results are off, try saving your resume as `.docx` instead.
- **`.json`** — Most reliable. See the JSON format below.

### JSON Resume Format

For the most accurate parsing, provide your resume as structured JSON:

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
      "location": "San Francisco, CA",
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
    {
      "degree": "M.S. Computer Science",
      "school": "Stanford University",
      "gpa": "3.9"
    }
  ],
  "certifications": ["AWS Solutions Architect"]
}
```

---

## Templates

| Template | Style |
|----------|-------|
| `modern` (default) | Clean blue accents, Arial, centered header |
| `classic` | Traditional black & white, Georgia serif, left-aligned |
| `minimal` | Ultra-clean, subtle grays, Helvetica |

```bash
resume-tailor -r resume.docx -j jd.txt --template classic
```

---

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
  --api-key <key>        API key for cloud AI (or set OPENAI_API_KEY env var)
  --template <name>      Resume template: modern, classic, minimal (default: modern)
  --cover-letter         Also generate a cover letter
  --verbose              Show detailed output
  -h, --help             Display help
```

---

## Troubleshooting

### `npm link` gives "EACCES: permission denied"

Use `sudo`:
```bash
sudo npm link
```
Or skip linking and run directly:
```bash
node bin/resume-tailor.js -r resume.docx -j jd.txt
```

### `ollama pull` gives "could not connect to ollama server"

You need `ollama serve` running in a **separate terminal tab**. Open a new tab (`Cmd + T`), run `ollama serve` there, then go back to your original tab and run `ollama pull mistral`.

### "Resume not found" error

You used a placeholder path like `/path/to/your-resume.docx`. Replace it with the actual path to your file:
```bash
# Example with a file in Downloads
resume-tailor -r ~/Downloads/my-resume.docx -j ~/Downloads/jd.txt
```

### Resume output is blank or missing sections

Your `.docx` may have unusual formatting. Two options:

1. **Save as JSON** — Create a `.json` file using the format above. This gives the most reliable results.
2. **Check what the parser sees** — Run this to debug:
   ```bash
   cd ~/path/to/resume-tailor
   node -e "
   import mammoth from 'mammoth';
   import { readFileSync } from 'fs';
   const buffer = readFileSync('$HOME/Downloads/my-resume.docx');
   const result = await mammoth.extractRawText({ buffer });
   console.log(result.value.substring(0, 2000));
   "
   ```
   This shows the raw text the parser works with. If sections aren't detected, [open an issue](https://github.com/YOUR_USERNAME/resume-tailor/issues) with a sample of the output (redact personal info).

### Using OpenAI instead of Ollama

```bash
resume-tailor -r resume.docx -j jd.txt --ai openai --api-key sk-your-key-here
```
Or set the environment variable:
```bash
export OPENAI_API_KEY=sk-your-key-here
resume-tailor -r resume.docx -j jd.txt --ai openai
```

---

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

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ideas welcome:

- New resume templates
- Better PDF parsing for complex layouts
- More AI providers (Anthropic, Groq, local llama.cpp)
- LinkedIn/Indeed URL scraping improvements
- YAML resume format support
- Batch mode (multiple JDs at once)

---

## License

MIT — see [LICENSE](LICENSE).
