import module from 'module';
import Spaces from './spacesLib';
import { Popper } from './widgets/popper';

const SHOW_TIMEOUT = 1000;
const HIDE_TIMEOUT = 50;

const CONFIG = {
	user: {
		method: 'users.popupWidget',
		param: 'User',
		idKey: 'u'
	},
	comm: {
		method: 'comm.popupWidget',
		param: 'Comm',
		idKey: 'c'
	}
};

let cache = {};
let hotInfoPopper;
let currentHoveredLink;
let currentHoveredLinkTime;
let showTimerId;
let hideTimerId;

module.on("component", () => {
	const hovered = document.querySelector(".mysite-link[onmouseover]:hover");
	hovered && initHotInfo(hovered);
});

module.on("componentpagedone", () => {
	cache = {};
});

function getConfig(el) {
	for (const [type, cfg] of Object.entries(CONFIG)) {
		if (el.dataset[cfg.idKey])
			return { ...cfg, type, id: +el.dataset[cfg.idKey] };
	}
	throw new Error(`No config for hot info!`);
}

function initHotInfo(el) {
	if (el.dataset.hotInfoInited)
		return;
	el.dataset.hotInfoInited = true;

	const onMouseOver = () => {
		currentHoveredLink = el;
		currentHoveredLinkTime = Date.now();
		loadHotInfo(el);
	};
	el.addEventListener('mouseover', onMouseOver);
	el.addEventListener('mouseout', () => {
		if (currentHoveredLink == el) {
			hideHotInfo();
			currentHoveredLink = undefined;
		}
	});
	el.removeAttribute("onmouseover");
	onMouseOver();
}

async function loadHotInfo(el) {
	const config = getConfig(el);
	const key = `${config.type}_${config.id}_${config.rnd}`;

	if (!cache[key]) {
		cache[key] = Spaces.asyncApi(config.method, {
			Link_id: Spaces.params.link_id,
			[config.param]: config.id
		});
	}

	const response = await cache[key];
	if (response.code != 0) {
		delete cache[key];
		return;
	}

	if (currentHoveredLink === el) {
		const timeToShow = Math.max(0, SHOW_TIMEOUT - (Date.now() - currentHoveredLinkTime));
		showTimerId = setTimeout(() => {
			showTimerId = undefined;
			showHotInfo(response.widget);
		}, timeToShow);
	}
}

function showHotInfo(widget) {
	if (!hotInfoPopper) {
		const windowElement = document.createElement('div');
		windowElement.className = 'popper-dropdown popper-dropdown--with-opacity-animation';
		document.getElementById('main_content').appendChild(windowElement);

		windowElement.addEventListener('mouseover', () => cancelHiding());
		windowElement.addEventListener('mouseout', () => hideHotInfo());

		hotInfoPopper = new Popper(windowElement, {
			exclusive: false,
			autoScroll: false,
			flip: true,
			offsetTop: 6,
			placement: 'top'
		});
	}
	hotInfoPopper.content().innerHTML = widget;
	hotInfoPopper.open({}, currentHoveredLink);
}

function hideHotInfo() {
	if (showTimerId) {
		clearTimeout(showTimerId);
		showTimerId = undefined;
		return;
	}

	if (!hideTimerId) {
		hideTimerId = setTimeout(() => {
			hideTimerId = undefined;
			hotInfoPopper.closeWithAnimation();
		}, HIDE_TIMEOUT);
	}
}

function cancelHiding() {
	if (hideTimerId) {
		clearTimeout(hideTimerId);
		hideTimerId = undefined;
		return;
	}
}
