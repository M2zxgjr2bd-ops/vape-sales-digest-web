import { assertDigestConfig } from "../../lib/config.js";
import { generateDailyReport } from "../../lib/run-daily-report.js";
import { authorizeCronRequest } from "../../lib/security.js";

export async function GET(request) {
  const config = assertDigestConfig();

  if (!authorizeCronRequest(request, config.cronSecret)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateDailyReport({ trigger: "cron", force: true });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
