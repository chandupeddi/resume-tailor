import { parse as parseHTML } from "node-html-parser";

/**
 * Fetch a job description from a URL and extract the text.
 * Handles LinkedIn, Indeed, Glassdoor, and generic job pages.
 */
export async function fetchJDFromURL(url) {
  // Normalize URL
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const root = parseHTML(html);

  // Remove script, style, nav, footer, header tags
  for (const tag of ["script", "style", "nav", "footer", "header", "aside"]) {
    root.querySelectorAll(tag).forEach((el) => el.remove());
  }

  // Try platform-specific extractors first
  const domain = new URL(url).hostname.toLowerCase();

  if (domain.includes("linkedin.com")) {
    return extractLinkedIn(root, html);
  }
  if (domain.includes("indeed.com")) {
    return extractIndeed(root);
  }
  if (domain.includes("glassdoor.com")) {
    return extractGlassdoor(root);
  }
  if (domain.includes("greenhouse.io")) {
    return extractGreenhouse(root);
  }
  if (domain.includes("lever.co")) {
    return extractLever(root);
  }

  // Generic extraction
  return extractGeneric(root);
}

function extractLinkedIn(root, html) {
  // LinkedIn job postings often have the description in a specific div
  const descDiv =
    root.querySelector(".description__text") ||
    root.querySelector(".show-more-less-html__markup") ||
    root.querySelector('[class*="description"]');

  if (descDiv) {
    return cleanText(descDiv.text);
  }

  // Try JSON-LD
  const jsonLD = extractJSONLD(html);
  if (jsonLD?.description) {
    return cleanText(jsonLD.description);
  }

  return extractGeneric(root);
}

function extractIndeed(root) {
  const descDiv =
    root.querySelector("#jobDescriptionText") ||
    root.querySelector(".jobsearch-jobDescriptionText") ||
    root.querySelector('[class*="jobDescription"]');

  if (descDiv) {
    return cleanText(descDiv.text);
  }
  return extractGeneric(root);
}

function extractGlassdoor(root) {
  const descDiv =
    root.querySelector(".jobDescriptionContent") ||
    root.querySelector('[class*="JobDescription"]') ||
    root.querySelector('[class*="jobDescription"]');

  if (descDiv) {
    return cleanText(descDiv.text);
  }
  return extractGeneric(root);
}

function extractGreenhouse(root) {
  const descDiv =
    root.querySelector("#content") ||
    root.querySelector(".content");

  if (descDiv) {
    return cleanText(descDiv.text);
  }
  return extractGeneric(root);
}

function extractLever(root) {
  const descDiv =
    root.querySelector(".section-wrapper") ||
    root.querySelector('[class*="posting"]');

  if (descDiv) {
    return cleanText(descDiv.text);
  }
  return extractGeneric(root);
}

function extractGeneric(root) {
  // Strategy: find the largest text block on the page
  // Job descriptions are usually the longest continuous text section

  const candidates = root.querySelectorAll(
    "article, main, [role='main'], .content, .job-description, " +
    "[class*='description'], [class*='posting'], [class*='job-detail'], " +
    "[id*='description'], [id*='posting']"
  );

  let bestText = "";
  for (const el of candidates) {
    const text = cleanText(el.text);
    if (text.length > bestText.length) {
      bestText = text;
    }
  }

  // Fallback: just get body text
  if (bestText.length < 100) {
    const body = root.querySelector("body");
    if (body) {
      bestText = cleanText(body.text);
    }
  }

  if (bestText.length < 50) {
    throw new Error(
      "Could not extract job description from URL.\n" +
      "The page may require JavaScript to load.\n" +
      "Try saving the JD as a .txt file instead."
    );
  }

  return bestText;
}

function extractJSONLD(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "JobPosting") return data;
      if (Array.isArray(data)) {
        return data.find((d) => d["@type"] === "JobPosting");
      }
    } catch {}
  }
  return null;
}

function cleanText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}
