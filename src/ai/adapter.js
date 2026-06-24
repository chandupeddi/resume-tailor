import { OllamaProvider } from "./ollama-provider.js";
import { OpenAIProvider } from "./openai-provider.js";

/**
 * Create an AI provider instance.
 * @param {string} provider - "ollama" or "openai"
 * @param {object} opts - { model, apiKey }
 */
export async function createAIProvider(provider, opts = {}) {
  switch (provider.toLowerCase()) {
    case "ollama":
      return OllamaProvider.create(opts);
    case "openai":
      return OpenAIProvider.create(opts);
    default:
      throw new Error(
        `Unknown AI provider: ${provider}\nSupported: ollama, openai`
      );
  }
}
