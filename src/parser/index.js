import { extname } from "path";
import { parseDocx } from "./docx-parser.js";
import { parsePDF } from "./pdf-parser.js";
import { parseJSON } from "./json-parser.js";

/**
 * Parse a resume file into a standard internal format.
 * Supports: .docx, .pdf, .json
 */
export async function parseResume(filePath) {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".docx":
      return parseDocx(filePath);
    case ".pdf":
      return parsePDF(filePath);
    case ".json":
      return parseJSON(filePath);
    default:
      throw new Error(
        `Unsupported resume format: ${ext}\nSupported formats: .docx, .pdf, .json`
      );
  }
}
