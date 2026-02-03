import $ from '../jquery';
import require from "require";
import { createPopper } from '@popperjs/core/lib/popper-lite';
import popperFlip from '@popperjs/core/lib/modifiers/flip';
import popperPreventOverflow from '@popperjs/core/lib/modifiers/preventOverflow';
import popperComputeStyles from '@popperjs/core/lib/modifiers/computeStyles';
import popperOffset from '@popperjs/core/lib/modifiers/offset';
import popperEventListeners from '@popperjs/core/lib/modifiers/eventListeners';
import { parseDataset, scrollIntoViewIfNotVisible, waitTransitionEnd } from "../utils/dom";
import { throttleRaf } from "../utils";
import fixPageHeight from "../min_height";
import pageLoader from '../ajaxify';

const ARROW_SIZE = 10;
const NS = '.popper';

const popperInstances = new Map();
let popperOpenInstances = [];
let resizeObserver;

const popperTypes = {
	custom: {},
	spoiler: {
		floating: false,
		closeOnBodyClick: false,
		autoScroll: true,
		exclusive: true,
		clickedClass: "js-clicked",
	},
	toolbar: {
		placement: "bottom-start",
		autoScroll: true,
		fixed: true,
		flip: false,
	},
	dropdown: {
		placement: "bottom-start",
		clickedClass: "js-clicked",
		autoScroll: true,
		fullWidth: true,
		padding: 0,
		offsetTop: 10,
		arrow: true,
		flip: false,
		exclusive: true,
	},
	gallery: {
		placement: "top",
		clickedClass: "js-clicked",
		autoScroll: false,
		container: "#Gallery",
		fullWidth: true,
		padding: 0,
		offsetTop: 0,
		arrow: false,
		flip: false,
		exclusive: true,
	}
};

initPopperWidget();

export class Popper {
	popperElement;
	referenceElement;
	engine;
	defaultOptions = {};
	openerOptions = {};
	options;
	ignoreBodyClick = false;

	constructor(popperElement, options = {}) {
		this.popperElement = popperElement;

		const popperType = options.type ?? this.getType();
		delete options.type;

		this.setOptions({
			floating: true,
			appendTo: undefined,
			clickedClass: "",
			placement: "auto",
			offsetLeft: 0,
			offsetTop: 0,
			autoScroll: false,
			fixed: false,
			padding: 5,
			fullWidth: false,
			container: '#siteContent',
			arrow: false,
			flip: false,
			exclusive: false,
			group: undefined,
			closeOnBodyClick: true,
			...popperTypes[popperType],
			...parsePopperOptions(this.element()),
			...options,
		});

		popperInstances.set(popperElement, this);
		this.popperElement.dataset.popperType = popperType;
		this.popperElement.addEventListener('click', () => this._startIgnoreBodyClick());
		this.popperElement.classList.add('js-popper_element');

		if (!popperElement.id)
			popperElement.id = `popper_${Date.now()}`;
	}

	id() {
		return this.popperElement.id;
	}

	isOpen() {
		return this.popperElement.dataset.popperOpen === "true";
	}

	element() {
		return this.popperElement;
	}

	content() {
		return this.popperElement.querySelector('.js-popper_content') ?? this.popperElement;
	}

	opener() {
		return this.referenceElement;
	}

	update() {
		if (!this.isOpen())
			return;
		if (this.engine)
			this.engine.update();
	}

	setOptions(options) {
		this.defaultOptions = {
			...this.defaultOptions,
			...options,
		};
		this.options = { ...this.defaultOptions, ...this.openerOptions };
	}

	open(openerOptions = {}, referenceElement = undefined) {
		if (!referenceElement)
			referenceElement = document.querySelector(`[data-popper-id="${this.element().id}"]`);
		if (!referenceElement)
			throw new Error(`No referenceElement!`);

		if (this.isOpen())
			this.close();

		this.referenceElement = referenceElement;
		if (!this._triggerEvent("beforeOpen")) {
			this.referenceElement = undefined;
			return;
		}

		this._applyOpenQuirks();

		if (this.options.exclusive) {
			for (const popperInstance of popperOpenInstances) {
				if (popperInstance.options.group == null || popperInstance.options.group !== this.options.group)
					popperInstance.close();
			}
		}

		this.openerOptions = {
			...parsePopperOptions(this.referenceElement),
			...openerOptions
		};
		this.options = { ...this.defaultOptions, ...this.openerOptions };

		this.popperElement.dataset.popperOpen = "true";
		this.referenceElement.dataset.popperOpen = "true";

		if (this.options.clickedClass)
			this.referenceElement.classList.add(this.options.clickedClass);

		if (this.options.floating)
			this._initPopperJs();

		this._triggerEvent("afterOpen");
		popperOpenInstances.push(this);

		if (this.options.autoScroll) {
			if (this.engine)
				this.engine.forceUpdate();
			scrollIntoViewIfNotVisible(this.popperElement, { start: "nearest", end: "nearest" });
		}
	}

	_initPopperJs() {
		// FIXME: ДИЧЬ
		const fixPageHeightThrottled = throttleRaf(() => fixPageHeight($(this.popperElement)));

		let offsetTop = this.options.offsetTop;
		if (this.options.arrow) {
			const computedStyles = getComputedStyle(this.referenceElement);
			const cssArrowOffset = parseFloat(computedStyles.getPropertyValue('--popper-arrow-offset') || '0');
			offsetTop += ARROW_SIZE + cssArrowOffset;
		} else {
			this.popperElement.style.setProperty('--popper-arrow-offset', '-9999px');
		}

		this.popperElement.style.setProperty('--popper-top-offset', offsetTop + 'px');

		const popperContainer = document.querySelector(this.options.container);
		const popperOptions = {
			modifiers: [
				{
					name: 'fixedOffset',
					phase: 'main',
					requires: ['popperOffsets'],
					fn({ state }) {
						state.modifiersData.popperOffsets.y = state.rects.reference.y;
					},
				},
				{
					name: 'fullWidth',
					enabled: this.options.fullWidth,
					phase: 'beforeWrite',
					fn: ({ state }) => {
						state.styles.popper.minWidth = popperContainer ? `${popperContainer.getBoundingClientRect().width}px` : "auto";
						state.styles.popper.maxWidth = state.styles.popper.minWidth;
					},
					effect: ({ state }) => {
						state.elements.popper.style.minWidth = popperContainer ? `${popperContainer.getBoundingClientRect().width}px` : "auto";
						state.elements.popper.style.maxWidth = state.elements.popper.style.minWidth;
					}
				},
				popperFlip,
				popperComputeStyles,
				popperPreventOverflow,
				popperOffset,
				popperEventListeners,
				{
					name: 'computeStyles',
					options: {
						adaptive: true,
					},
				},
				{
					name: 'preventOverflow',
					options: {
						padding: this.options.padding,
						boundary: popperContainer,
					},
				},
				{
					name: 'offset',
					options: {
						offset: [this.options.offsetLeft, offsetTop],
					}
				},
				{
					name: 'eventListeners',
					options: {
						scroll: true,
						resize: true,
					},
				},
				{
					name: 'fixedOffset',
					enabled: this.options.fixed,
				},
				{
					name: 'flip',
					enabled: this.options.flip,
				},
				{
					name: 'fixPageHeight',
					enabled: true,
					phase: 'afterWrite',
					fn() {
						fixPageHeightThrottled();
					}
				},
				{
					name: "arrow",
					enabled: this.options.arrow,
					phase: 'main',
					requires: ['computeStyles'],
					fn({ state }) {
						const basePlacement = state.placement.split('-')[0];
						const axis = ['top', 'bottom'].indexOf(basePlacement) >= 0 ? 'left' : 'top';
						const len = axis == 'left' ? 'width' : 'height';
						const referenceElemenet = state.elements.reference.querySelector('.js-popper_anchor') ?? state.elements.reference;
						const border = axis == 'left' ?
							(state.elements.popper.offsetWidth - state.elements.popper.clientWidth) / 2 :
							(state.elements.popper.offsetHeight - state.elements.popper.clientHeight) / 2;
						const popperRect = state.elements.popper.getBoundingClientRect();
						const refRect = referenceElemenet.getBoundingClientRect();
						const offset = (refRect[axis] + refRect[len] / 2) - popperRect[axis] - border;

						state.elements.popper.style.setProperty('--popper-arrow-offset', `${offset}px`);
					}
				},
			],
			placement: this.options.placement
		};

		this.engine = createPopper(this.referenceElement, this.popperElement, popperOptions);

		this._startIgnoreBodyClick();

		if (resizeObserver)
			resizeObserver.observe(this.popperElement);
	}

	toggle(openerOptions = {}, referenceElement = undefined) {
		if (this.isOpen()) {
			const status = this._triggerEvent('toggle', {
				type: this.isOpen() ? 'close' : 'open',
				oldOpener: this.opener(),
				newOpener: referenceElement,
			});
			if (!status)
				return;
		}

		if (this.isOpen()) {
			this.close();
		} else {
			this.open(openerOptions, referenceElement);
		}
	}

	close() {
		if (!this.isOpen())
			return;

		if (!this._triggerEvent("beforeClose"))
			return;

		if (this.options.clickedClass)
			this.referenceElement.classList.remove(this.options.clickedClass);

		this.popperElement.dataset.popperOpen = "false";
		delete this.referenceElement.dataset.popperOpen;

		if (this.engine) {
			this.engine.destroy();
			this.engine = undefined;
		}

		this.referenceElement = undefined;

		this._triggerEvent("afterClose");
		popperOpenInstances = popperOpenInstances.filter((instance) => instance !== this);

		fixPageHeight();

		if (resizeObserver)
			resizeObserver.unobserve(this.popperElement);
	}

	closeWithAnimation(timeout = 300) {
		this.popperElement.dataset.popperIsClosing = true;
		waitTransitionEnd(this.popperElement, timeout).then(() => {
			delete this.popperElement.dataset.popperIsClosing;
			this.close();
		});
	}

	handleBodyClick(e) {
		if (!this.options.closeOnBodyClick)
			return;
		if (this.ignoreBodyClick || !this.isOpen())
			return;

		const clickedPopper = getNearestPopper(e.target);
		if (clickedPopper?.options.group && clickedPopper.options.group === this.options.group)
			return;
		this.close();
	}

	handleResize() {
		if (this.options.autoScroll) {
			if (this.engine)
				this.engine.forceUpdate();
			scrollIntoViewIfNotVisible(this.popperElement, { start: "nearest", end: "nearest" });
		} else {
			if (this.engine)
				this.engine.update();
		}
	}

	_applyOpenQuirks() {
		// FIXME: Мы тебе добавили меню в меню чтобы ты мог открывать меню пока открываешь меню 😎
		// Пример: кнопка "Дружить" в менюшке виджета юзера (раздел /users/)
		let parentMenu;
		do {
			parentMenu = getNearestPopper(this.element().parentNode);
			if (parentMenu) {
				console.warn(`[popper] quirks: menu #${this.element().id} in menu #${parentMenu.element().id}`);
				parentMenu.element().parentNode.insertBefore(this.element(), parentMenu.element());
			}
		} while (parentMenu);

		// FIXME: Кто-то не смог разрулить вёрстку и спойлер куда-то перемещается
		// Пример: переключатель краткий вид/расширенный вид
		if (this.options.appendTo) {
			const newParent = document.querySelector(this.options.appendTo);
			if (newParent) {
				newParent.appendChild(this.element());
			} else {
				console.error(`[popper] new parent not found: ${this.options.appendTo}`);
			}
		}

		// FIXME: Мощнейший костыль для спойлеров
		if (this.getType() == 'spoiler') {
			const ddSpoiler = this.element().closest('.js-dd_spoiler');
			if (ddSpoiler) {
				console.warn(`[popper] quirks: dd_spoiler shit.............. :( :( :(`);
				this.element().classList.remove('popper-dropdown');
				this.element().classList.add('popper-spoiler');
				for (const className of ddSpoiler.dataset.class.trim().split(/\s+/))
					this.element().classList.add(className);
				ddSpoiler.classList.remove('js-dd_spoiler');
				delete ddSpoiler.dataset.class;
			}
		}
	}

	_startIgnoreBodyClick() {
		this.ignoreBodyClick = true;
		setTimeout(() => this.ignoreBodyClick = false, 0);
	}

	_triggerEvent(eventName, data = {}) {
		const event = new CustomEvent(`popper:${eventName}`, { detail: { popper: this, ...data }, bubbles: true, cancelable: true });
		this.popperElement.dispatchEvent(event);
		return !event.defaultPrevented;
	}

	on(eventName, handler) {
		this.popperElement.addEventListener(`popper:${eventName}`, handler);
	}

	off(eventName, handler) {
		this.popperElement.removeEventListener(`popper:${eventName}`, handler);
	}

	getType() {
		if (this.popperElement.dataset.popperType)
			return this.popperElement.dataset.popperType;
		if (this.popperElement.classList.contains("popper-dropdown")) {
			// FIXME: Мощнейший костыль для спойлеров
			const ddSpoiler = this.element().closest('.js-dd_spoiler');
			if (ddSpoiler)
				return "spoiler";
			return "dropdown";
		}
		if (this.popperElement.classList.contains("popper-spoiler"))
			return "spoiler";
		return "custom";
	}

	destroy() {
		popperInstances.delete(this.popperElement);
		this.close();
	}
}

function handleResize() {
	for (const popperInstance of popperOpenInstances)
		popperInstance.handleResize();
}

export function getPopperByOpener(opener) {
	for (const popperInstance of popperOpenInstances) {
		if (popperInstance.opener() == opener)
			return popperInstance;
	}
	return undefined;
}

export function getPopperById(popperId) {
	const popperElement = document.querySelector(`#${popperId}`);
	if (!popperElement) {
		console.error(`Popper not found: ${popperId}`);
		return undefined;
	}
	let popperInstance = popperInstances.get(popperElement);
	if (!popperInstance) {
		popperInstance = new Popper(popperElement, {});
		require.component("widgets/popper");
	}
	return popperInstance;
}

export function getNearestPopper(element) {
	let cursor = element;
	while (cursor) {
		if (cursor.id) {
			for (const [_, popperInstance] of popperInstances) {
				if (popperInstance.element() === cursor)
					return popperInstance;
			}
		}
		cursor = cursor.parentNode;
	}
	return undefined;
}

export function closeAllPoppers() {
	for (const popperInstance of popperOpenInstances)
		popperInstance.close();
}

function handleBodyClick(e) {
	for (const popperInstance of popperOpenInstances)
		popperInstance.handleBodyClick(e);
}

function parsePopperOptions(element) {
	return parseDataset(element, {
		floating: "bool",
		placement: "string",
		clickedClass: "string",
		group: "string",
		offsetLeft: "number",
		offsetTop: "number",
		padding: "number",
		autoScroll: "bool",
		fixed: "bool",
		arrow: "bool",
		fullWidth: "bool",
		container: "string",
		flip: "bool",
		exclusive: "bool",
		closeOnBodyClick: "bool",
		appendTo: "string",
	}, 'popper');
}

function initPopperWidget() {
	if (window.ResizeObserver)
		resizeObserver = new ResizeObserver(throttleRaf(handleResize));

	document.body.addEventListener("click", handleBodyClick, { passive: true });

	const handlePopperOpen = (opener) => {
		const popperByOpener = getPopperByOpener(opener);
		const popperById = getPopperById(opener.dataset.popperId);
		const popperByReference = getNearestPopper(opener);

		if (popperByOpener && popperByOpener != popperById) {
			popperByOpener.close();
			return;
		}

		if (popperByReference?.isOpen()) {
			// Открываем меню из меню (новое меню заменяет текущее)
			popperById.toggle({}, popperByReference.opener());
		} else {
			popperById.toggle({}, opener);
		}
	};

	$('body')
		.on('focus' + NS, '.js-popper_open_focus', function (e) {
			handlePopperOpen(this);
		})
		.on('blur' + NS, '.js-popper_open_focus', function (e) {
			const popperByOpener = getPopperByOpener(this);
			if (popperByOpener) {
				setTimeout(() => {
					const hasFocusedElement = (
						document.activeElement &&
						document.activeElement !== document.body &&
						document.activeElement !== document.documentElement
					);
					if (hasFocusedElement && !popperByOpener.element().contains(document.activeElement))
						popperByOpener.close();
				}, 0);
			}
		})
		.on('click' + NS, '.js-popper_open_focus', function (e) {
			e.stopPropagation();
			e.stopImmediatePropagation();
		})
		.on('click' + NS, '.js-popper_open, .js-action_link[data-action="popper_open"]', function (e) {
			e.preventDefault();
			handlePopperOpen(this);
		})
		.on('click' + NS, '.js-popper_close, .js-action_link[data-action="popper_close"]', function (e) {
			e.preventDefault();
			if (this.dataset.popperId) {
				const popper = getPopperById(this.dataset.popperId);
				if (popper)
					popper.close();
			} else {
				const popper = getNearestPopper(this);
				popper?.close();
			}
		});

	pageLoader.on('requeststart', 'popper', () => {
		for (const popperInstance of popperOpenInstances)
			popperInstance.close();
	}, true);

	pageLoader.on('shutdown', 'popper', () => {
		setTimeout(() => {
			for (const [_, popperInstance] of popperInstances) {
				if (!document.body.contains(popperInstance.element()))
					popperInstance.destroy();
			}
		}, 0);
	}, true);
}
