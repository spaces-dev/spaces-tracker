import { Spaces } from '../../spacesLib';

const SHOW_SCROLL_DELTA = 30;
const HIDE_SCROLL_DELTA = 30;
// Длительность transition шапки в _Header.scss
const HEADER_SHOW_DURATION = 200;
// scroll приходит раз в кадр, поэтому первое событие после паузы накопило не больше кадра
const MAX_SCROLL_EVENT_INTERVAL = 16;
const HEADER_SHOW_IDLE_DELAY = 100;
const TOP_EDGE_REVEAL_DISTANCE = 2;
// Firefox до 75
const HAS_GET_ANIMATIONS = 'getAnimations' in Element.prototype;

const layout = document.getElementById('page_layout');
const topInfo = document.getElementById('top_info_block');
const layoutResizeObserver = new ResizeObserver(handleLayoutResize);
const openHeaderMenus = new Set();
let headerMode = getHeaderMode();
let layoutStartScroll;
let lastScroll = Math.max(0, window.scrollY);
let lastScrollTime = 0;
let viewportWidth = window.innerWidth;
let updateScheduled = false;
let resizePending = false;

let header = document.getElementById('header_elements');
let accumulatedHeaderScroll = 0;
let headerCollapseSize = 0;
let headerHeight = 0;
let renderedHeaderCollapse;
let renderedHeaderOffset;
let headerShowAnimationFrame;
let headerShowIdleTimer;

let stickyPanels = [];
let stickyPanelsNeedClear = false;

init();

function init() {
	layoutResizeObserver.observe(topInfo);

	window.addEventListener('scroll', handleScroll, { passive: true });
	window.addEventListener('resize', handleResize, { passive: true });
	layout.addEventListener('sidebar:toggle', () => syncHeader());
	layout.addEventListener('transitionend', handleHeaderTransitionEnd);
	document.body.addEventListener('ajaxify:updateWidgets', handleWidgetsUpdate);

	syncTopEdgeListener();
	bindHeaderMenuEvents();

	if (headerMode !== 'autohide')
		refreshStickyPanels();
	refreshHeaderMetrics();
	syncHeader();
}

function handleScroll() {
	if (headerMode !== 'autohide') {
		scheduleUpdate();
		return;
	}

	const scroll = Math.max(0, window.scrollY);
	const delta = scroll - lastScroll;

	lastScroll = scroll;
	updateHeader(scroll, delta);
}

function scheduleUpdate() {
	if (updateScheduled)
		return;

	updateScheduled = true;
	requestAnimationFrame(update);
}

function update() {
	if (resizePending) {
		resizePending = false;
		updateAfterResize();
	}

	const scroll = Math.max(0, window.scrollY);
	const delta = scroll - lastScroll;

	updateScheduled = false;
	lastScroll = scroll;

	if (stickyPanelsNeedClear) {
		stickyPanelsNeedClear = false;
		clearStickyPanelPositions();
	}

	updateHeader(scroll, delta);
	if (headerMode !== 'autohide') {
		const headerOffset = headerMode === 'sticky' ? headerHeight : 0;
		updateStickyPanels(scroll, delta, headerOffset);
	}
}

function handleResize() {
	// У конца страницы панель браузера сдвигает scrollY без прокрутки
	lastScroll = Math.max(0, window.scrollY);
	if (headerMode === 'autohide' && viewportWidth === window.innerWidth)
		return;

	viewportWidth = window.innerWidth;
	resetHeaderScroll(lastScroll);
	resizePending = true;
	scheduleUpdate();
}

function updateAfterResize() {
	const previousHeaderMode = headerMode;

	layoutStartScroll = undefined;
	headerMode = getHeaderMode();
	if (previousHeaderMode !== headerMode) {
		if (headerMode === 'autohide') {
			discardStickyPanels();
		} else if (previousHeaderMode === 'autohide') {
			refreshStickyPanels();
		}

		syncTopEdgeListener();
		refreshHeaderMetrics();
		stickyPanelsNeedClear = headerMode !== 'autohide';
		syncHeader();
		return;
	}

	refreshHeaderHeight();
	stickyPanelsNeedClear = headerMode !== 'autohide';
	if (headerMode !== 'autohide')
		refreshStickyPanelHeights();
}

function handleWidgetsUpdate(event) {
	const widgets = event.detail;

	layoutStartScroll = undefined;
	if (widgets[Spaces.WIDGETS.HEADER]) {
		stickyPanelsNeedClear = headerMode !== 'autohide';
		refreshHeader();
	}

	if (headerMode !== 'autohide' && (widgets[Spaces.WIDGETS.SIDEBAR] || widgets[Spaces.WIDGETS.RIGHTBAR]))
		refreshStickyPanels();
	scheduleUpdate();
}

function getHeaderMode() {
	return getComputedStyle(layout).getPropertyValue('--layout-header-mode').trim();
}

function updateHeader(scroll, delta) {
	header.classList.toggle('header--stuck', headerMode === 'sticky' && scroll > getLayoutStartScroll());

	if (headerMode === 'autohide') {
		updateAutohideHeader(scroll, delta);
	} else if (headerMode === 'hover-reveal') {
		updateFloatingHeader(scroll);
	}

	updatePageHeaderOffset(scroll);
}

function updateAutohideHeader(scroll, delta) {
	if (scroll <= getLayoutStartScroll()) {
		layoutStartScroll = undefined;
		// Пока шапка анимируется, sticky не снимаем, иначе иконки дёргаются
		if (isHeaderTransformAnimating()) {
			showHeader();
		} else {
			deactivateStickyHeader(true);
		}
		resetHeaderScroll(scroll);
		return;
	}

	if (layout.classList.contains('page-layout--sidebar-open')) {
		showStickyHeader();
		resetHeaderScroll(scroll);
		return;
	}

	updateHeaderCollapse(scroll);
	if (!delta)
		return;

	const now = performance.now();
	const scrollInterval = Math.min(now - lastScrollTime, MAX_SCROLL_EVENT_INTERVAL);
	lastScrollTime = now;

	const isSticky = header.classList.contains('header--sticky');
	const isHidden = !isSticky || header.classList.contains('header--hidden');

	if (isHidden) {
		if (headerShowAnimationFrame !== undefined) {
			accumulatedHeaderScroll = Math.max(0, accumulatedHeaderScroll + delta);
			if (accumulatedHeaderScroll >= HIDE_SCROLL_DELTA) {
				deactivateStickyHeader();
				accumulatedHeaderScroll = 0;
			}
			return;
		}

		accumulatedHeaderScroll = Math.min(0, accumulatedHeaderScroll + delta);
		const timeToStaticHeader = (scroll - getLayoutStartScroll() - headerHeight) * scrollInterval / -delta;
		if (delta < 0 && timeToStaticHeader < HEADER_SHOW_DURATION) {
			// Статичная шапка появится раньше, чем sticky доедет. Если скролл остановится, событий больше не будет
			clearTimeout(headerShowIdleTimer);
			headerShowIdleTimer = setTimeout(() => revealHeader(lastScroll), HEADER_SHOW_IDLE_DELAY);
			return;
		}
		revealHeader(scroll);
		return;
	}

	accumulatedHeaderScroll = Math.max(0, accumulatedHeaderScroll + delta);
	if (accumulatedHeaderScroll < HIDE_SCROLL_DELTA)
		return;

	if (!isHeaderTransformAnimating())
		hideHeader();
	accumulatedHeaderScroll = 0;
}

function revealHeader(scroll) {
	if (accumulatedHeaderScroll > -SHOW_SCROLL_DELTA || scroll < getLayoutStartScroll() + headerHeight)
		return;

	if (header.classList.contains('header--sticky')) {
		showHeader();
	} else {
		showStickyHeader();
	}
	accumulatedHeaderScroll = 0;
}

function updateFloatingHeader(scroll) {
	const isFloating = scroll >= getLayoutStartScroll() + headerHeight &&
		!layout.classList.contains('page-layout--sidebar-open');

	if (isFloating) {
		if (!header.classList.contains('header--floating'))
			header.classList.add('header--floating');
		if (openHeaderMenus.size)
			header.classList.add('header--revealed');
	} else if (header.classList.contains('header--floating')) {
		resetFloatingHeader();
	}
}

function refreshHeader() {
	cancelStickyHeaderShow();
	header = document.getElementById('header_elements');
	openHeaderMenus.clear();
	bindHeaderMenuEvents();
	refreshHeaderMetrics();
	syncHeader();
}

function syncHeader() {
	// Переход мог оборваться без transitionend
	stopHeaderOffsetAnimation();
	const scroll = Math.max(0, window.scrollY);
	if (headerMode !== 'autohide' || scroll <= getLayoutStartScroll()) {
		deactivateStickyHeader();
	} else if (layout.classList.contains('page-layout--sidebar-open')) {
		showStickyHeader();
	} else {
		showHeader();
	}
	resetFloatingHeader();
	resetHeaderScroll(scroll);
	updateHeader(scroll, 0);
	scheduleUpdate();
}

function resetHeaderScroll(scroll) {
	lastScroll = scroll;
	accumulatedHeaderScroll = 0;
}

function showStickyHeader() {
	if (header.classList.contains('header--sticky')) {
		if (headerShowAnimationFrame === undefined)
			showHeader();
		return;
	}

	header.classList.add('header--instant', 'header--sticky', 'header--hidden');
	refreshHeaderHeight();
	headerShowAnimationFrame = requestAnimationFrame(() => {
		header.classList.remove('header--instant');
		headerShowAnimationFrame = requestAnimationFrame(() => {
			headerShowAnimationFrame = undefined;
			if (header.classList.contains('header--sticky'))
				showHeader();
		});
	});
}

function cancelStickyHeaderShow() {
	if (headerShowAnimationFrame === undefined)
		return false;

	cancelAnimationFrame(headerShowAnimationFrame);
	headerShowAnimationFrame = undefined;
	return true;
}

function deactivateStickyHeader(animateLabels = false) {
	cancelStickyHeaderShow();
	if (!header.classList.contains('header--sticky')) {
		showHeader();
		return;
	}

	const shouldAnimateLabels = animateLabels && !header.classList.contains('header--hidden');
	if (!shouldAnimateLabels)
		header.classList.add('header--instant');
	header.classList.remove('header--sticky', 'header--hidden');
	clearHeaderCollapse();
	refreshHeaderHeight();
	if (!shouldAnimateLabels) {
		header.getBoundingClientRect();
		header.classList.remove('header--instant');
	}
}

function showHeader() {
	const changed = header.classList.contains('header--hidden');
	header.classList.remove('header--hidden');
	if (changed)
		startHeaderOffsetAnimation();
	return changed;
}

function hideHeader() {
	if (header.classList.contains('header--hidden'))
		return;

	header.classList.add('header--hidden');
	startHeaderOffsetAnimation();
}

function refreshHeaderHeight() {
	headerHeight = header.offsetHeight;
}

function refreshHeaderMetrics() {
	clearHeaderCollapse();
	const style = getComputedStyle(header);
	headerCollapseSize = parseFloat(style.getPropertyValue('--layout-header-height')) -
		parseFloat(style.getPropertyValue('--header-compact-height')) || 0;
	refreshHeaderHeight();
}

function updateHeaderCollapse(scroll) {
	if (!headerCollapseSize || !header.classList.contains('header--sticky'))
		return;

	const collapse = Math.min(headerCollapseSize, Math.max(0, scroll - getLayoutStartScroll()));
	if (collapse === renderedHeaderCollapse)
		return;

	renderedHeaderCollapse = collapse;
	header.style.setProperty('--header-collapse-offset', `${collapse}px`);
	refreshHeaderHeight();
}

function clearHeaderCollapse() {
	renderedHeaderCollapse = undefined;
	header.style.removeProperty('--header-collapse-offset');
}

function updatePageHeaderOffset(scroll) {
	const offset = Math.round(getHeaderOffset(scroll));
	if (offset === renderedHeaderOffset)
		return;

	renderedHeaderOffset = offset;
	document.documentElement.style.setProperty('--page-header-offset', `${offset}px`);
	layout.dispatchEvent(new Event('header:offsetChange'));
}

function startHeaderOffsetAnimation() {
	document.body.classList.add('root--header-animated');
	updatePageHeaderOffset(lastScroll);
	// Без перехода transitionend не придёт. Сразу getAnimations пересчитал бы стили всей страницы
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			if (!isHeaderTransformAnimating())
				stopHeaderOffsetAnimation();
		});
	});
}

function stopHeaderOffsetAnimation() {
	document.body.classList.remove('root--header-animated');
}

function getHeaderOffset(scroll) {
	const visibleHeight = headerHeight;
	// При открытом сайдбаре header--hidden не сдвигает шапку
	if (layout.classList.contains('page-layout--sidebar-open'))
		return visibleHeight;
	if (header.classList.contains('header--hidden'))
		return 0;

	const scrollAfterLayoutStart = scroll - getLayoutStartScroll();
	if (scrollAfterLayoutStart < 0)
		return 0;
	if (headerMode === 'autohide' && !header.classList.contains('header--sticky'))
		return Math.max(0, visibleHeight - scrollAfterLayoutStart);
	if (headerMode !== 'hover-reveal' || header.classList.contains('header--revealed'))
		return visibleHeight;
	if (header.classList.contains('header--floating'))
		return 0;
	return Math.max(0, visibleHeight - scrollAfterLayoutStart);
}

function handleHeaderTransitionEnd(event) {
	if (event.target !== header || event.propertyName !== 'transform')
		return;
	// Chrome на Android шлёт лишний transitionend посреди перехода
	if (isHeaderTransformAnimating())
		return;

	stopHeaderOffsetAnimation();
	if (!header.classList.contains('header--sticky'))
		return;
	if (!header.classList.contains('header--hidden') && lastScroll > getLayoutStartScroll())
		return;

	deactivateStickyHeader(true);
	updatePageHeaderOffset(lastScroll);
}

function isHeaderTransformAnimating() {
	if (!HAS_GET_ANIMATIONS)
		return false;
	return header.getAnimations().some((animation) => animation.transitionProperty === 'transform');
}

function resetFloatingHeader() {
	header.classList.remove('header--floating', 'header--animated', 'header--revealed');
}

function syncTopEdgeListener() {
	document.removeEventListener('mousemove', handleMouseMove);
	if (headerMode === 'hover-reveal')
		document.addEventListener('mousemove', handleMouseMove, { passive: true });
}

function handleMouseMove(event) {
	if (!header.classList.contains('header--floating'))
		return;

	let changed = false;
	if (event.clientY <= TOP_EDGE_REVEAL_DISTANCE) {
		changed = !header.classList.contains('header--revealed');
		header.classList.add('header--animated', 'header--revealed');
	} else if (event.clientY > headerHeight && header.classList.contains('header--revealed')) {
		if (openHeaderMenus.size)
			return;

		header.classList.remove('header--revealed');
		changed = true;
	}

	if (!changed)
		return;

	startHeaderOffsetAnimation();
}

function bindHeaderMenuEvents() {
	header.addEventListener('popper:afterOpen', (event) => openHeaderMenus.add(event.target));
	header.addEventListener('popper:afterClose', (event) => openHeaderMenus.delete(event.target));
}

function getLayoutStartScroll() {
	if (layoutStartScroll === undefined)
		layoutStartScroll = layout.getBoundingClientRect().top + window.scrollY;
	return layoutStartScroll;
}

function invalidateLayoutStart() {
	layoutStartScroll = undefined;
	scheduleUpdate();
}

function refreshStickyPanels() {
	const previousPanels = stickyPanels;
	const elements = [...layout.querySelectorAll('.js-sticky_panel')];

	for (const panel of previousPanels) {
		if (!elements.includes(panel.element))
			layoutResizeObserver.unobserve(panel.element);
	}

	stickyPanels = elements.map((element) => {
		const previousPanel = previousPanels.find((panel) => panel.element === element);

		if (previousPanel) {
			previousPanel.gap = getStickyPanelGap(element);
			previousPanel.height = getStickyPanelHeight(element);
			return previousPanel;
		}

		return {
			element,
			gap: getStickyPanelGap(element),
			height: getStickyPanelHeight(element),
			renderedTop: undefined,
			top: undefined
		};
	});

	for (const panel of stickyPanels)
		layoutResizeObserver.observe(panel.element);

	scheduleUpdate();
}

function discardStickyPanels() {
	clearStickyPanelPositions();
	for (const panel of stickyPanels)
		layoutResizeObserver.unobserve(panel.element);
	stickyPanels = [];
}

function getStickyPanelGap(element) {
	return parseFloat(getComputedStyle(element).getPropertyValue('--sticky-panel-gap'));
}

function getStickyPanelHeight(element) {
	return element.getBoundingClientRect().height;
}

function refreshStickyPanelHeights() {
	for (const panel of stickyPanels)
		panel.height = getStickyPanelHeight(panel.element);
}

function handleLayoutResize(entries) {
	let layoutChanged = false;
	let panelChanged = false;
	for (const entry of entries) {
		if (entry.target === topInfo) {
			layoutChanged = true;
			continue;
		}

		const panel = stickyPanels.find((item) => item.element === entry.target);
		if (!panel)
			continue;

		const height = getStickyPanelHeight(panel.element);
		if (height === panel.height)
			continue;

		panel.height = height;
		panelChanged = true;
	}

	if (layoutChanged) {
		invalidateLayoutStart();
	} else if (panelChanged) {
		scheduleUpdate();
	}
}

function updateStickyPanels(scroll, delta, headerOffset) {
	if (scroll === 0) {
		clearStickyPanelPositions();
		return;
	}

	const updates = [];
	for (const panel of stickyPanels) {
		if (!panel.height)
			continue;

		const maxTop = headerOffset + panel.gap;
		const minTop = Math.min(maxTop, window.innerHeight - panel.height);
		if (minTop === maxTop) {
			clearStickyPanelPosition(panel);
			continue;
		}

		const currentTop = panel.top === undefined ? panel.element.getBoundingClientRect().top - delta : panel.top - delta;
		panel.top = Math.max(minTop, Math.min(maxTop, currentTop));
		const renderedTop = Math.round(panel.top);
		if (renderedTop !== panel.renderedTop) {
			panel.renderedTop = renderedTop;
			updates.push(panel);
		}
	}

	for (const panel of updates)
		panel.element.style.setProperty('--sticky-panel-top', `${panel.renderedTop}px`);
}

function clearStickyPanelPositions() {
	for (const panel of stickyPanels)
		clearStickyPanelPosition(panel);
}

function clearStickyPanelPosition(panel) {
	panel.top = undefined;
	if (panel.renderedTop === undefined)
		return;

	panel.renderedTop = undefined;
	panel.element.style.removeProperty('--sticky-panel-top');
}
