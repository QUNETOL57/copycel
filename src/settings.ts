import { App, PluginSettingTab, Setting } from 'obsidian';
import CopycelPlugin from './main';

export class CopycelSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: CopycelPlugin) {
		super(app, plugin);
	}

	// Obsidian 1.13.0 and later renders this and skips display().
	getSettingDefinitions() {
		return [
			{
				name: 'Show notification',
				desc: 'Show a notice after a cell value is copied.',
				control: { type: 'toggle' as const, key: 'showNotification' },
			},
		];
	}

	// Keeps table-handler state in sync when the declarative API writes a setting.
	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key !== 'showNotification' || typeof value !== 'boolean') return;

		this.plugin.settings.showNotification = value;
		await this.plugin.saveSettings();
	}

	// Obsidian before 1.13.0 calls display().
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Show notification')
			.setDesc('Show a notice after a cell value is copied.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showNotification)
					.onChange(async (value) => {
						this.plugin.settings.showNotification = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
