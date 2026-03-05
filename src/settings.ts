import { App, PluginSettingTab, Setting } from 'obsidian';
import type FileMetadataPlugin from './main';

export interface FileMetadataSettings {
  wordsPerPage: number;
}

export const DEFAULT_SETTINGS: FileMetadataSettings = {
  wordsPerPage: 300,
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

    new Setting(containerEl)
      .setName('Words per page')
      .setDesc('Used to calculate the estimated page count. Default is 300.')
      .addText(text =>
        text
          .setPlaceholder('300')
          .setValue(String(this.plugin.settings.wordsPerPage))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.wordsPerPage = parsed;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
