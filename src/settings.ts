import { App, PluginSettingTab, Setting } from 'obsidian';
import type FileMetadataPlugin from './main';

export interface FileMetadataSettings {
  // ── File section fields ───────────────────────────
  showFileName: boolean;
  showFilePath: boolean;
  showFolder:   boolean;
  showCreated:  boolean;
  showModified: boolean;
  showSize:     boolean;

  // ── Section visibility ────────────────────────────
  showStatistics: boolean;
  showOutline:    boolean;

  // ── Statistics field visibility ───────────────────
  showSentences:      boolean;
  showParagraphs:     boolean;
  showEstimatedPages: boolean;
  wordsPerPage:       number;

  // ── Behaviour ─────────────────────────────────────
  clickToCopy: boolean;
}

export const DEFAULT_SETTINGS: FileMetadataSettings = {
  showFileName: true,
  showFilePath: false,
  showFolder:   true,
  showCreated:  true,
  showModified: true,
  showSize:     true,

  showStatistics: true,
  showOutline:    true,

  showSentences:      true,
  showParagraphs:     true,
  showEstimatedPages: true,
  wordsPerPage:       300,

  clickToCopy: true,
};

export class FileMetadataSettingTab extends PluginSettingTab {
  plugin: FileMetadataPlugin;

  constructor(app: App, plugin: FileMetadataPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── File section ─────────────────────────────────────────────────────────

    containerEl.createEl('h3', { text: 'File section' });

    new Setting(containerEl)
      .setName('Show file name')
      .setDesc('Display the file name. Clicking copies the full vault path.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showFileName)
        .onChange(async v => { this.plugin.settings.showFileName = v; await this.save(); }));

    new Setting(containerEl)
      .setName('Show file path')
      .setDesc('Display the full vault path to the file.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showFilePath)
        .onChange(async v => { this.plugin.settings.showFilePath = v; await this.save(); }));

    new Setting(containerEl)
      .setName('Show folder')
      .setDesc('Display the folder containing the current file.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showFolder)
        .onChange(async v => { this.plugin.settings.showFolder = v; await this.save(); }));

    new Setting(containerEl)
      .setName('Show created date')
      .setDesc('Display the file creation date and time.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showCreated)
        .onChange(async v => { this.plugin.settings.showCreated = v; await this.save(); }));

    new Setting(containerEl)
      .setName('Show modified date')
      .setDesc('Display the last modification date and time.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showModified)
        .onChange(async v => { this.plugin.settings.showModified = v; await this.save(); }));

    new Setting(containerEl)
      .setName('Show file size')
      .setDesc('Display the file size on disk.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showSize)
        .onChange(async v => { this.plugin.settings.showSize = v; await this.save(); }));

    // ── Statistics ────────────────────────────────────────────────────────────

    containerEl.createEl('h3', { text: 'Statistics' });

    new Setting(containerEl)
      .setName('Show Statistics section')
      .setDesc('Display word count, character count, and other text statistics.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showStatistics)
        .onChange(async v => {
          this.plugin.settings.showStatistics = v;
          await this.save();
          // Refresh to show/hide child settings
          this.display();
        }));

    const statsEnabled = this.plugin.settings.showStatistics;

    const sentSetting = new Setting(containerEl)
      .setName('Show sentences')
      .setDesc('Include sentence count in statistics.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showSentences)
        .onChange(async v => { this.plugin.settings.showSentences = v; await this.save(); }));
    if (!statsEnabled) sentSetting.setDisabled(true);

    const paraSetting = new Setting(containerEl)
      .setName('Show paragraphs')
      .setDesc('Include paragraph count in statistics.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showParagraphs)
        .onChange(async v => { this.plugin.settings.showParagraphs = v; await this.save(); }));
    if (!statsEnabled) paraSetting.setDisabled(true);

    const pagesSetting = new Setting(containerEl)
      .setName('Show estimated pages')
      .setDesc('Display an estimated page count based on word count.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showEstimatedPages)
        .onChange(async v => {
          this.plugin.settings.showEstimatedPages = v;
          await this.save();
          this.display();
        }));
    if (!statsEnabled) pagesSetting.setDisabled(true);

    const wppEnabled = statsEnabled && this.plugin.settings.showEstimatedPages;
    const wppSetting = new Setting(containerEl)
      .setName('Words per page')
      .setDesc('Number of words per page used to calculate estimated page count. Default: 300.')
      .addText(t => t
        .setPlaceholder('300')
        .setValue(String(this.plugin.settings.wordsPerPage))
        .onChange(async v => {
          const n = parseInt(v, 10);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.wordsPerPage = n;
            await this.save();
          }
        }));
    if (!wppEnabled) wppSetting.setDisabled(true);

    // ── Outline ───────────────────────────────────────────────────────────────

    containerEl.createEl('h3', { text: 'Outline' });

    new Setting(containerEl)
      .setName('Show Outline section')
      .setDesc('Display a clickable heading outline for the current note.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showOutline)
        .onChange(async v => { this.plugin.settings.showOutline = v; await this.save(); }));

    // ── Behaviour ─────────────────────────────────────────────────────────────

    containerEl.createEl('h3', { text: 'Behaviour' });

    new Setting(containerEl)
      .setName('Click row to copy value')
      .setDesc('Clicking any row in the panel copies its value to the clipboard.')
      .addToggle(t => t
        .setValue(this.plugin.settings.clickToCopy)
        .onChange(async v => { this.plugin.settings.clickToCopy = v; await this.save(); }));
  }

  private async save(): Promise<void> {
    await this.plugin.saveSettings();
  }
}
