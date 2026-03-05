import { HeadingCache, ItemView, TFile, WorkspaceLeaf } from 'obsidian';
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
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif',
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

// ── View ───────────────────────────────────────────────────────────────────

export class FileMetadataView extends ItemView {
  plugin: FileMetadataPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: FileMetadataPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_FILE_METADATA;
  }

  getDisplayText(): string {
    return 'File Metadata';
  }

  getIcon(): string {
    return 'info';
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async render(): Promise<void> {
    // children[1] is the content pane; children[0] is the view header
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('fm-view');

    const file = this.app.workspace.getActiveFile();
    if (!file) {
      root.createDiv({ cls: 'fm-empty', text: 'No file open.' });
      return;
    }

    const container = root.createDiv({ cls: 'fm-container' });
    const ext = file.extension.toLowerCase();

    // ── File section ───────────────────────────────────────────────────────
    this.renderSection(container, 'File', [
      { label: 'File name', value: file.name },
      { label: 'Vault path', value: file.path },
      { label: 'Created',   value: formatDate(file.stat.ctime) },
      { label: 'Modified',  value: formatDate(file.stat.mtime) },
      { label: 'Size',      value: formatSize(file.stat.size)  },
    ]);

    // ── Image branch ───────────────────────────────────────────────────────
    if (IMAGE_EXTENSIONS.has(ext)) {
      const dims = await this.loadImageDimensions(file);
      if (dims) {
        this.renderDivider(container);
        this.renderSection(container, 'Image', [
          { label: 'Dimensions', value: `${dims.width} × ${dims.height} px` },
        ]);
      }
      return;
    }

    // ── Text statistics (markdown and plain text only) ─────────────────────
    if (!TEXT_EXTENSIONS.has(ext)) return;

    let raw = '';
    try {
      raw = await this.app.vault.read(file);
    } catch {
      return;
    }

    const words      = countWords(raw);
    const chars      = countCharacters(raw);
    const sentences  = countSentences(raw);
    const paragraphs = countParagraphs(raw);
    const pages      = estimatePages(words, this.plugin.settings.wordsPerPage);

    this.renderDivider(container);
    this.renderSection(container, 'Statistics', [
      { label: 'Words',      value: fmt(words)      },
      { label: 'Characters', value: fmt(chars)      },
      { label: 'Sentences',  value: fmt(sentences)  },
      { label: 'Paragraphs', value: fmt(paragraphs) },
      { label: 'Est. pages', value: fmt(pages)      },
    ]);

    // ── Outline (markdown only) ────────────────────────────────────────────
    if (ext === 'md') {
      const cache    = this.app.metadataCache.getFileCache(file);
      const headings = cache?.headings;
      if (headings && headings.length > 0) {
        this.renderDivider(container);
        this.renderOutline(container, headings);
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private renderSection(
    parent: HTMLElement,
    title: string,
    rows: { label: string; value: string }[]
  ): void {
    const section = parent.createDiv({ cls: 'fm-section' });
    section.createDiv({ cls: 'fm-section-header', text: title });

    for (const { label, value } of rows) {
      const row = section.createDiv({ cls: 'fm-row' });
      row.createSpan({ cls: 'fm-label', text: label });
      row.createSpan({ cls: 'fm-value', text: value });
    }
  }

  private renderDivider(parent: HTMLElement): void {
    parent.createDiv({ cls: 'fm-divider' });
  }

  private renderOutline(parent: HTMLElement, headings: HeadingCache[]): void {
    const section = parent.createDiv({ cls: 'fm-section' });
    section.createDiv({ cls: 'fm-section-header', text: 'Outline' });

    const minLevel = Math.min(...headings.map(h => h.level));

    for (const heading of headings) {
      const indent = (heading.level - minLevel) * 12;
      const item = section.createDiv({ cls: 'fm-outline-item' });
      item.style.paddingLeft = `${indent}px`;
      item.setText(heading.heading);
      item.addEventListener('click', () => this.navigateTo(heading));
    }
  }

  private navigateTo(heading: HeadingCache): void {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;

    const leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf) return;

    const line = heading.position.start.line;
    // @ts-ignore — editor is available on MarkdownView but not typed on View
    const editor = leaf.view?.editor;
    if (editor) {
      editor.setCursor({ line, ch: 0 });
      editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
      leaf.view.containerEl.focus();
    }
  }

  private loadImageDimensions(
    file: TFile
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const src = this.app.vault.getResourcePath(file);
      const img = new Image();
      img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
}
