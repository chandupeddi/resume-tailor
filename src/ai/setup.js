import { execSync } from "child_process";
import readline from "readline";

/**
 * Interactive Ollama setup — checks installation, pulls model.
 */
export async function setupOllama(model = "mistral") {
  // Check if ollama command exists
  try {
    execSync("which ollama", { stdio: "pipe" });
  } catch {
    console.log("\nOllama is not installed.");
    console.log("Install it from: https://ollama.com/download\n");
    console.log("After installing, run: ollama serve");
    console.log("Then re-run this command.\n");
    return false;
  }

  // Check if server is running
  try {
    const resp = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) throw new Error();
  } catch {
    console.log("\nOllama is installed but not running.");
    console.log("Start it with: ollama serve\n");
    return false;
  }

  // Check if model is pulled
  try {
    const resp = await fetch("http://localhost:11434/api/tags");
    const data = await resp.json();
    const found = data.models?.some(
      (m) => m.name === model || m.name.startsWith(model + ":")
    );

    if (!found) {
      const answer = await ask(
        `Model "${model}" not found. Download it now? (~4GB) [Y/n] `
      );
      if (answer.toLowerCase() === "n") {
        console.log("Skipped. You can pull it later: ollama pull " + model);
        return false;
      }
      console.log(`Pulling ${model}...`);
      execSync(`ollama pull ${model}`, { stdio: "inherit" });
    }
  } catch (err) {
    console.error("Error checking models:", err.message);
    return false;
  }

  console.log(`\nOllama is ready with model "${model}".`);
  return true;
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer || "y");
    });
  });
}
