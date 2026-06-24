# Contributing to resume-tailor

Thanks for your interest in contributing!

## Getting Started

1. Fork and clone the repo
2. `npm install`
3. `npm link` to test the CLI locally

## Development

```bash
# Run locally
node bin/resume-tailor.js --resume test/fixtures/sample.json --jd test/fixtures/sample-jd.txt

# Run tests
npm test
```

## What to Contribute

- **Resume parsers** — add support for new formats (.pdf, .yaml, LinkedIn export)
- **AI providers** — add support for new backends (Anthropic, Groq, local llama.cpp)
- **Templates** — new .docx resume templates/styles
- **JD analyzers** — better keyword extraction, NLP improvements
- **Bug fixes** — especially around parsing edge cases

## Guidelines

- Keep PRs focused on one thing
- Add tests for new features
- Don't break existing CLI flags
- Update README if you change the CLI interface

## Code Style

- ES modules (`import`/`export`)
- No TypeScript (keep the barrier to entry low)
- Descriptive function names over comments
- Handle errors with clear user-facing messages

## Reporting Issues

Use GitHub Issues. Include:
- What you tried
- What happened
- What you expected
- Your resume format (if relevant — don't share actual resume content)
