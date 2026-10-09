import { Spaces } from '../../spacesLib';

const AUTOHIDE_VIEWPORT_RATIO = 0.3;
const SHOW_SCROLL_DELTA = 30;
const TOP_EDGE_REVEAL_DISTANCE = 2;

const layout = document.getElementById('page_layout');
const topInfo = document.getElementById('top_info_block');
const layoutResizeObserver = new ResizeObserver(handleLayoutResize);
const openHeaderMenus = new Set();
let headerMode = getHeaderMode();
let layoutStartScroll;
let lastScroll = Math.max(0, window.scrollY);
let updateScheduled = false;
let resizePending = false;

let header = document.getElementById('header_elements');
let accumulatedHeaderScroll = 0;
let headerCollapseSize = 0;
let headerHeight = 0;
let renderedHeaderCollapse;
let renderedHeaderOffset;
let headerOffsetAnimationFrame;
let headerTransitionVersion = 0;

let stickyPanels = [];
let stickyPanelsNeedClear = false;

init();

function init() {
	layoutResizeObserver.observe(topInfo);

	window.addEventListener('scroll', handleScroll, { passive: true });
	window.addEventListener('resize', handleResize, { passive: true });
	layout.addEventListener('sidebar:toggle', () => syncHeader());
	layout.addEventListener('animationend', handleHeaderAnimationEnd);
	document.body.addEventListener('ajaxify:updateWidgets', handleWidgetsUpdate);

	syncTopEdgeListener();
	bindHeaderMenuEvents();

	if (headerMode !== 'autohide')
		refreshStickyPanels();
	refreshHeaderCollapseMetrics();
	syncHeader();
	animateInitialHeaderCollapse(lastScroll);
}

function handleScroll() {
	if (headerMode !== 'autohide') {
		scheduleUpdate();
		return;
	}

	header.classList.remove('header--initial-collapse');
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
	resetHeaderScroll(Math.max(0, window.scrollY));
	resizePending = true;
	scheduleUpdate();
}

function updateAfterResize() {
	const previousHeaderMode = headerMode;

	header.classList.remove('header--initial-collapse');
	layoutStartScroll = undefined;
	headerMode = getHeaderMode();
	if (previousHeaderMode !== headerMode) {
		if (headerMode === 'autohide') {
			discardStickyPanels();
		} else if (previousHeaderMode === 'autohide') {
			refreshStickyPanels();
		}

		syncTopEdgeListener();
		refreshHeaderCollapseMetrics();
		stickyPanelsNeedClear = headerMode !== 'autohide';
		syncHeader();
		return;
	}

	headerHeight = header.offsetHeight + (renderedHeaderCollapse || 0);
	stickyPanelsNeedClear = headerMode !== 'autohide';
	if (headerMode !== 'autohide')
		refreshStickyPanelHeights();
	syncSidebarHeaderHeight();
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
	if (headerMode === 'autohide') {
		updateHeaderCollapse(scroll);
		updateAutohideHeader(scroll, delta);
	} else if (headerMode === 'hover-reveal') {
		updateFloatingHeader(scroll);
	}

	if (headerOffsetAnimationFrame === undefined)
		updatePageHeaderOffset(scroll);
}

function updateAutohideHeader(scroll, delta) {
	if (scroll === 0) {
		layoutStartScroll = undefined;
		if (header.classList.contains('header--hidden') && !header.classList.contains('header--instant'))
			skipHeaderTransition();
		if (showHeader())
			updateHeaderCollapse(scroll);
		resetHeaderScroll(scroll);
		return;
	}

	if (layout.classList.contains('page-layout--sidebar-open')) {
		if (showHeader())
			updateHeaderCollapse(scroll);
		resetHeaderScroll(scroll);
		return;
	}

	if (!delta)
		return;

	const isHidden = header.classList.contains('header--hidden');
	accumulatedHeaderScroll = isHidden ?
		Math.min(0, accumulatedHeaderScroll + delta) :
		Math.max(0, accumulatedHeaderScroll + delta);

	if (isHidden) {
		if (accumulatedHeaderScroll <= -SHOW_SCROLL_DELTA) {
			showHeader();
			updateHeaderCollapse(scroll);
			accumulatedHeaderScroll = 0;
		}
		return;
	}

	const scrollAfterSticky = Math.max(0, scroll - getLayoutStartScroll());
	const hideDistance = Math.min(accumulatedHeaderScroll, scrollAfterSticky);

	if (hideDistance >= window.innerHeight * AUTOHIDE_VIEWPORT_RATIO) {
		hideHeader();
		accumulatedHeaderScroll = 0;
	}
}

function updateFloatingHeader(scroll) {
	const isFloating = scroll >= getLayoutStartScroll() + headerHeight &&
		!layout.classList.contains('page-layout--sidebar-open');

	if (isFloating) {
		if (!header.classList.contains('header--floating'))
			header.classList.add('header--floating');
	} else if (header.classList.contains('header--floating')) {
		resetFloatingHeader();
	}
}

function refreshHeader() {
	const wasHidden = header.classList.contains('header--hidden');

	stopHeaderOffsetAnimation();
	header = document.getElementById('header_elements');
	openHeaderMenus.clear();
	bindHeaderMenuEvents();
	refreshHeaderCollapseMetrics();
	skipHeaderTransition();
	syncHeader(wasHidden);
	animateInitialHeaderCollapse(Math.max(0, window.scrollY));
}

function syncHeader(keepHidden) {
	const scroll = Math.max(0, window.scrollY);
	const shouldKeepHidden = keepHidden && headerMode === 'autohide' && scroll > 0 &&
		!layout.classList.contains('page-layout--sidebar-open');

	if (shouldKeepHidden) {
		updateHeaderCollapse(scroll);
		hideHeader();
	} else {
		showHeader();
	}
	resetFloatingHeader();
	resetHeaderScroll(scroll);
	updateHeader(scroll, 0);
	syncSidebarHeaderHeight();
	scheduleUpdate();
}

function resetHeaderScroll(scroll) {
	lastScroll = scroll;
	accumulatedHeaderScroll = 0;
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

function refreshHeaderCollapseMetrics() {
	renderedHeaderCollapse = undefined;
	header.style.removeProperty('--header-collapse-offset');
	header.style.removeProperty('--header-label-offset');
	header.style.removeProperty('--header-label-opacity');
	headerHeight = header.offsetHeight;

	if (headerMode !== 'autohide' || !header.classList.contains('header--labeled')) {
		headerCollapseSize = 0;
		return;
	}

	const style = getComputedStyle(header);
	const expandedHeight = parseFloat(style.getPropertyValue('--header-expanded-height'));
	headerCollapseSize = expandedHeight - parseFloat(style.getPropertyValue('--header-compact-height'));
}

function updateHeaderCollapse(scroll) {
	if (!headerCollapseSize)
		return;
	if (scroll > 0 && header.classList.contains('header--hidden'))
		return;

	const scrollAfterSticky = scroll === 0 ? 0 : Math.max(0, scroll - getLayoutStartScroll());
	const collapse = Math.min(headerCollapseSize, scrollAfterSticky);

	if (collapse !== renderedHeaderCollapse) {
		const progress = collapse / headerCollapseSize;
		const visibility = 1 - progress;

		renderedHeaderCollapse = collapse;
		header.style.setProperty('--header-collapse-offset', `${collapse}px`);
		header.style.setProperty('--header-label-offset', `${progress * -50}%`);
		header.style.setProperty('--header-label-opacity', visibility * visibility);
	}
}

function updatePageHeaderOffset(scroll, notify = true) {
	setPageHeaderOffset(getHeaderOffset(scroll), notify);
}

function setPageHeaderOffset(offset, notify = true) {
	offset = Math.round(offset);
	if (offset === renderedHeaderOffset)
		return;

	renderedHeaderOffset = offset;
	document.documentElement.style.setProperty('--page-header-offset', `${offset}px`);
	if (notify)
		layout.dispatchEvent(new Event('header:offsetChange'));
}

function startHeaderOffsetAnimation() {
	if (headerOffsetAnimationFrame !== undefined)
		return;

	headerOffsetAnimationFrame = requestAnimationFrame(updateAnimatedHeaderOffset);
}

function stopHeaderOffsetAnimation() {
	if (headerOffsetAnimationFrame === undefined)
		return;

	cancelAnimationFrame(headerOffsetAnimationFrame);
	headerOffsetAnimationFrame = undefined;
}

function updateAnimatedHeaderOffset() {
	headerOffsetAnimationFrame = undefined;
	const isRunning = header.getAnimations().some((animation) => {
		return animation.playState === 'pending' || animation.playState === 'running';
	});
	if (!isRunning) {
		updatePageHeaderOffset(lastScroll, false);
		layout.dispatchEvent(new Event('header:offsetChange'));
		return;
	}

	const rect = header.getBoundingClientRect();
	setPageHeaderOffset(rect.top > 0 ? 0 : Math.max(0, rect.bottom), false);
	startHeaderOffsetAnimation();
}

function getHeaderOffset(scroll) {
	if (header.classList.contains('header--hidden'))
		return 0;

	const visibleHeight = headerHeight - (renderedHeaderCollapse || 0);
	if (layout.classList.contains('page-layout--sidebar-open'))
		return visibleHeight;

	const scrollAfterLayoutStart = scroll - getLayoutStartScroll();
	if (scrollAfterLayoutStart < 0)
		return 0;
	if (headerMode !== 'hover-reveal' || header.classList.contains('header--revealed'))
		return visibleHeight;
	if (header.classList.contains('header--floating'))
		return 0;
	return Math.max(0, visibleHeight - scrollAfterLayoutStart);
}

function animateInitialHeaderCollapse(scroll) {
	if (!headerCollapseSize || !scroll)
		return;
	if (scroll <= getLayoutStartScroll())
		return;

	header.classList.add('header--initial-collapse');
	startHeaderOffsetAnimation();
}

function handleHeaderAnimationEnd(event) {
	if (event.target === header && event.animationName === 'header-initial-collapse')
		header.classList.remove('header--initial-collapse');
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

function skipHeaderTransition() {
	const currentHeader = header;
	const version = ++headerTransitionVersion;

	currentHeader.classList.add('header--instant');
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			if (version === headerTransitionVersion && header === currentHeader)
				currentHeader.classList.remove('header--instant');
		});
	});
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

function syncSidebarHeaderHeight() {
	if (!layout.classList.contains('page-layout--sidebar-open')) {
		layout.style.removeProperty('--layout-header-height');
		return;
	}

	layout.style.setProperty('--layout-header-height', `${header.offsetHeight}px`);
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
