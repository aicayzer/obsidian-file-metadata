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
  dateFormat:   'short' | 'long' | 'relative';

  // ── Section visibility ────────────────────────────
  showStatistics: boolean;
  showDetails:    boolean;
  showOutline:    boolean;

  // ── Details field visibility ─────────────────────
  showTags:       boolean;
  showBacklinks:      boolean;
  showOutgoingLinks:  boolean;
  showProperties: boolean;

  // ── Statistics field visibility ───────────────────
  showSentences:      boolean;
  showParagraphs:     boolean;
  showEstimatedPages: boolean;
  wordsPerPage:       number;
  showReadingTime:    boolean;
  readingWpm:         number;
  showReadability:    boolean;
  showLinks:          boolean;
  showCodeBlocks:     boolean;

  // ── Behaviour ─────────────────────────────────────
  clickToCopy:      boolean;
  folderCopyFormat: 'path' | 'uri';
}

export const DEFAULT_SETTINGS: FileMetadataSettings = {
  showFileName: true,
  showFilePath: false,
  showFolder:   true,
  showCreated:  true,
  showModified: true,
  showSize:     true,
  dateFormat:   'short',

  showStatistics: true,
  showDetails:    true,
  showOutline:    true,

  showTags:       true,
  showBacklinks:      true,
  showOutgoingLinks:  true,
  showProperties: true,

  showSentences:      true,
  showParagraphs:     true,
  showEstimatedPages: true,
  wordsPerPage:       300,
  showReadingTime:    true,
  readingWpm:         200,
  showReadability:    false,
  showLinks:          false,
  showCodeBlocks:     false,

  clickToCopy:      true,
  folderCopyFormat: 'path',
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

    new Setting(containerEl).setName("File").setHeading();

    new Setting(containerEl)
      .setName('Show file name')
      .setDesc('Display the file name. Clicking copies the full file path.')
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

    new Setting(containerEl)
      .setName('Date format')
      .setDesc('Choose between short, long, or relative formatting for dates and times.')
      .addDropdown(d => d
        .addOption('short', 'Short')
        .addOption('long', 'Long')
        .addOption('relative', 'Relative')
        .setValue(this.plugin.settings.dateFormat)
        .onChange(async v => {
          this.plugin.settings.dateFormat = v as 'short' | 'long' | 'relative';
          await this.save();
        }));

    new Setting(containerEl)
      .setName('Folder click copies')
      .setDesc('Choose what is copied when you click the folder row.')
      .addDropdown(d => d
        .addOption('path', 'Vault path')
        .addOption('uri', 'Obsidian link')
        .setValue(this.plugin.settings.folderCopyFormat)
        .onChange(async v => {
          this.plugin.settings.folderCopyFormat = v as 'path' | 'uri';
          await this.save();
        }));

    // ── Details ─────────────────────────────────────────────────────────────

    new Setting(containerEl).setName("Details").setHeading();

    new Setting(containerEl)
      .setName('Show details section')
      .setDesc('Display tags, backlinks, and frontmatter properties.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showDetails)
        .onChange(async v => {
          this.plugin.settings.showDetails = v;
          await this.save();
          this.display();
        }));

    const detailsEnabled = this.plugin.settings.showDetails;

    const tagsSetting = new Setting(containerEl)
      .setName('Show tags')
      .setDesc('Display frontmatter and inline tags.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showTags)
        .onChange(async v => { this.plugin.settings.showTags = v; await this.save(); }));
    if (!detailsEnabled) tagsSetting.setDisabled(true);

    const backlinksSetting = new Setting(containerEl)
      .setName('Show backlinks count')
      .setDesc('Number of other notes that link to this file.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showBacklinks)
        .onChange(async v => { this.plugin.settings.showBacklinks = v; await this.save(); }));
    if (!detailsEnabled) backlinksSetting.setDisabled(true);

    const outgoingLinksSetting = new Setting(containerEl)
      .setName('Show outgoing links count')
      .setDesc('Number of other notes this file links to.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showOutgoingLinks)
        .onChange(async v => { this.plugin.settings.showOutgoingLinks = v; await this.save(); }));
    if (!detailsEnabled) outgoingLinksSetting.setDisabled(true);

    const propsSetting = new Setting(containerEl)
      .setName('Show properties')
      .setDesc('Display all frontmatter properties as key-value rows.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showProperties)
        .onChange(async v => { this.plugin.settings.showProperties = v; await this.save(); }));
    if (!detailsEnabled) propsSetting.setDisabled(true);

    // ── Statistics ────────────────────────────────────────────────────────────

    new Setting(containerEl).setName("Statistics").setHeading();

    new Setting(containerEl)
      .setName('Show statistics section')
      .setDesc('Display word count, character count, and other text statistics.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showStatistics)
        .onChange(async v => {
          this.plugin.settings.showStatistics = v;
          await this.save();
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
      .setDesc('Number of words used to calculate one estimated page. Default: 300.')
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

    const rtSetting = new Setting(containerEl)
      .setName('Show reading time')
      .setDesc('Estimated reading time based on word count.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showReadingTime)
        .onChange(async v => {
          this.plugin.settings.showReadingTime = v;
          await this.save();
          this.display();
        }));
    if (!statsEnabled) rtSetting.setDisabled(true);

    const rtWpmEnabled = statsEnabled && this.plugin.settings.showReadingTime;
    const rtWpmSetting = new Setting(containerEl)
      .setName('Reading speed (wpm)')
      .setDesc('Words per minute used for reading time estimate. Default: 200.')
      .addText(t => t
        .setPlaceholder('200')
        .setValue(String(this.plugin.settings.readingWpm))
        .onChange(async v => {
          const n = parseInt(v, 10);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.readingWpm = n;
            await this.save();
          }
        }));
    if (!rtWpmEnabled) rtWpmSetting.setDisabled(true);

    const readabilitySetting = new Setting(containerEl)
      .setName('Show readability score')
      .setDesc('Flesch reading ease score (0–100). Higher means easier to read.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showReadability)
        .onChange(async v => { this.plugin.settings.showReadability = v; await this.save(); }));
    if (!statsEnabled) readabilitySetting.setDisabled(true);

    const linksSetting = new Setting(containerEl)
      .setName('Show link counts')
      .setDesc('Count of internal ([[wikilinks]]) and external links.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showLinks)
        .onChange(async v => { this.plugin.settings.showLinks = v; await this.save(); }));
    if (!statsEnabled) linksSetting.setDisabled(true);

    const codeBlocksSetting = new Setting(containerEl)
      .setName('Show code block count')
      .setDesc('Number of fenced code blocks in the document.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showCodeBlocks)
        .onChange(async v => { this.plugin.settings.showCodeBlocks = v; await this.save(); }));
    if (!statsEnabled) codeBlocksSetting.setDisabled(true);

    // ── Outline ───────────────────────────────────────────────────────────────

    new Setting(containerEl).setName("Outline").setHeading();

    new Setting(containerEl)
      .setName('Show outline section')
      .setDesc('Display a clickable heading outline for the current note.')
      .addToggle(t => t
        .setValue(this.plugin.settings.showOutline)
        .onChange(async v => { this.plugin.settings.showOutline = v; await this.save(); }));

    // ── Behaviour ─────────────────────────────────────────────────────────────

    new Setting(containerEl).setName("Behaviour").setHeading();

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
