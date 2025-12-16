import type { Context } from "hono";
import type { CreateMapsRequest, UpdateMapsRequest } from "../../models/location";
import { addMapsLocation, updateMapsLocation } from "./services/maps.service";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

export async function postAddMaps(c: Context) {
  try {
    const body = await c.req.json() as CreateMapsRequest;
    const allowedKeys = ["name", "address", "category"];
    const extraKeys = Object.keys(body || {}).filter((key) => !allowedKeys.includes(key));
    if (extraKeys.length > 0) {
      return c.json({ error: `Unexpected fields: ${extraKeys.join(", ")}` }, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";

    if (!name || !address) {
      return c.json({ error: "Name and address are required" }, 400);
    }

    if (!body.category) {
      return c.json({ error: "Category is required" }, 400);
    }

    const entry = await addMapsLocation({ name, address, category: body.category }, GOOGLE_MAPS_API_KEY);
    return c.json({ success: true, entry });
  } catch (error: any) {
    console.error(error);
    const message = error?.message || "Server Error";
    const status = message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid") ? 400 : 500;
    return c.json({ error: message }, status);
  }
}

export async function postUpdateMaps(c: Context) {
  try {
    const body = await c.req.json() as UpdateMapsRequest;
    if (!body.id) {
      return c.json({ error: "Location ID is required" }, 400);
    }
    if (!body.title) {
      return c.json({ error: "Display Title is required" }, 400);
    }
    const entry = await updateMapsLocation(body, GOOGLE_MAPS_API_KEY);
    return c.json({ success: true, entry });
  } catch (error: any) {
    console.error(error);
    const message = error?.message || "Server Error";
    const status = message.toLowerCase().includes("required") ? 400 : 500;
    return c.json({ error: message }, status);
  }
}
