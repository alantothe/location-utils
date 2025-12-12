import { jsonResponse, errorResponse } from "../../../shared/http/responses";
import { locationsHtmlTemplate } from "../routes/home.template";
import {
  addInstagramEmbed,
  addMapsLocation,
  addUploadFiles,
  listLocations,
  openFolder,
  updateMapsLocation,
} from "../services/location.service";
import type { CreateMapsRequest, UpdateMapsRequest } from "../models/location";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

export function serveHome() {
  return new Response(locationsHtmlTemplate, {
    headers: { "Content-Type": "text/html" },
  });
}

export function serveImage(pathname: string) {
  const filePath = "." + pathname;
  const file = Bun.file(filePath);
  return file.exists().then((exists) => {
    if (exists) return new Response(file);
    return new Response("Image Not Found", { status: 404 });
  });
}

export function getLocations() {
  try {
    const locations = listLocations();
    const cwd = process.cwd();
    return jsonResponse({ locations, cwd });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return errorResponse("Failed to fetch locations", 500);
  }
}

export async function postAddMaps(req: Request) {
  try {
    const body = (await req.json()) as CreateMapsRequest;
    const entry = await addMapsLocation(body, GOOGLE_MAPS_API_KEY);
    return jsonResponse({ success: true, entry });
  } catch (error: any) {
    console.error(error);
    const message = error?.message || "Server Error";
    const status = message.toLowerCase().includes("required") ? 400 : 500;
    return errorResponse(message, status);
  }
}

export async function postUpdateMaps(req: Request) {
  try {
    const body = (await req.json()) as UpdateMapsRequest;
    const entry = await updateMapsLocation(body, GOOGLE_MAPS_API_KEY);
    return jsonResponse({ success: true, entry });
  } catch (error: any) {
    console.error(error);
    const message = error?.message || "Server Error";
    const status = message.toLowerCase().includes("required") ? 400 : 500;
    return errorResponse(message, status);
  }
}

export async function postAddInstagram(req: Request) {
  try {
    const body = (await req.json()) as { embedCode: string; locationId: number };
    const entry = await addInstagramEmbed({ embedCode: body.embedCode, locationId: body.locationId });
    return jsonResponse({ success: true, entry });
  } catch (error: any) {
    console.error(error);
    const message = error?.message || "Server Error";
    const status = message.toLowerCase().includes("required") ? 400 : 500;
    return errorResponse(message, status);
  }
}

export async function postAddUpload(req: Request) {
  try {
    const formData = await req.formData();
    const idRaw = formData.get("locationId") || formData.get("parentId");
    const parentId = typeof idRaw === "string" ? Number(idRaw) : Number(idRaw?.toString());
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    const entry = await addUploadFiles(parentId, files);
    return jsonResponse({ success: true, entry });
  } catch (error: any) {
    console.error("Upload error:", error);
    const message = error?.message || "Server Error";
    const status = message.toLowerCase().includes("required") ? 400 : 500;
    return errorResponse(message, status);
  }
}

export async function postOpenFolder(req: Request) {
  try {
    const body = (await req.json()) as { folderPath?: string };
    if (!body.folderPath) return errorResponse("Folder path required", 400);
    openFolder(body.folderPath);
    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error("Error opening folder:", error);
    return errorResponse("Failed to open folder", 500);
  }
}
