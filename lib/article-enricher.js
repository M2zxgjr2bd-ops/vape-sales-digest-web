import * as cheerio from "cheerio";

const BODY_SELECTORS = [
  "article",
  "[itemprop='articleBody']",
  ".article-content",
  ".article__content",
  ".article-body",
  ".post-content",
  ".entry-content",
  ".blog-content",
  ".content-body",
  ".news-content",
  "main"
];

const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "form",
  "nav",
  "header",
  "footer",
  "aside",
  ".share",
  ".social",
  ".related",
  ".recommended",
  ".newsletter",
  ".breadcrumbs",
  ".comments"
];

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value, maxChars) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars).trim()}...`;
}

async function fetchHtml(url, timeoutMs) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "OUKITEL-VAPEIN-DigestBot/1.0 (+https://vercel.com)"
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function extractPublishedAt($) {
  const candidates = [
    $("meta[property='article:published_time']").attr("content"),
    $("meta[name='article:published_time']").attr("content"),
    $("meta[property='og:published_time']").attr("content"),
    $("meta[itemprop='datePublished']").attr("content"),
    $("time[datetime]").first().attr("datetime"),
    $("time").first().text()
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate ?? "");
    if (value.length >= 8) {
      return value;
    }
  }

  return "";
}

function extractDescription($) {
  const candidates = [
    $("meta[name='description']").attr("content"),
    $("meta[property='og:description']").attr("content")
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate ?? "");
    if (value.length >= 40) {
      return value;
    }
  }

  return "";
}

function scoreElementText(text, className = "") {
  let score = text.length;

  if (/\b(article|content|post|story|body|entry|news)\b/i.test(className)) {
    score += 250;
  }

  if (text.split(". ").length >= 3 || text.split("。").length >= 3) {
    score += 200;
  }

  return score;
}

function extractBlocks($, root) {
  const blocks = [];

  $(root)
    .find("h1, h2, h3, p, li")
    .each((_, element) => {
      const text = normalizeText($(element).text() ?? "");
      if (text.length < 40) {
        return;
      }

      if (/cookie|privacy|subscribe|newsletter|sign up|all rights reserved/i.test(text)) {
        return;
      }

      blocks.push(text);
    });

  return blocks;
}

function extractArticleText(html, maxChars) {
  const $ = cheerio.load(html);
  STRIP_SELECTORS.forEach((selector) => $(selector).remove());

  const candidates = [];

  for (const selector of BODY_SELECTORS) {
    $(selector).each((_, element) => {
      const blocks = extractBlocks($, element);
      if (blocks.length === 0) {
        return;
      }

      const text = normalizeText(blocks.join("\n"));
      if (text.length < 240) {
        return;
      }

      const className = $(element).attr("class") ?? "";
      candidates.push({
        text,
        score: scoreElementText(text, className)
      });
    });
  }

  if (candidates.length === 0) {
    const fallbackBlocks = extractBlocks($, "body");
    const fallbackText = normalizeText(fallbackBlocks.join("\n"));

    if (fallbackText.length < 240) {
      return "";
    }

    return truncateText(fallbackText, maxChars);
  }

  candidates.sort((a, b) => b.score - a.score);
  return truncateText(candidates[0].text, maxChars);
}

export async function enrichItemsWithArticleText({
  items,
  fetchTimeoutMs,
  maxArticleChars
}) {
  const enriched = await Promise.all(
    items.map(async (item) => {
      const html = await fetchHtml(item.url, fetchTimeoutMs);
      if (!html) {
        return {
          ...item,
          articleText: "",
          articleDescription: "",
          publishedAt: "",
          articleFetchOk: false
        };
      }

      const $ = cheerio.load(html);

      return {
        ...item,
        articleText: extractArticleText(html, maxArticleChars),
        articleDescription: extractDescription($),
        publishedAt: extractPublishedAt($),
        articleFetchOk: true
      };
    })
  );

  return enriched;
}
