import { assertDigestConfig } from "./config.js";
import { enrichItemsWithArticleText } from "./article-enricher.js";
import { buildDigest } from "./digest.js";
import { buildSourceCatalog } from "./source-catalog.js";
import { collectCandidateItems } from "./source-fetcher.js";

let cachedReport = null;

function currentDateLabel(runAt, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(runAt);
}

function currentTimestampLabel(runAt, timeZone) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(runAt);
}

function splitDigestSections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let currentTitle = "日报正文";
  let buffer = [];

  const pushSection = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      sections.push({ title: currentTitle, content });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^[一二三四五六七八九十]+、/.test(line)) {
      pushSection();
      currentTitle = line;
      buffer = [];
      continue;
    }

    buffer.push(rawLine);
  }

  pushSection();
  return sections;
}

function summarizeSources(items) {
  return items.reduce(
    (acc, item) => {
      acc[item.sourceGroup] = (acc[item.sourceGroup] ?? 0) + 1;
      return acc;
    },
    {
      regulatory: 0,
      media: 0,
      brand: 0,
      lead: 0
    }
  );
}

function selectDigestItems(items, limit) {
  const caps = {
    regulatory: 4,
    media: 3,
    brand: 3,
    lead: 2
  };
  const counts = {
    regulatory: 0,
    media: 0,
    brand: 0,
    lead: 0
  };
  const selected = [];

  for (const item of items) {
    if (selected.length >= limit) {
      break;
    }

    const cap = caps[item.sourceGroup] ?? 2;
    if ((counts[item.sourceGroup] ?? 0) >= cap) {
      continue;
    }

    selected.push(item);
    counts[item.sourceGroup] = (counts[item.sourceGroup] ?? 0) + 1;
  }

  if (selected.length >= limit) {
    return selected;
  }

  const selectedUrls = new Set(selected.map((item) => item.url));
  for (const item of items) {
    if (selected.length >= limit) {
      break;
    }

    if (selectedUrls.has(item.url)) {
      continue;
    }

    selected.push(item);
  }

  return selected;
}

export async function generateDailyReport({ trigger = "web", force = false } = {}) {
  const config = assertDigestConfig();
  const runAt = new Date();
  const dateKey = currentDateLabel(runAt, config.digestTimezone);

  if (!force && cachedReport && cachedReport.dateKey === dateKey) {
    return {
      ...cachedReport,
      trigger,
      cached: true
    };
  }

  const sources = buildSourceCatalog({ leadSourceUrls: config.leadSourceUrls });
  const items = await collectCandidateItems({
    sources,
    maxItemsPerSource: config.maxItemsPerSource,
    fetchTimeoutMs: config.fetchTimeoutMs
  });
  const digestItems = selectDigestItems(items, config.maxDigestItems);
  const enrichedItems = await enrichItemsWithArticleText({
    items: digestItems,
    fetchTimeoutMs: config.fetchTimeoutMs,
    maxArticleChars: config.maxArticleChars
  });

  const digest = await buildDigest({
    items: enrichedItems,
    runAt,
    timeZone: config.digestTimezone,
    openAiApiKey: config.openAiApiKey,
    openAiModel: config.openAiModel,
    openAiTimeoutMs: config.openAiTimeoutMs,
    openAiItemLimit: config.openAiItemLimit,
    openAiExcerptChars: config.openAiExcerptChars
  });

  const report = {
    ok: true,
    trigger,
    cached: false,
    dateKey,
    generationMode: digest.generationMode,
    itemCount: enrichedItems.length,
    candidateCount: items.length,
    subject: `电子烟行业销售情报日报 | ${dateKey}`,
    generatedAt: currentTimestampLabel(runAt, config.digestTimezone),
    markdown: digest.markdown,
    sections: splitDigestSections(digest.markdown),
    sourceBreakdown: summarizeSources(enrichedItems)
  };

  cachedReport = report;
  return report;
}
