# location_taxonomy Table

## Overview
The `location_taxonomy` table stores the canonical location hierarchy (country -> city -> neighborhood) used for filtering and admin review. The design stays flat and uses a single `locationKey` string so lookups, approvals, and joins stay simple and fast.

## Columns
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `country` | TEXT | NOT NULL | Country name (lowercase, e.g., "colombia") |
| `city` | TEXT | NULL | City name (lowercase, e.g., "bogota") |
| `neighborhood` | TEXT | NULL | Neighborhood/district (lowercase, e.g., "chapinero") |
| `locationKey` | TEXT | UNIQUE NOT NULL | Pipe-delimited key: "country|city|neighborhood" |
| `status` | TEXT | DEFAULT 'approved', CHECK IN ('approved', 'pending') | Approval status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp (set by SQLite on insert) |

## LocationKey Rules
- Built from slugified parts: lowercase, numbers, and hyphens (see `slugifyLocationPart`).
- Uses 1-3 segments separated by `|`; missing levels are omitted.
- Examples:
  - Country only: `colombia`
  - Country + city: `colombia|bogota`
  - Full hierarchy: `colombia|bogota|chapinero`

## Constraints & Indexes
- `UNIQUE(locationKey)` prevents duplicates across the hierarchy.
- `CHECK(status IN ('approved', 'pending'))` guarantees valid workflow states.
- Index `idx_taxonomy_status_key` on `(status, locationKey)` supports pending review and scoped lookups.

## Approval Workflow
- New or unknown `locationKey` values are inserted as `pending`.
- Admin actions:
  - `PATCH /api/admin/taxonomy/:locationKey/approve`
  - `DELETE /api/admin/taxonomy/:locationKey/reject`
- Public hierarchy endpoints only return approved entries; pending entries are review-only.

## Timestamps (created_at)
- `created_at` is assigned by SQLite using `DEFAULT CURRENT_TIMESTAMP` during `INSERT`; the app does not set it.
- SQLite stores this as UTC in `YYYY-MM-DD HH:MM:SS` format.
- For backfills or manual fixes, you can supply an explicit UTC timestamp in the insert statement.
