import { assertDigestConfig } from "./config.js";
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

  const digest = await buildDigest({
    items,
    runAt,
    timeZone: config.digestTimezone,
    openAiApiKey: config.openAiApiKey,
    openAiModel: config.openAiModel
  });

  const report = {
    ok: true,
    trigger,
    cached: false,
    dateKey,
    generationMode: digest.generationMode,
    itemCount: items.length,
    subject: `电子烟行业销售情报日报 | ${dateKey}`,
    generatedAt: currentTimestampLabel(runAt, config.digestTimezone),
    markdown: digest.markdown,
    sections: splitDigestSections(digest.markdown),
    sourceBreakdown: summarizeSources(items)
  };

  cachedReport = report;
  return report;
}
