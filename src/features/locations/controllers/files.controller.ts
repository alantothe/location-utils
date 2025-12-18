import type { Context } from "hono";

export async function serveImage(c: Context) {
  const pathname = c.req.path;
  const filePath = "." + pathname;
  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (exists) {
    return new Response(file);
  }

  return c.text("Image Not Found", 404);
}
