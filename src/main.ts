import { Plugin } from 'obsidian';
import { CopycelSettingTab } from './settings';
import { TableHandler } from './table-handler';
import { CopycelSettings, DEFAULT_SETTINGS } from './types';

export default class CopycelPlugin extends Plugin {
	settings!: CopycelSettings;
	private tableHandler: TableHandler | null = null;

	async onload() {
		await this.loadSettings();

		this.tableHandler = new TableHandler(this, this.settings);
		this.tableHandler.start();
		this.addSettingTab(new CopycelSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<CopycelSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.tableHandler?.updateSettings(this.settings);
	}
}
