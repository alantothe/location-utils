import type { Context } from "hono";
import { ServiceContainer } from "../container/service-container";
import { successResponse } from "@server/shared/core/types/api-response";
import type { CreateCorrectionDto } from "../validation/schemas/taxonomy-correction.schemas";

const container = ServiceContainer.getInstance();

/**
 * GET /api/admin/taxonomy/corrections
 * Get all correction rules
 */
export function getAllCorrections(c: Context) {
  const corrections = container.taxonomyCorrectionService.getAllRules();
  return c.json(successResponse({ corrections }));
}

/**
 * POST /api/admin/taxonomy/corrections
 * Create a new correction rule
 */
export function createCorrection(c: Context) {
  const dto = c.get("validatedBody") as CreateCorrectionDto;
  const correction = container.taxonomyCorrectionService.addRule(
    dto.incorrect_value,
    dto.correct_value,
    dto.part_type
  );
  return c.json(successResponse({ correction }));
}

/**
 * DELETE /api/admin/taxonomy/corrections/:id
 * Delete a correction rule
 */
export function deleteCorrection(c: Context) {
  const id = Number(c.req.param("id"));
  container.taxonomyCorrectionService.removeRule(id);
  return c.json(successResponse({ message: "Correction rule deleted" }));
}
