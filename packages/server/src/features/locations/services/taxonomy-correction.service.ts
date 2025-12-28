import {
  getAllCorrections,
  findCorrection,
  insertCorrection,
  deleteCorrection,
  getCorrectionById,
  type TaxonomyCorrection,
} from "../repositories/taxonomy-correction.repository";
import { parseLocationValue } from "../utils/location-utils";
import {
  BadRequestError,
  NotFoundError,
} from "@server/shared/core/errors/http-error";

export class TaxonomyCorrectionService {
  /**
   * Apply corrections to a locationKey string
   * Example: "brazil|bras-lia|asa-sul" -> "brazil|brasilia|asa-sul"
   */
  applyCorrections(locationKey: string): string {
    if (!locationKey) return locationKey;

    const parsed = parseLocationValue(locationKey);
    if (!parsed) return locationKey;

    // Apply corrections to each part
    const correctedCountry = this.applyCorrectionToPart(
      parsed.country,
      "country"
    );
    const correctedCity = parsed.city
      ? this.applyCorrectionToPart(parsed.city, "city")
      : null;
    const correctedNeighborhood = parsed.neighborhood
      ? this.applyCorrectionToPart(parsed.neighborhood, "neighborhood")
      : null;

    // Rebuild locationKey
    const parts = [
      correctedCountry,
      correctedCity,
      correctedNeighborhood,
    ].filter(Boolean);
    return parts.join("|");
  }

  /**
   * Apply correction to a single location part
   */
  private applyCorrectionToPart(
    value: string,
    partType: "country" | "city" | "neighborhood"
  ): string {
    const correction = findCorrection(value, partType);
    return correction ? correction.correct_value : value;
  }

  /**
   * Get all correction rules
   */
  getAllRules(): TaxonomyCorrection[] {
    return getAllCorrections();
  }

  /**
   * Add a new correction rule
   */
  addRule(
    incorrectValue: string,
    correctValue: string,
    partType: "country" | "city" | "neighborhood"
  ): TaxonomyCorrection {
    // Validate inputs
    if (!incorrectValue || !correctValue) {
      throw new BadRequestError(
        "Both incorrect_value and correct_value are required"
      );
    }

    if (incorrectValue === correctValue) {
      throw new BadRequestError(
        "Incorrect and correct values cannot be the same"
      );
    }

    const inserted = insertCorrection(incorrectValue, correctValue, partType);

    if (!inserted) {
      throw new BadRequestError(
        "Failed to create correction rule (may already exist)"
      );
    }

    return inserted;
  }

  /**
   * Remove a correction rule
   */
  removeRule(id: number): void {
    const exists = getCorrectionById(id);
    if (!exists) {
      throw new NotFoundError("Correction rule", id);
    }

    const success = deleteCorrection(id);
    if (!success) {
      throw new BadRequestError("Failed to delete correction rule");
    }
  }
}
