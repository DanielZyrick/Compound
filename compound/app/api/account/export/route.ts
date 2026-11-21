import { getCurrentUser } from "@/lib/auth/dal";
import { buildExport, exportFileName } from "@/lib/account/export";
import { loadExportRows } from "@/lib/account/queries";
import { todayIn } from "@/lib/dates/calendar";

/**
 * "Download my data" (Settings → Your data): everything the signed-in user
 * owns, as one JSON file. Never includes the Google Calendar tokens.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to download your data." }, { status: 401 });

  const data = buildExport(await loadExportRows(user.id), new Date());
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(todayIn(user.timezone))}"`,
      // Personal data: never kept by a browser or shared cache.
      "Cache-Control": "no-store",
    },
  });
}
