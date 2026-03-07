import { CachedMetadata, HeadingCache, ItemView, MarkdownView, Menu, Notice, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import exifr from 'exifr';
import type FileMetadataPlugin from './main';
import {
  countCharacters,
  countCodeBlocks,
  countExternalLinks,
  countInternalLinks,
  countParagraphs,
  countSentences,
  countWords,
  estimatePages,
  estimateReadingTime,
  fleschLabel,
  fleschReadingEase,
} from './stats';

export const VIEW_TYPE_FILE_METADATA = 'file-metadata';

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif', 'tiff', 'tif',
]);

const TEXT_EXTENSIONS = new Set([
  'md', 'txt', 'csv', 'json', 'yaml', 'yml', 'toml', 'html', 'css', 'js', 'ts',
]);

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(ts: number, format: 'short' | 'long' | 'relative'): string {
  const d = new Date(ts);
  if (format === 'relative') return formatRelativeDate(d);
  if (format === 'long') {
    return d.toLocaleString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  // 'short'
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRelativeDate(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

/** Normalise a ColorSpace number or string to a readable label. */
function formatColorSpace(cs: unknown): string | null {
  if (cs === 1 || cs === '1') return 'sRGB';
  if (cs === 2 || cs === 'uncalibrated' || cs === 'Uncalibrated') return 'Uncalibrated';
  if (typeof cs === 'string' && cs.trim()) return cs.trim();
  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Row {
  label: string;
  value: string;
  copyValue?: string;
}

// ── View ───────────────────────────────────────────────────────────────────

export class FileMetadataView extends ItemView {
  plugin: FileMetadataPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: FileMetadataPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_FILE_METADATA; }
  getDisplayText(): string { return 'File metadata'; }
  getIcon(): string { return 'info'; }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async render(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('fm-view');

    const file = this.app.workspace.getActiveFile();
    if (!file) {
      root.createDiv({ cls: 'fm-empty', text: 'No file open.' });
      return;
    }

    const pane = root.createDiv({ cls: 'fm-pane fm-container' });
    const ext = file.extension.toLowerCase();
    const s = this.plugin.settings;

    // ── File section ───────────────────────────────────────────────────────
    const fileRows: Row[] = [];
    if (s.showFileName) {
      fileRows.push({ label: 'Name', value: file.name, copyValue: this.getFullPath(file) });
    }
    if (s.showFilePath) {
      fileRows.push({ label: 'File path', value: file.path });
    }
    if (s.showFolder) {
      const folderPath = file.parent?.path || '/';
      const folderCopy = s.folderCopyFormat === 'uri'
        ? `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${encodeURIComponent(folderPath)}`
        : folderPath;
      fileRows.push({ label: 'Folder', value: folderPath, copyValue: folderCopy });
    }
    if (s.showCreated) {
      fileRows.push({ label: 'Created', value: formatDate(file.stat.ctime, s.dateFormat) });
    }
    if (s.showModified) {
      fileRows.push({ label: 'Modified', value: formatDate(file.stat.mtime, s.dateFormat) });
    }
    if (s.showSize) {
      fileRows.push({ label: 'Size', value: formatSize(file.stat.size) });
    }

    this.renderSection(pane, 'File', fileRows);

    // ── Image branch ───────────────────────────────────────────────────────
    if (IMAGE_EXTENSIONS.has(ext)) {
      const meta = await this.loadImageMetadata(file, ext);
      if (meta.length > 0) {
        this.renderDivider(pane);
        this.renderSection(pane, 'Image', meta);
      }
      return;
    }

    // ── Text statistics ────────────────────────────────────────────────────
    if (!TEXT_EXTENSIONS.has(ext)) return;

    if (s.showStatistics) {
      let raw = '';
      try { raw = await this.app.vault.read(file); } catch { return; }

      const words = countWords(raw);
      const chars = countCharacters(raw);
      const statsRows: Row[] = [
        { label: 'Words',      value: fmt(words) },
        { label: 'Characters', value: fmt(chars) },
      ];
      if (s.showSentences)      statsRows.push({ label: 'Sentences',    value: fmt(countSentences(raw)) });
      if (s.showParagraphs)     statsRows.push({ label: 'Paragraphs',   value: fmt(countParagraphs(raw)) });
      if (s.showEstimatedPages) statsRows.push({ label: 'Est. pages',   value: fmt(estimatePages(words, s.wordsPerPage)) });
      if (s.showReadingTime)    statsRows.push({ label: 'Reading time', value: estimateReadingTime(words, s.readingWpm) });
      if (s.showReadability) {
        const score = fleschReadingEase(raw);
        statsRows.push({ label: 'Readability', value: `${score} — ${fleschLabel(score)}` });
      }
      if (s.showLinks) {
        statsRows.push({ label: 'Links (int)', value: fmt(countInternalLinks(raw)) });
        statsRows.push({ label: 'Links (ext)', value: fmt(countExternalLinks(raw)) });
      }
      if (s.showCodeBlocks) {
        statsRows.push({ label: 'Code blocks', value: fmt(countCodeBlocks(raw)) });
      }

      this.renderDivider(pane);
      this.renderSection(pane, 'Statistics', statsRows);
    }

    // ── Details (markdown only) ─────────────────────────────────────────────
    if (s.showDetails && ext === 'md') {
      const cache = this.app.metadataCache.getFileCache(file);
      const detailRows: Row[] = [];

      if (s.showTags) {
        const tags = this.collectTags(cache);
        if (tags.length > 0) {
          detailRows.push({ label: 'Tags', value: tags.join(', ') });
        }
      }

      if (s.showBacklinks) {
        detailRows.push({ label: 'Backlinks', value: fmt(this.countBacklinks(file)) });
      }

      if (s.showProperties && cache?.frontmatter) {
        const skip = new Set<string>(['position']);
        if (s.showTags) { skip.add('tags'); skip.add('tag'); }
        for (const [key, val] of Object.entries(cache.frontmatter)) {
          if (skip.has(key) || val === null || val === undefined) continue;
          detailRows.push({
            label: this.formatPropertyLabel(key),
            value: this.formatPropertyValue(val),
          });
        }
      }

      if (detailRows.length > 0) {
        this.renderDivider(pane);
        this.renderSection(pane, 'Details', detailRows);
      }
    }

    // ── Outline (markdown only) ────────────────────────────────────────────
    if (s.showOutline && ext === 'md') {
      const headings = this.app.metadataCache.getFileCache(file)?.headings;
      if (headings && headings.length > 0) {
        this.renderDivider(pane);
        this.renderOutline(pane, headings);
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Render a titled section using Obsidian's native tree-item DOM structure.
   * Sections are collapsible — clicking the header toggles visibility.
   * Each data row is optionally clickable (copies value) and has a context menu.
   */
  private renderSection(parent: HTMLElement, title: string, rows: Row[]): void {
    const isCollapsed = this.plugin.collapsedSections[title] ?? false;

    // ── Header ──────────────────────────────────────────────────────────
    const header = parent.createDiv({ cls: 'tree-item fm-header' });
    const headerSelf = header.createDiv({ cls: 'tree-item-self is-clickable' });

    // Icon first in DOM (matches Obsidian's native tree-item structure);
    // CSS order: 1 visually pushes it to the right.
    const icon = headerSelf.createSpan({ cls: 'tree-item-icon collapse-icon' });
    setIcon(icon, 'right-triangle');
    if (!isCollapsed) icon.addClass('is-open');

    headerSelf.createDiv({ cls: 'tree-item-inner', text: title });

    headerSelf.addEventListener('click', () => {
      this.plugin.collapsedSections[title] = !isCollapsed;
      void this.render();
    });

    if (isCollapsed) return;

    // ── Rows ────────────────────────────────────────────────────────────
    for (const { label, value, copyValue } of rows) {
      const row  = parent.createDiv({ cls: 'tree-item' });
      const self = row.createDiv({
        cls: 'tree-item-self' + (this.plugin.settings.clickToCopy ? ' is-clickable' : ''),
      });
      self.createDiv({ cls: 'tree-item-inner', text: label });
      const flair = self.createDiv({ cls: 'tree-item-flair-outer' })
                        .createSpan({ cls: 'tree-item-flair', text: value });
      flair.title = value;

      const textToCopy = copyValue ?? value;

      // Left-click: copy value
      if (this.plugin.settings.clickToCopy) {
        self.addEventListener('click', () => {
          void navigator.clipboard.writeText(textToCopy).then(() => {
            new Notice(`Copied ${label.toLowerCase()}`);
          });
        });
      }

      // Right-click: context menu
      self.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menu = new Menu();
        menu.addItem(item => item
          .setTitle('Copy value')
          .setIcon('clipboard-copy')
          .onClick(() => {
            void navigator.clipboard.writeText(textToCopy).then(() => {
              new Notice(`Copied ${label.toLowerCase()}`);
            });
          }));
        menu.addItem(item => item
          .setTitle(`Copy "${label}: ${value}"`)
          .setIcon('clipboard-list')
          .onClick(() => {
            void navigator.clipboard.writeText(`${label}: ${value}`).then(() => {
              new Notice('Copied');
            });
          }));
        menu.showAtMouseEvent(e);
      });
    }
  }

  private renderDivider(parent: HTMLElement): void {
    parent.createDiv({ cls: 'fm-divider' });
  }

  private renderOutline(parent: HTMLElement, headings: HeadingCache[]): void {
    const isCollapsed = this.plugin.collapsedSections['Outline'] ?? false;

    // Header — icon first in DOM; CSS order: 1 pushes it visually right
    const header = parent.createDiv({ cls: 'tree-item fm-header' });
    const headerSelf = header.createDiv({ cls: 'tree-item-self is-clickable' });

    const icon = headerSelf.createSpan({ cls: 'tree-item-icon collapse-icon' });
    setIcon(icon, 'right-triangle');
    if (!isCollapsed) icon.addClass('is-open');

    headerSelf.createDiv({ cls: 'tree-item-inner', text: 'Outline' });

    headerSelf.addEventListener('click', () => {
      this.plugin.collapsedSections['Outline'] = !isCollapsed;
      void this.render();
    });

    if (isCollapsed) return;

    const outline = parent.createDiv({ cls: 'fm-outline' });
    const minLevel = Math.min(...headings.map(h => h.level));

    for (const heading of headings) {
      const indent = (heading.level - minLevel) * 12;
      const row  = outline.createDiv({ cls: 'tree-item' });
      const self = row.createDiv({ cls: 'tree-item-self is-clickable' });
      self.style.paddingInlineStart = `calc(var(--size-4-2) + ${indent}px)`;
      self.createDiv({ cls: 'tree-item-inner', text: heading.heading });
      self.addEventListener('click', () => this.navigateTo(heading));
    }
  }

  private navigateTo(heading: HeadingCache): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf) return;
    const line = heading.position.start.line;

    if (leaf.view instanceof MarkdownView) {
      const editor = leaf.view.editor;
      editor.setCursor({ line, ch: 0 });
      editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
      leaf.view.containerEl.focus();
    }
  }

  /** Collect tags from both frontmatter and inline usage, deduplicated. */
  private collectTags(cache: CachedMetadata | null): string[] {
    const tags = new Set<string>();

    // Frontmatter tags (may be array or single string)
    const fmTags: unknown = cache?.frontmatter?.['tags'] ?? cache?.frontmatter?.['tag'];
    if (Array.isArray(fmTags)) {
      for (const t of fmTags) tags.add(String(t));
    } else if (typeof fmTags === 'string') {
      tags.add(fmTags);
    }

    // Inline tags (#tag in body text)
    if (cache?.tags) {
      for (const t of cache.tags) {
        tags.add(t.tag.replace(/^#/, ''));
      }
    }

    return [...tags];
  }

  /** Count unique files that link to this file. */
  private countBacklinks(file: TFile): number {
    const resolved = this.app.metadataCache.resolvedLinks;
    let count = 0;
    for (const sourcePath in resolved) {
      if (resolved[sourcePath]?.[file.path]) {
        count++;
      }
    }
    return count;
  }

  /** Turn a frontmatter key into a display label: "page-count" → "Page count". */
  private formatPropertyLabel(key: string): string {
    return key
      .replace(/[-_]/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
  }

  /** Format an arbitrary frontmatter value for display. */
  private formatPropertyValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map(v => String(v)).join(', ');
    if (val instanceof Date) return val.toLocaleDateString('en-GB');
    if (typeof val === 'object') return JSON.stringify(val);
    return '';
  }

  /** Return the full filesystem path (desktop) or vault-relative path (mobile). */
  private getFullPath(file: TFile): string {
    const adapter = this.app.vault.adapter;
    if ('basePath' in adapter && typeof (adapter as Record<string, unknown>)['basePath'] === 'string') {
      return `${(adapter as Record<string, unknown>)['basePath'] as string}/${file.path}`;
    }
    return file.path;
  }

  /**
   * Load image metadata.
   * Primary: exifr for EXIF-bearing formats (JPEG, PNG, WebP, AVIF, HEIC, TIFF).
   * Dimensions fallback: HTML Image element (works for all formats including SVG/BMP).
   */
  private async loadImageMetadata(
    file: TFile,
    ext: string
  ): Promise<Row[]> {
    const rows: Row[] = [];

    // --- Attempt EXIF read ---
    let exifData: Record<string, unknown> | null = null;
    if (ext !== 'svg' && ext !== 'bmp' && ext !== 'gif') {
      try {
        const data = await this.app.vault.readBinary(file);
        exifData = await exifr.parse(data as unknown as Uint8Array, {
          tiff: true,
          xmp:  false,
          icc:  false,
          iptc: false,
        }) as Record<string, unknown> | null;
      } catch {
        // continue without EXIF
      }
    }

    // --- Dimensions ---
    let width:  number | undefined = exifData?.['ImageWidth']  as number | undefined
                                  ?? exifData?.['ExifImageWidth']  as number | undefined;
    let height: number | undefined = exifData?.['ImageHeight'] as number | undefined
                                  ?? exifData?.['ExifImageHeight'] as number | undefined;

    // Fallback to native Image element if EXIF didn't give us dimensions
    if (!width || !height) {
      const dims = await this.loadDimensions(file);
      if (dims) { width = dims.width; height = dims.height; }
    }

    if (width && height) {
      rows.push({ label: 'Dimensions', value: `${width} × ${height} px` });
    }

    // --- Color space ---
    const cs = formatColorSpace(exifData?.['ColorSpace']);
    if (cs) rows.push({ label: 'Color space', value: cs });

    // --- Camera make / model ---
    const make  = (exifData?.['Make']  as string | undefined)?.trim();
    const model = (exifData?.['Model'] as string | undefined)?.trim();
    if (make || model) {
      const camera = (make && model && !model.startsWith(make))
        ? `${make} ${model}`
        : (model ?? make ?? '');
      if (camera) rows.push({ label: 'Camera', value: camera });
    }

    return rows;
  }

  private loadDimensions(file: TFile): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = this.app.vault.getResourcePath(file);
    });
  }
}
