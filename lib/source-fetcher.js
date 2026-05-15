import * as cheerio from "cheerio";

const GROUP_PRIORITY = {
  regulatory: 4,
  media: 3,
  brand: 2,
  lead: 1
};

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isSkippableHref(href) {
  return (
    !href ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

function sameHostOrSubdomain(baseUrl, candidateUrl) {
  try {
    const base = new URL(baseUrl);
    const candidate = new URL(candidateUrl);
    const baseHost = base.hostname.replace(/^www\./, "");
    const candidateHost = candidate.hostname.replace(/^www\./, "");
    return candidateHost === baseHost || candidateHost.endsWith(`.${baseHost}`);
  } catch {
    return false;
  }
}

function keywordScore(text, href, keywords) {
  const haystack = `${text} ${href}`.toLowerCase();
  return keywords.reduce((score, keyword) => {
    return haystack.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function scoreCandidate({ text, href, keywords, source }) {
  const base = keywordScore(text, href, keywords);
  if (base === 0) return 0;

  let score = base;

  if (/news|press|article|blog|update|launch|market|bill|guidance|warning|distributor/i.test(href)) {
    score += 2;
  }

  if (/ban|tax|restriction|compliance|regulation|pmta|nicotine|disposable|pod|open/i.test(text)) {
    score += 2;
  }

  score += GROUP_PRIORITY[source.group] ?? 0;
  return score;
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

function extractCandidatesFromHtml(html, source, maxItemsPerSource) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  $("a[href]").each((_, element) => {
    if (results.length >= maxItemsPerSource) {
      return false;
    }

    const href = normalizeText($(element).attr("href") ?? "");
    const text = normalizeText($(element).text() ?? "");

    if (isSkippableHref(href)) {
      return;
    }

    if (text.length < 18 || text.length > 160) {
      return;
    }

    let absoluteUrl;
    try {
      absoluteUrl = new URL(href, source.url).toString();
    } catch {
      return;
    }

    if (!sameHostOrSubdomain(source.url, absoluteUrl)) {
      return;
    }

    if (seen.has(absoluteUrl)) {
      return;
    }

    const score = scoreCandidate({
      text,
      href: absoluteUrl,
      keywords: source.keywords,
      source
    });

    if (score <= 0) {
      return;
    }

    seen.add(absoluteUrl);
    results.push({
      sourceGroup: source.group,
      sourceName: source.name,
      sourceUrl: source.url,
      title: text,
      url: absoluteUrl,
      score
    });
  });

  return results;
}

function dedupeCandidates(items) {
  const byUrl = new Map();

  for (const item of items) {
    const existing = byUrl.get(item.url);
    if (!existing || item.score > existing.score) {
      byUrl.set(item.url, item);
    }
  }

  return [...byUrl.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export async function collectCandidateItems({
  sources,
  maxItemsPerSource,
  fetchTimeoutMs
}) {
  const batches = await Promise.all(
    sources.map(async (source) => {
      const html = await fetchHtml(source.url, fetchTimeoutMs);
      if (!html) {
        return [];
      }

      return extractCandidatesFromHtml(html, source, maxItemsPerSource);
    })
  );

  return dedupeCandidates(batches.flat());
}
