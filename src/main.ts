import { Plugin, WorkspaceLeaf } from 'obsidian';
import { FileMetadataView, VIEW_TYPE_FILE_METADATA } from './FileMetadataView';
import {
  DEFAULT_SETTINGS,
  FileMetadataSettingTab,
  FileMetadataSettings,
} from './settings';

export default class FileMetadataPlugin extends Plugin {
  settings!: FileMetadataSettings;
  /** Per-session collapsed state for panel sections (not persisted). */
  collapsedSections: Record<string, boolean> = {};
  private refreshTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register the sidebar view
    this.registerView(
      VIEW_TYPE_FILE_METADATA,
      (leaf: WorkspaceLeaf) => new FileMetadataView(leaf, this)
    );

    // Ribbon icon
    this.addRibbonIcon('info', 'File Metadata', () => this.activateView());

    // Command palette entry
    this.addCommand({
      id: 'open-file-metadata',
      name: 'Open File Metadata panel',
      callback: () => this.activateView(),
    });

    // Settings tab
    this.addSettingTab(new FileMetadataSettingTab(this.app, this));

    // Re-render when the active file changes
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.refreshViews())
    );

    // Re-render (debounced) when the active file is modified
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        const active = this.app.workspace.getActiveFile();
        if (active && file.path === active.path) {
          this.scheduleRefresh();
        }
      })
    );

    // Re-render when the metadata cache updates (heading changes, etc.)
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        const active = this.app.workspace.getActiveFile();
        if (active && file.path === active.path) {
          this.refreshViews();
        }
      })
    );

    // Initial render once the workspace layout is ready
    this.app.workspace.onLayoutReady(() => this.refreshViews());
  }

  onunload(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.refreshViews();
  }

  refreshViews(): void {
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_FILE_METADATA)
      .forEach((leaf) => {
        if (leaf.view instanceof FileMetadataView) {
          leaf.view.render();
        }
      });
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      this.refreshViews();
    }, 800);
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILE_METADATA);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;

    await leaf.setViewState({ type: VIEW_TYPE_FILE_METADATA, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
