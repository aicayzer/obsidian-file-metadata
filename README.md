# File Metadata

A sidebar panel for [Obsidian](https://obsidian.md) that shows file info, text statistics, and a document outline — without touching your frontmatter.

## Features

- **File info** — name, full path, folder, created/modified dates, size
- **Text statistics** — words, characters, sentences, paragraphs, estimated pages
- **Document outline** — clickable headings indented by level
- **Image metadata** — dimensions, colour space, camera (EXIF via [exifr](https://github.com/MikeKovarik/exifr))
- **Click to copy** — click any row to copy its value; file name copies the full vault path
- **Configurable** — toggle individual fields and sections on or off in Settings

## Installation

### Community plugins

1. **Settings → Community plugins → Browse** → search **File Metadata**
2. **Install** → **Enable**

### Manual

1. Grab `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/aicayzer/obsidian-file-metadata/releases/latest)
2. Drop them into `.obsidian/plugins/file-metadata/` inside your vault
3. **Settings → Community plugins** → enable **File Metadata**

## Usage

Click the **ⓘ** icon in the left ribbon, or run **File Metadata: Open File Metadata panel** from the command palette.

The panel lives in the right sidebar and updates as you switch files or edit.

## Settings

**Settings → File Metadata**

### File

| Setting | Default | Description |
|---|---|---|
| Show file name | On | Display the file name (click copies full path) |
| Show file path | Off | Display the full vault path |
| Show folder | On | Display the parent folder |
| Show created date | On | Creation date and time |
| Show modified date | On | Last modified date and time |
| Show file size | On | Size on disk |

### Statistics

| Setting | Default | Description |
|---|---|---|
| Show Statistics section | On | Toggle the entire section |
| Show sentences | On | Sentence count |
| Show paragraphs | On | Paragraph count |
| Show estimated pages | On | Estimated page count |
| Words per page | 300 | Used for the page estimate |

### Outline

| Setting | Default | Description |
|---|---|---|
| Show Outline section | On | Toggle the heading outline |

### Behaviour

| Setting | Default | Description |
|---|---|---|
| Click to copy | On | Click any row to copy its value |

## Attribution

Sidebar styling draws on the approach used by [Simple File Info](https://github.com/lukas-cap/obsidian-simple-file-info) (Lukas Capkovic), which uses Obsidian's built-in `tree-item` components. EXIF parsing is handled by [exifr](https://github.com/MikeKovarik/exifr) (Mike Kovařík).

## License

[MIT](LICENSE)
