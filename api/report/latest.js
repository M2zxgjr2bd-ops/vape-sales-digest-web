import { generateDailyReport } from "../../lib/run-daily-report.js";

export async function GET(request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await generateDailyReport({ trigger: "web", force });

    return Response.json(result, {
      headers: {
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      {
        status: 500,
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }
}
