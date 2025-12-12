# Location Manager with Instagram Integration

A unified tool to manage locations with Google Maps URLs and enrich them with Instagram content. Create locations, add Instagram embeds, and automatically download associated images.

## Features

- **Unified Location Management**: Create locations via Google Maps, then add Instagram embeds to them
- **Single Mode**: Enter a name and address to create a location with Google Maps URL
- **Batch Mode**: Process CSV or TXT files containing multiple locations
- **Instagram Integration**: Add Instagram embeds to existing locations with automatic image downloading
- **View History**: View all locations with their associated Instagram content
- **Web Interface**: Beautiful card-based UI to manage locations and their Instagram embeds
- **Persistence**: Automatically saves all data to a local SQLite database (`location.sqlite`)
- **Hierarchical Structure**: Instagram embeds are linked to their parent locations
- **Image Management**: Automatically downloads and organizes Instagram images by location
- **JSON Output**: Exports results to JSON files

## Installation

1. Ensure you have [Bun](https://bun.sh) installed.
2. Install dependencies:
   ```bash
   bun install
   ```

## Usage

Run the tool:
```bash
bun start
```

### Workflow

1. **Create Locations**: Use Single Mode or Batch Mode to create locations with Google Maps URLs
2. **Add Instagram Embeds**: Select "Extract from Instagram Embed" and choose a location to attach the embed
3. **View & Manage**: Use the Web Interface or View History to see your locations with their Instagram content

### CLI Modes

- **Single Location**: Create one location at a time with name and address
- **Batch Mode**: Import multiple locations from CSV or TXT files
- **Extract from Instagram Embed**: Add Instagram content to an existing location
- **View Database History**: See all locations with their Instagram embeds in a hierarchical view
- **Start Web Interface**: Launch the web dashboard for visual management
- **Kill / Clear All Data**: Reset the database

### Batch File Formats

**CSV (`.csv`)**:
Must have headers `name` and `address`.
```csv
name,address
Panchita,C. 2 de Mayo 298 Miraflores
```

**Text (`.txt`)**:
Each line in the format `Name | Address`.
```text
Panchita | C. 2 de Mayo 298 Miraflores
```

## Web Interface

Select **Start Web Interface** from the main menu to launch the dashboard at `http://localhost:3000`.

Features:
- **Card-based Layout**: Clean, modern interface showing all locations
- **Expandable Instagram Embeds**: Click to expand and see all Instagram content for each location
- **Quick Actions**: Copy coordinates, open Maps, view images, copy Instagram links
- **Add Instagram Button**: Per-location button to add new Instagram embeds
- **Image Gallery**: View and manage downloaded Instagram images with CDN URLs
- **Organized Storage**: Images are automatically organized in folders by location name

## Data Structure

The unified database structure:
- **Main Locations** (`type: 'maps'`): Created via Google Maps flow with name, address, coordinates
- **Instagram Embeds** (`type: 'instagram'`): Linked to parent locations via `parent_id`
- **Hierarchical Display**: Instagram embeds are displayed nested under their parent location

## Output

- Console output with JSON
- `output.json` (Single Mode)
- `location_urls.json` (Batch Mode, in the source folder)
- `location.sqlite` (SQLite database with unified schema)
- `images/[location_name]_[timestamp]/` (Downloaded Instagram images organized by location)
