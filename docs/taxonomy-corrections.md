# Taxonomy Corrections System

## Overview

The taxonomy corrections system allows you to fix data quality issues from geocoding APIs (Google Maps, Geoapify) by creating correction rules that automatically apply to all future locations.

**Problem:** APIs sometimes return malformed location names like "lima li ma", "bras-lia", or "s-o-paulo" due to encoding issues or poor data quality.

**Solution:** Add correction rules via API that automatically fix these issues before saving to the database.

---

## Quick Start

### When You Encounter Bad Data

1. **Add a location** and notice the API returned incorrect data (e.g., "lima li ma" instead of "lima")

2. **Add a correction rule:**
```bash
curl -X POST http://localhost:3000/api/admin/taxonomy/corrections \
  -H "Content-Type: application/json" \
  -d '{
    "incorrect_value": "lima-li-ma",
    "correct_value": "lima",
    "part_type": "city"
  }'
```

3. **Done!** All future locations with "lima-li-ma" will automatically be corrected to "lima"

---

## API Endpoints

### List All Correction Rules

```bash
GET /api/admin/taxonomy/corrections
```

**Response:**
```json
{
  "success": true,
  "data": {
    "corrections": [
      {
        "id": 1,
        "incorrect_value": "bras-lia",
        "correct_value": "brasilia",
        "part_type": "city",
        "created_at": "2025-12-28 03:56:12"
      }
    ]
  }
}
```

### Add a Correction Rule

```bash
POST /api/admin/taxonomy/corrections
Content-Type: application/json

{
  "incorrect_value": "bad-value",
  "correct_value": "good-value",
  "part_type": "city"
}
```

**Request Body:**
- `incorrect_value` (string, required) - The incorrect value to match (kebab-case)
- `correct_value` (string, required) - The corrected value (kebab-case)
- `part_type` (enum, required) - One of: `"country"`, `"city"`, `"neighborhood"`

**Validation Rules:**
- Both values must be in kebab-case (lowercase with hyphens only)
- Values must match regex: `/^[a-z0-9-]+$/`
- `incorrect_value` and `correct_value` cannot be the same
- Unique constraint on `(incorrect_value, part_type)` - prevents duplicate rules

**Response:**
```json
{
  "success": true,
  "data": {
    "correction": {
      "id": 2,
      "incorrect_value": "s-o-paulo",
      "correct_value": "sao-paulo",
      "part_type": "city",
      "created_at": "2025-12-28 04:25:25"
    }
  }
}
```

### Delete a Correction Rule

```bash
DELETE /api/admin/taxonomy/corrections/:id
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/admin/taxonomy/corrections/3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Correction rule deleted"
  }
}
```

---

## Common Examples

### Example 1: City with Spaces/Accents

**Problem:** API returns "são paulo" which gets slugified to "s-o-paulo"

**Solution:**
```bash
curl -X POST http://localhost:3000/api/admin/taxonomy/corrections \
  -H "Content-Type: application/json" \
  -d '{
    "incorrect_value": "s-o-paulo",
    "correct_value": "sao-paulo",
    "part_type": "city"
  }'
```

### Example 2: Country Name Variant

**Problem:** API returns "brasil" instead of "brazil"

**Solution:**
```bash
curl -X POST http://localhost:3000/api/admin/taxonomy/corrections \
  -H "Content-Type: application/json" \
  -d '{
    "incorrect_value": "brasil",
    "correct_value": "brazil",
    "part_type": "country"
  }'
```

### Example 3: Brasília Encoding Issue

**Problem:** Geoapify returns "Brasília" which gets slugified to "bras-lia"

**Solution:**
```bash
curl -X POST http://localhost:3000/api/admin/taxonomy/corrections \
  -H "Content-Type: application/json" \
  -d '{
    "incorrect_value": "bras-lia",
    "correct_value": "brasilia",
    "part_type": "city"
  }'
```

### Example 4: Neighborhood with Bad Encoding

**Problem:** API returns "copacabana" with weird encoding → "copac-b-na"

**Solution:**
```bash
curl -X POST http://localhost:3000/api/admin/taxonomy/corrections \
  -H "Content-Type: application/json" \
  -d '{
    "incorrect_value": "copac-b-na",
    "correct_value": "copacabana",
    "part_type": "neighborhood"
  }'
```

---

## How It Works

### Data Flow

When you create a new location via `POST /api/locations`:

```
1. User submits:
   { name: "Restaurant", address: "Lima, Peru" }

2. Google/Geoapify geocoding API returns:
   city: "lima li ma"

3. System slugifies the response:
   "lima li ma" → "lima-li-ma"

4. TaxonomyCorrectionService.applyCorrections() runs:
   - Parses locationKey: "peru|lima-li-ma|..."
   - Looks up correction for "lima-li-ma" + part_type "city"
   - Finds rule: "lima-li-ma" → "lima"
   - Replaces: "peru|lima|..."

5. Saves to database:
   locationKey = "peru|lima|..." (corrected!)

6. Creates taxonomy entry:
   status = 'pending' (awaiting admin approval)
```

### Automatic Application

Once a correction rule exists:
- **All future locations** with the incorrect value are automatically corrected
- Correction happens in `MapsService.addMapsLocation()` and `MapsService.updateMapsLocationById()`
- Applied BEFORE taxonomy entry creation
- Applied BEFORE saving to database

**You only add the rule once.** Every future location benefits automatically.

---

## Important Notes

### Values Must Be Kebab-Case

The API expects values in **kebab-case** (lowercase with hyphens):

```bash
✅ Good: "sao-paulo"
✅ Good: "rio-de-janeiro"
✅ Good: "buenos-aires"

❌ Bad: "São Paulo"
❌ Bad: "Rio De Janeiro"
❌ Bad: "buenos_aires"
```

If the API returns "São Paulo", it's automatically slugified to "s-o-paulo" by the system. Your correction rule should match the slugified version.

### Part Types

Corrections are specific to the part of the locationKey:

- `"country"` - Corrects the country part only
- `"city"` - Corrects the city part only
- `"neighborhood"` - Corrects the neighborhood part only

**Example:**
```typescript
// locationKey = "brazil|bras-lia|asa-sul"
// With correction rule: incorrect="bras-lia", correct="brasilia", part_type="city"
// Result = "brazil|brasilia|asa-sul"
```

### Existing Data vs. Future Data

**Current System:**
- ✅ Corrections apply to ALL **future** locations automatically
- ❌ Corrections do NOT automatically fix **existing** data in database

**If you need to fix existing data:**
You must manually update the database or create a migration script.

### No Editing Rules

You cannot edit a correction rule. To change a rule:
1. Delete the old rule: `DELETE /api/admin/taxonomy/corrections/:id`
2. Create a new rule: `POST /api/admin/taxonomy/corrections`

### Exact Matches Only

The system uses exact string matching, not pattern matching.

```bash
# This rule only matches exactly "s-o-paulo"
{
  "incorrect_value": "s-o-paulo",
  "correct_value": "sao-paulo"
}

# It will NOT match:
- "s-o-paul" (missing 'o')
- "s-o-paulo-metro" (has extra text)
```

---

## Complete Workflow Example

Let's walk through a real-world scenario:

### Step 1: Add a Location

```bash
curl -X POST http://localhost:3000/api/locations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Restaurante Brasileiro",
    "address": "Brasília, Brazil",
    "category": "dining"
  }'
```

### Step 2: API Returns Bad Data

The geocoding API returns:
- Country: "brazil" ✅
- City: "bras lia" ❌ (should be "brasilia")
- Neighborhood: "asa-sul" ✅

After slugification: `locationKey = "brazil|bras-lia|asa-sul"`

### Step 3: Location Created with Pending Taxonomy

The location is saved with:
- `locationKey = "brazil|bras-lia|asa-sul"`
- Taxonomy entry created with `status = 'pending'`
- **Location is hidden** from public API (pending approval)

### Step 4: Add Correction Rule

```bash
curl -X POST http://localhost:3000/api/admin/taxonomy/corrections \
  -H "Content-Type: application/json" \
  -d '{
    "incorrect_value": "bras-lia",
    "correct_value": "brasilia",
    "part_type": "city"
  }'
```

### Step 5: Future Locations Automatically Corrected

The next time you add a location in Brasília:

```bash
curl -X POST http://localhost:3000/api/locations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another Restaurant",
    "address": "Brasília, Brazil",
    "category": "dining"
  }'
```

The system:
1. Gets "bras lia" from API
2. Slugifies to "bras-lia"
3. **Applies correction** → "brasilia"
4. Saves with `locationKey = "brazil|brasilia|asa-sul"` ✅

### Step 6: Approve Taxonomy

```bash
curl -X PATCH http://localhost:3000/api/admin/taxonomy/brazil|brasilia|asa-sul/approve
```

Now all locations with this taxonomy become visible in the public API.

---

## Admin Workflow Summary

1. **Monitor new locations** for bad data
2. **Add correction rules** as you discover issues
3. **Build up a library** of corrections over time
4. **Future locations** automatically benefit from all rules

---

## Quick Reference Card

| Task | Endpoint | Method | Body |
|------|----------|--------|------|
| List all rules | `/api/admin/taxonomy/corrections` | GET | - |
| Add rule | `/api/admin/taxonomy/corrections` | POST | `{incorrect_value, correct_value, part_type}` |
| Delete rule | `/api/admin/taxonomy/corrections/:id` | DELETE | - |
| View pending taxonomy | `/api/admin/taxonomy/pending` | GET | - |
| Approve taxonomy | `/api/admin/taxonomy/:locationKey/approve` | PATCH | - |
| Reject taxonomy | `/api/admin/taxonomy/:locationKey/reject` | DELETE | - |

---

## Database Schema

The corrections are stored in the `taxonomy_corrections` table:

```sql
CREATE TABLE taxonomy_corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incorrect_value TEXT NOT NULL,
  correct_value TEXT NOT NULL,
  part_type TEXT NOT NULL CHECK(part_type IN ('country', 'city', 'neighborhood')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(incorrect_value, part_type)
);

CREATE INDEX idx_corrections_lookup ON taxonomy_corrections(incorrect_value, part_type);
```

**Constraints:**
- Unique combination of `(incorrect_value, part_type)` prevents duplicate rules
- CHECK constraint ensures `part_type` is one of the allowed values
- Index on lookup fields for fast correction application

---

## Technical Implementation

### Code Location

**Service:** `packages/server/src/features/locations/services/taxonomy-correction.service.ts`
- `applyCorrections(locationKey)` - Main correction logic
- `addRule(incorrect, correct, partType)` - Create new rule
- `getAllRules()` - List all rules
- `removeRule(id)` - Delete rule

**Repository:** `packages/server/src/features/locations/repositories/taxonomy-correction.repository.ts`
- Database queries for CRUD operations

**Controller:** `packages/server/src/features/locations/controllers/taxonomy-correction.controller.ts`
- HTTP endpoint handlers

**Validation:** `packages/server/src/features/locations/validation/schemas/taxonomy-correction.schemas.ts`
- Zod schemas for request validation

### Where Corrections Apply

Corrections are automatically applied in two places:

1. **Creating locations:** `MapsService.addMapsLocation()`
2. **Updating locations:** `MapsService.updateMapsLocationById()`

Both call `this.taxonomyCorrectionService.applyCorrections(locationKey)` BEFORE saving to database.

---

## Troubleshooting

### Rule Not Working

**Check 1: Is the value correct?**
```bash
# View the actual locationKey in database
sqlite3 packages/server/data/location.sqlite \
  "SELECT id, name, locationKey FROM locations ORDER BY id DESC LIMIT 5"
```

**Check 2: Is the rule using the slugified value?**
- API returns: "lima li ma"
- Slugified version: "lima-li-ma" ← Use this in correction rule

**Check 3: Is the part_type correct?**
```bash
# Verify your rule
curl http://localhost:3000/api/admin/taxonomy/corrections
```

### Correction Not Applied to Existing Data

This is expected behavior. Corrections only apply to:
- New locations (after rule is created)
- Updated locations (when locationKey is modified)

To fix existing data, you need to manually update the database.

### Duplicate Rule Error

```json
{
  "success": false,
  "error": "Failed to create correction rule (may already exist)"
}
```

**Solution:** A rule with this `(incorrect_value, part_type)` combination already exists. Delete the old rule first, or use a different value.

---

## Future Enhancements

Potential improvements for the future:

1. **Auto-apply to existing data** - When adding a rule, automatically scan and fix existing locations
2. **Pattern matching** - Use regex patterns instead of exact matches
3. **Bulk import** - Import multiple rules from a config file
4. **Edit rules** - Update existing rules instead of delete/recreate
5. **Web UI** - Admin interface for managing rules (instead of curl commands)
6. **Analytics** - Track how often each rule is applied

---

## See Also

- [Location Taxonomy System](./taxonomy.md) - Overview of the taxonomy approval system
- [API Documentation](./url.md) - Complete API reference
- [Database Schema](./schema.md) - Database structure
