import type { Context } from "hono";
import { addUploadFiles } from "./services/uploads.service";

export async function postAddUpload(c: Context) {
  try {
    const formData = await c.req.formData();
    const idRaw = formData.get("locationId") || formData.get("parentId");  // Support both for backward compatibility
    const locationId = typeof idRaw === "string" ? Number(idRaw) : Number(idRaw?.toString());
    const photographerCredit = formData.get("photographerCredit");
    const photographerCreditValue = typeof photographerCredit === "string"
      ? (photographerCredit.trim() || null)
      : null;
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const entry = await addUploadFiles(locationId, files, photographerCreditValue);
    return c.json({ success: true, entry });
  } catch (error: any) {
    console.error("Upload error:", error);
    const message = error?.message || "Server Error";
    const status = message.toLowerCase().includes("required") ? 400 : 500;
    return c.json({ error: message }, status);
  }
}
