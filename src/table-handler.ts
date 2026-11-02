import { Notice, Plugin, setIcon } from 'obsidian';
import { CopycelSettings } from './types';

const ICON_SIZE = 22;
const ICON_INSET = 4;

export class TableHandler {
	private currentCell: HTMLTableCellElement | null = null;
	private icon: HTMLSpanElement | null = null;

	constructor(
		private readonly plugin: Plugin,
		private settings: CopycelSettings,
	) {}

	updateSettings(settings: CopycelSettings): void {
		this.settings = settings;
	}

	start(): void {
		this.plugin.registerDomEvent(document, 'pointerdown', (evt) => this.blockEditorFocus(evt), true);
		this.plugin.registerDomEvent(document, 'mousedown', (evt) => this.blockEditorFocus(evt), true);
		this.plugin.registerDomEvent(document, 'click', (evt) => this.onClick(evt));
		this.plugin.registerDomEvent(document, 'mouseover', (evt) => this.onHover(evt));
		this.plugin.registerDomEvent(document, 'mouseout', (evt) => this.onLeave(evt));
		this.plugin.registerDomEvent(window, 'scroll', () => this.positionIcon(), true);
		this.plugin.register(() => this.hideIcon());
	}

	private blockEditorFocus(evt: Event): void {
		const target = this.eventElement(evt);
		if (!target || !this.isCopyIcon(target)) return;
		evt.preventDefault();
		evt.stopPropagation();
	}

	private onClick(evt: MouseEvent): void {
		const target = this.eventElement(evt);
		if (!target || !this.isCopyIcon(target) || !this.currentCell) return;

		evt.preventDefault();
		evt.stopPropagation();
		void this.copyCellValue(this.currentCell);
	}

	private onHover(evt: MouseEvent): void {
		const target = this.eventElement(evt);
		if (!target || this.isCopyIcon(target)) return;

		const cell = target.closest('td, th');
		if (!(cell instanceof HTMLTableCellElement) || !this.isNoteCell(cell)) {
			this.hideIcon();
			return;
		}

		if (this.currentCell === cell) return;
		this.showCopyIcon(cell);
	}

	private onLeave(evt: MouseEvent): void {
		const target = this.eventElement(evt);
		if (!target) return;

		const related = evt.relatedTarget instanceof Element ? evt.relatedTarget : null;
		if (related && (this.isCopyIcon(related) || this.isInsideCurrentCell(related))) return;

		const leftIcon = this.isCopyIcon(target);
		const leftCell = target.closest('td, th') === this.currentCell;
		if (leftIcon || leftCell) this.hideIcon();
	}

	private showCopyIcon(cell: HTMLTableCellElement): void {
		if (!cell.innerText.trim()) {
			this.hideIcon();
			return;
		}

		const doc = cell.ownerDocument;
		if (!this.icon || this.icon.ownerDocument !== doc) {
			this.icon?.remove();
			this.icon = doc.body.createSpan({
				cls: 'copycel-cell-copy-icon',
				attr: {
					'aria-label': 'Copy cell value',
					role: 'button',
					title: 'Copy cell value',
				},
			});
			setIcon(this.icon, 'copy');
		}

		this.currentCell = cell;
		this.positionIcon();
	}

	private positionIcon(): void {
		const icon = this.icon;
		const cell = this.currentCell;
		if (!icon || !cell) return;
		if (!cell.isConnected) {
			this.hideIcon();
			return;
		}

		const rect = cell.getBoundingClientRect();
		const visible = this.isCellVisible(cell, rect);
		icon.toggleClass('is-hidden', !visible);
		if (!visible) return;

		icon.style.setProperty('--copycel-top', `${Math.round(rect.top + ICON_INSET)}px`);
		icon.style.setProperty('--copycel-left', `${Math.round(rect.right - ICON_INSET - ICON_SIZE)}px`);
	}

	private hideIcon(): void {
		this.icon?.remove();
		this.icon = null;
		this.currentCell = null;
	}

	private async copyCellValue(cell: HTMLTableCellElement): Promise<void> {
		const cellText = cell.innerText.trim();
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
		this.flashCell(cell);
	}

	private flashCell(cell: HTMLTableCellElement): void {
		const rect = cell.getBoundingClientRect();
		const overlay = cell.ownerDocument.body.createDiv({ cls: 'copycel-flash' });
		overlay.style.setProperty('--copycel-top', `${Math.round(rect.top)}px`);
		overlay.style.setProperty('--copycel-left', `${Math.round(rect.left)}px`);
		overlay.style.setProperty('--copycel-width', `${Math.round(rect.width)}px`);
		overlay.style.setProperty('--copycel-height', `${Math.round(rect.height)}px`);
		window.setTimeout(() => overlay.remove(), 500);
	}

	private isCellVisible(cell: HTMLTableCellElement, rect: DOMRect): boolean {
		if (rect.width === 0 || rect.height === 0) return false;
		const scroller = cell.closest('.cm-scroller, .markdown-preview-view');
		if (!(scroller instanceof HTMLElement)) return true;

		const bounds = scroller.getBoundingClientRect();
		return rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > bounds.left && rect.left < bounds.right;
	}

	private eventElement(evt: Event): Element | null {
		return evt.target instanceof Element ? evt.target : null;
	}

	private isCopyIcon(el: Element): boolean {
		return el.closest('.copycel-cell-copy-icon') !== null;
	}

	private isInsideCurrentCell(el: Element): boolean {
		return this.currentCell !== null && el.closest('td, th') === this.currentCell;
	}

	private isNoteCell(cell: HTMLTableCellElement): boolean {
		return cell.closest('.markdown-preview-view, .markdown-source-view') !== null;
	}
}
