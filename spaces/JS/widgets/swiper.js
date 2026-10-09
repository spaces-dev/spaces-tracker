import $ from '../jquery';
import Device from '../device';
import SpacesApp from '../android/api';

// Настройки для свайпа
const SIDEBAR_NO_SWIPE = (
	!!navigator.userAgent.match(/(UCBrowser|UCWEB)/i) ||
	Device.type != 'touch' ||
	Device.android_app ||
	Device.browser.name == 'safari'
);

const SIDEBAR_GESTURE_MIN_X = 50;
const SIDEBAR_GESTURE_MAX_Y = 60;
const body = $(document.body);
const layout = $('#page_layout');

let locked = false;

init();

function init() {
	if (!layout.length)
		return;

	const handleClick = () => {
		toggle();
		return false;
	};

	const handleLayoutChange = () => {
		if (layout.hasClass('page-layout--sidebar-open') && isInlineSidebar())
			toggle(false);
	};

	layout.on('click', '#sidebar_toggle', handleClick);
	layout.on('click', '#header_elements', (e) => {
		if (e.target == e.currentTarget && layout.hasClass('page-layout--sidebar-open'))
			return handleClick();
	});
	$('#sidebar_container').on('click', function (e) {
		if (e.target == this)
			handleClick();
	});

	window.addEventListener('resize', handleLayoutChange, { passive: true });

	initSwipe();
}

function initSwipe() {
	if (SIDEBAR_NO_SWIPE)
		return;

	let startX = 0;
	let startY = 0;
	let gesture = false;

	document.body.addEventListener('touchstart', (e) => {
		gesture = false;

		if (locked || isInlineSidebar())
			return;

		const activeElement = document.activeElement;
		if (activeElement && ['TEXTAREA', 'INPUT'].includes(activeElement.nodeName))
			return;

		if (e.target.closest('.vjs-control-bar'))
			return;

		gesture = !e.touches || e.touches.length == 1;
		startX = e.touches ? e.touches[0].clientX : e.clientX;
		startY = e.touches ? e.touches[0].clientY : e.clientY;
	}, { passive: true });

	document.body.addEventListener('touchmove', (e) => {
		if (!gesture)
			return;

		const x = e.touches ? e.touches[0].clientX : e.clientX;
		const y = e.touches ? e.touches[0].clientY : e.clientY;
		const dX = Math.abs(x - startX);
		const dY = Math.abs(y - startY);

		if (dY > SIDEBAR_GESTURE_MAX_Y || dX * 0.66 < dY) {
			gesture = false;
			return;
		}

		if (dX < SIDEBAR_GESTURE_MIN_X)
			return;

		const isOpen = startX <= x;
		gesture = false;
		if (!locked)
			setTimeout(() => toggle(isOpen), 0);
	}, { passive: true });
}

export function toggle(state) {
	if (!layout.length)
		return;

	const sidebar = $('#sidebar_panel');
	const isOpen = layout.hasClass('page-layout--sidebar-open');

	if (state == null)
		state = !isOpen;
	if (state == isOpen || (state && isInlineSidebar()))
		return;

	if (!sidebar.data('noDark')) {
		sidebar.toggleClass('sidebar--dark', sidebar.data('dark') == 1 || state);
	}

	body.toggleClass('root--sidebar-open', state);
	layout.toggleClass('page-layout--sidebar-open', state);
	layout[0].dispatchEvent(new Event('sidebar:toggle'));
}

function isInlineSidebar() {
	return getComputedStyle(layout[0]).getPropertyValue('--layout-sidebar-mode').trim() === 'inline';
}

export function lock(flag) {
	locked = flag;

	if (Device.android_app)
		SpacesApp.exec('sidebar', { enable: !flag });
}
