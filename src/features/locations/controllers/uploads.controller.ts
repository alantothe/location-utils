import type { Context } from "hono";
import { ServiceContainer } from "../container/service-container";
import { successResponse } from "../../../shared/core/types/api-response";
import { BadRequestError } from "../../../shared/core/errors/http-error";
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_SIZE, type AddUploadParamsDto } from "../validation/schemas/uploads.schemas";

const container = ServiceContainer.getInstance();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function postAddUpload(c: Context) {
  const formData = await c.req.formData();

  // Extract validated URL parameter
  const params = c.get("validatedParams") as AddUploadParamsDto;
  const locationId = params.id;

  // Parse photographer credit
  const photographerCredit = formData.get("photographerCredit");
  const photographerCreditValue = typeof photographerCredit === "string"
    ? (photographerCredit.trim() || null)
    : null;

  // Parse files
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  // Validate files
  if (!files || files.length === 0) {
    throw new BadRequestError("At least one file required");
  }

  if (files.length > MAX_FILES) {
    throw new BadRequestError(`Maximum ${MAX_FILES} files allowed per upload`);
  }

  let totalSize = 0;
  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new BadRequestError(
        `Invalid file type for "${file.name}". Only JPEG, PNG, WebP, and GIF images are allowed.`
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError(`File "${file.name}" exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new BadRequestError(`Total upload size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`);
  }

  const entry = await container.uploadsService.addUploadFiles(locationId, files, photographerCreditValue);
  return c.json(successResponse({ entry }));
}
