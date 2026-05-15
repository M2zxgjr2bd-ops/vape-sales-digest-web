function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getConfig() {
  return {
    cronSecret: process.env.CRON_SECRET ?? "",
    openAiApiKey: process.env.OPENAI_API_KEY ?? "",
    openAiModel: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    digestTimezone: process.env.DIGEST_TIMEZONE ?? "Asia/Shanghai",
    leadSourceUrls: parseCsv(process.env.LEAD_SOURCE_URLS),
    maxItemsPerSource: toInt(process.env.MAX_ITEMS_PER_SOURCE, 6),
    fetchTimeoutMs: toInt(process.env.FETCH_TIMEOUT_MS, 12000)
  };
}

export function assertDigestConfig() {
  return getConfig();
}
