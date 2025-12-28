import { getDb } from "@server/shared/db/client";

export interface TaxonomyCorrection {
  id?: number;
  incorrect_value: string;
  correct_value: string;
  part_type: "country" | "city" | "neighborhood";
  created_at?: string;
}

/**
 * Get all active correction rules
 */
export function getAllCorrections(): TaxonomyCorrection[] {
  const db = getDb();
  const query = db.query(`
    SELECT id, incorrect_value, correct_value, part_type, created_at
    FROM taxonomy_corrections
    ORDER BY created_at DESC
  `);
  return query.all() as TaxonomyCorrection[];
}

/**
 * Find correction for a specific value and part type
 */
export function findCorrection(
  value: string,
  partType: "country" | "city" | "neighborhood"
): TaxonomyCorrection | null {
  const db = getDb();
  const query = db.query(`
    SELECT id, incorrect_value, correct_value, part_type, created_at
    FROM taxonomy_corrections
    WHERE incorrect_value = $value AND part_type = $partType
  `);
  const result = query.get({
    $value: value,
    $partType: partType,
  }) as TaxonomyCorrection | null;
  return result;
}

/**
 * Insert a new correction rule
 */
export function insertCorrection(
  incorrectValue: string,
  correctValue: string,
  partType: "country" | "city" | "neighborhood"
): TaxonomyCorrection | null {
  const db = getDb();

  try {
    const query = db.query(`
      INSERT INTO taxonomy_corrections (incorrect_value, correct_value, part_type)
      VALUES ($incorrect, $correct, $partType)
    `);

    query.run({
      $incorrect: incorrectValue,
      $correct: correctValue,
      $partType: partType,
    });

    return findCorrection(incorrectValue, partType);
  } catch (error) {
    console.error("Error inserting correction:", error);
    return null;
  }
}

/**
 * Delete a correction rule by ID
 */
export function deleteCorrection(id: number): boolean {
  const db = getDb();
  try {
    const query = db.query(`DELETE FROM taxonomy_corrections WHERE id = $id`);
    const result = query.run({ $id: id });
    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting correction:", error);
    return false;
  }
}

/**
 * Get correction by ID
 */
export function getCorrectionById(id: number): TaxonomyCorrection | null {
  const db = getDb();
  const query = db.query(`
    SELECT id, incorrect_value, correct_value, part_type, created_at
    FROM taxonomy_corrections
    WHERE id = $id
  `);
  return query.get({ $id: id }) as TaxonomyCorrection | null;
}
