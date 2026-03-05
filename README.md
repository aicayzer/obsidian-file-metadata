# File Metadata

A sidebar panel for [Obsidian](https://obsidian.md) that shows file metadata, text statistics, and a document outline — all in one place, without touching your frontmatter.

---

## Features

- **File info** — file name, folder, created date/time, modified date/time, file size
- **Text statistics** — word count, character count, sentence count, paragraph count, estimated pages
- **Document outline** — clickable heading list indented by level; click to jump to any heading
- **Image info** — dimensions, color space, and camera make/model (where EXIF data is present)
- **Click to copy** — click any row to copy its value to the clipboard
- **Fully configurable** — toggle each section and individual fields on or off in Settings

---

## Installation

### Community plugins (once published)
1. Open Obsidian → **Settings → Community plugins**
2. Click **Browse** and search for **File Metadata**
3. Click **Install**, then **Enable**

### Manual install
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/aicayzer/obsidian-file-metadata/releases/latest)
2. Create the folder `.obsidian/plugins/file-metadata/` inside your vault
3. Copy the three files into that folder
4. Open Obsidian → **Settings → Community plugins** → enable **File Metadata**

---

## Usage

Click the **ⓘ** icon in the left ribbon, or run **File Metadata: Open File Metadata panel** from the command palette (`Ctrl/Cmd + P`).

The panel opens in the right sidebar and updates automatically as you switch files or edit.

---

## Settings

Open **Settings → File Metadata** to configure the panel.

### File section
| Setting | Default | Description |
|---|---|---|
| Show folder | On | Display the folder containing the current file |
| Show created date | On | Display the file creation date and time |
| Show modified date | On | Display the last modification date and time |
| Show file size | On | Display the file size on disk |

### Statistics
| Setting | Default | Description |
|---|---|---|
| Show Statistics section | On | Show or hide the entire Statistics section |
| Show sentences | On | Include sentence count |
| Show paragraphs | On | Include paragraph count |
| Show estimated pages | On | Include estimated page count |
| Words per page | 300 | Words per page used for the estimate |

### Outline
| Setting | Default | Description |
|---|---|---|
| Show Outline section | On | Show or hide the clickable heading outline |

### Behaviour
| Setting | Default | Description |
|---|---|---|
| Click row to copy value | On | Clicking any row copies its value to the clipboard |

---

## Attribution

The native sidebar look and feel is inspired by [Simple File Info](https://github.com/lukas-cap/obsidian-simple-file-info) by Lukas Capkovic, which demonstrated using Obsidian's built-in `tree-item` component for a seamless appearance.

EXIF image metadata is powered by [exifr](https://github.com/MikeKovarik/exifr) by Mike Kovařík.

---

## License

[MIT](LICENSE)
