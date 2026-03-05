import { HeadingCache, ItemView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import exifr from 'exifr';
import type FileMetadataPlugin from './main';
import {
  countCharacters,
  countParagraphs,
  countSentences,
  countWords,
  estimatePages,
} from './stats';

export const VIEW_TYPE_FILE_METADATA = 'file-metadata';

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif', 'tiff', 'tif',
]);

const TEXT_EXTENSIONS = new Set([
  'md', 'txt', 'csv', 'json', 'yaml', 'yml', 'toml', 'html', 'css', 'js', 'ts',
]);

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// ── View ───────────────────────────────────────────────────────────────────

export class FileMetadataView extends ItemView {
  plugin: FileMetadataPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: FileMetadataPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_FILE_METADATA; }
  getDisplayText(): string { return 'File Metadata'; }
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
    const fileRows: { label: string; value: string; copyValue?: string }[] = [];
    if (s.showFileName) {
      fileRows.push({ label: 'File name', value: file.name, copyValue: file.path });
    }
    if (s.showFilePath) {
      fileRows.push({ label: 'File path', value: file.path });
    }
    if (s.showFolder) {
      fileRows.push({ label: 'Folder', value: file.parent?.path || '/' });
    }
    if (s.showCreated) {
      fileRows.push({ label: 'Created', value: formatDate(file.stat.ctime) });
    }
    if (s.showModified) {
      fileRows.push({ label: 'Modified', value: formatDate(file.stat.mtime) });
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

      const words      = countWords(raw);
      const chars      = countCharacters(raw);
      const statsRows: { label: string; value: string }[] = [
        { label: 'Words',      value: fmt(words) },
        { label: 'Characters', value: fmt(chars)  },
      ];
      if (s.showSentences)      statsRows.push({ label: 'Sentences',  value: fmt(countSentences(raw))  });
      if (s.showParagraphs)     statsRows.push({ label: 'Paragraphs', value: fmt(countParagraphs(raw)) });
      if (s.showEstimatedPages) statsRows.push({ label: 'Est. pages', value: fmt(estimatePages(words, s.wordsPerPage)) });

      this.renderDivider(pane);
      this.renderSection(pane, 'Statistics', statsRows);
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
   * Each row is optionally clickable (copies value to clipboard).
   */
  private renderSection(
    parent: HTMLElement,
    title: string,
    rows: { label: string; value: string; copyValue?: string }[]
  ): void {
    // Header
    parent
      .createDiv({ cls: 'tree-item fm-header' })
      .createDiv({ cls: 'tree-item-self' })
      .createDiv({ cls: 'tree-item-inner', text: title });

    // Rows
    for (const { label, value, copyValue } of rows) {
      const row  = parent.createDiv({ cls: 'tree-item' });
      const self = row.createDiv({ cls: 'tree-item-self' + (this.plugin.settings.clickToCopy ? ' is-clickable' : '') });
      self.createDiv({ cls: 'tree-item-inner', text: label });
      const flair = self.createDiv({ cls: 'tree-item-flair-outer' })
                        .createSpan({ cls: 'tree-item-flair', text: value });
      flair.title = value;

      if (this.plugin.settings.clickToCopy) {
        const textToCopy = copyValue ?? value;
        self.addEventListener('click', async () => {
          await navigator.clipboard.writeText(textToCopy);
          new Notice(`Copied ${label.toLowerCase()}`);
        });
      }
    }
  }

  private renderDivider(parent: HTMLElement): void {
    parent.createDiv({ cls: 'fm-divider' });
  }

  private renderOutline(parent: HTMLElement, headings: HeadingCache[]): void {
    // Header
    parent
      .createDiv({ cls: 'tree-item fm-header' })
      .createDiv({ cls: 'tree-item-self' })
      .createDiv({ cls: 'tree-item-inner', text: 'Outline' });

    const outline = parent.createDiv({ cls: 'fm-outline' });
    const minLevel = Math.min(...headings.map(h => h.level));

    for (const heading of headings) {
      const indent = (heading.level - minLevel) * 12;
      const row  = outline.createDiv({ cls: 'tree-item' });
      const self = row.createDiv({ cls: 'tree-item-self is-clickable' });
      // Logical property (supports RTL), offset from base padding
      self.style.paddingInlineStart = `calc(var(--size-4-2) + ${indent}px)`;
      self.createDiv({ cls: 'tree-item-inner', text: heading.heading });
      self.addEventListener('click', () => this.navigateTo(heading));
    }
  }

  private navigateTo(heading: HeadingCache): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf) return;
    const line = heading.position.start.line;
    // @ts-ignore — editor is typed on MarkdownView but not the base View
    const editor = leaf.view?.editor;
    if (editor) {
      editor.setCursor({ line, ch: 0 });
      editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
      leaf.view.containerEl.focus();
    }
  }

  /**
   * Load image metadata.
   * Primary: exifr for EXIF-bearing formats (JPEG, PNG, WebP, AVIF, HEIC, TIFF).
   * Dimensions fallback: HTML Image element (works for all formats including SVG/BMP).
   */
  private async loadImageMetadata(
    file: TFile,
    ext: string
  ): Promise<{ label: string; value: string }[]> {
    const rows: { label: string; value: string }[] = [];

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
      // Avoid duplicating brand name when model already starts with it
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
