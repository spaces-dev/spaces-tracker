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

	if (currentHoveredLink)
		hideHotInfo(false);
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
			hideHotInfo(true);
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
		const popperElement = document.createElement('div');
		popperElement.className = 'popper-dropdown popper-dropdown--with-opacity-animation';
		document.getElementById('siteContent').appendChild(popperElement);

		popperElement.addEventListener('mouseover', () => cancelHiding());
		popperElement.addEventListener('mouseout', () => hideHotInfo(true));

		hotInfoPopper = new Popper(popperElement, {
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

function hideHotInfo(animation) {
	if (showTimerId) {
		clearTimeout(showTimerId);
		showTimerId = undefined;
		return;
	}

	if (!hotInfoPopper)
		return;

	if (hideTimerId)
		return;

	if (animation) {
		if (!hideTimerId) {
			hideTimerId = setTimeout(() => {
				hideTimerId = undefined;
				hotInfoPopper.closeWithAnimation();
			}, HIDE_TIMEOUT);
		}
	} else {
		hotInfoPopper.close();
	}
}

function cancelHiding() {
	if (hideTimerId) {
		clearTimeout(hideTimerId);
		hideTimerId = undefined;
		return;
	}
}
