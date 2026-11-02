import { Notice, Plugin, setIcon } from 'obsidian';
import { CopycelSettings } from './types';

export class TableHandler {
	private currentCell: HTMLTableCellElement | null = null;

	constructor(
		private readonly plugin: Plugin,
		private settings: CopycelSettings,
	) {}

	updateSettings(settings: CopycelSettings): void {
		this.settings = settings;
	}

	start(): void {
		this.plugin.registerDomEvent(document, 'click', (evt) => this.onClick(evt));
		this.plugin.registerDomEvent(document, 'mouseover', (evt) => this.onHover(evt));
		this.plugin.registerDomEvent(document, 'mouseout', (evt) => this.onLeave(evt));
	}

	private onClick(evt: MouseEvent): void {
		const target = this.eventElement(evt);
		const icon = target?.closest('.copycel-cell-copy-icon');
		if (!icon) return;

		evt.preventDefault();
		evt.stopPropagation();

		const cell = icon.closest('td, th');
		if (cell instanceof HTMLTableCellElement) {
			void this.copyCellValue(cell);
		}
	}

	private onHover(evt: MouseEvent): void {
		const target = this.eventElement(evt);
		if (!target || this.isCopyIcon(target)) return;

		const cell = target.closest('td, th');
		if (!(cell instanceof HTMLTableCellElement) || !this.isNoteCell(cell)) {
			this.removeCopyIcon();
			return;
		}

		if (this.currentCell === cell) return;
		this.showCopyIcon(cell);
	}

	private onLeave(evt: MouseEvent): void {
		const target = this.eventElement(evt);
		if (!target) return;

		const related = evt.relatedTarget instanceof Element ? evt.relatedTarget : null;
		if (related && this.isCopyIcon(related)) return;

		const cell = target.closest('td, th');
		if (!cell) return;
		if (!related?.closest('table')) this.removeCopyIcon();
	}

	private showCopyIcon(cell: HTMLTableCellElement): void {
		this.removeCopyIcon();
		if (!this.readCellValue(cell)) return;

		const icon = cell.createSpan({
			cls: 'copycel-cell-copy-icon',
			attr: {
				'aria-label': 'Copy cell value',
				role: 'button',
				title: 'Copy cell value',
			},
		});
		setIcon(icon, 'copy');
		cell.addClass('copycel-cell');
		this.currentCell = cell;
	}

	private removeCopyIcon(): void {
		this.currentCell?.removeClass('copycel-cell');
		this.currentCell = null;

		document.querySelectorAll('.copycel-cell-copy-icon').forEach((icon) => {
			const cell = icon.closest('td, th');
			if (cell instanceof HTMLElement) cell.removeClass('copycel-cell');
			icon.remove();
		});
	}

	private async copyCellValue(cell: HTMLTableCellElement): Promise<void> {
		const cellText = this.readCellValue(cell);
		if (!cellText) {
			if (this.settings.showNotification) new Notice('Cell is empty');
			return;
		}

		try {
			await navigator.clipboard.writeText(cellText);
		} catch {
			new Notice('Failed to copy to clipboard');
			return;
		}

		if (this.settings.showNotification) new Notice(`Copied ${cellText}`);

		cell.addClass('copycel-flash');
		window.setTimeout(() => cell.removeClass('copycel-flash'), 500);
	}

	private readCellValue(cell: HTMLTableCellElement): string {
		const icon = cell.querySelector('.copycel-cell-copy-icon');
		icon?.remove();
		const value = cell.innerText.trim();
		if (icon) cell.appendChild(icon);
		return value;
	}

	private eventElement(evt: Event): Element | null {
		return evt.target instanceof Element ? evt.target : null;
	}

	private isCopyIcon(el: Element): boolean {
		return el.closest('.copycel-cell-copy-icon') !== null;
	}

	private isNoteCell(cell: HTMLTableCellElement): boolean {
		return cell.closest('.markdown-preview-view, .markdown-source-view') !== null;
	}
}
