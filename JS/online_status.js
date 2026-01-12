import * as pushstream from './core/lp';
import Spaces from './spacesLib';
import pageLoader from './ajaxify';
import notifications from './notifications';

const ONLINE_CHECK_INTERVAL = 40000;

let lastCheckTime = Date.now();
let updateTimerId;
let lastRequestDone = true;

initOnlineChecker();

function initOnlineChecker() {
	document.body.addEventListener('focuswindow', () => sheduleNextUpdate(), false);
	document.body.addEventListener('blurwindow', () => sheduleNextUpdate(), false);
	sheduleNextUpdate();

	pushstream.on('message', 'online_status', function (data) {
		if (data.act == pushstream.TYPES.STATUS_CHANGE)
			updateOnlineStatus([Spaces.params.nid]);
	});

	pageLoader.on('mailrequestend', "online_status", () => {
		lastCheckTime = Date.now();
		sheduleNextUpdate();
	}, true);

	pageLoader.on('pageloaded', "online_status", () => {
		lastCheckTime = Date.now();
		sheduleNextUpdate();
	}, true);
}

function sheduleNextUpdate() {
	if (updateTimerId) {
		clearTimeout(updateTimerId);
		updateTimerId = undefined;
	}

	if (!lastRequestDone || !notifications.isWindowActive())
		return;

	const elapsed = Date.now() - lastCheckTime;
	const nextUpdateTime = Math.max(0, ONLINE_CHECK_INTERVAL - elapsed);

	updateTimerId = setTimeout(async () => {
		updateTimerId = undefined;

		const users = getOnlineIndicators()
			.map((ind) => ind.userId)
			.filter((userId) => userId != Spaces.params.nid);

		if (users.length > 0) {
			lastRequestDone = false;
			await updateOnlineStatus(users);
			lastRequestDone = true;
		}

		lastCheckTime = Date.now();
		sheduleNextUpdate();
	}, nextUpdateTime);
}

function getOnlineIndicators() {
	const indicators = [];
	for (const icon of document.querySelectorAll('img.online_status_ico')) {
		const userId = +icon.dataset.u;
		indicators.push({ userId, icon });
	}
	for (const widget of document.querySelectorAll('.js-online_status')) {
		const userId = +widget.dataset.user;
		indicators.push({ userId, widget });
	}
	return indicators;
}

async function updateOnlineStatus(users) {
	const response = await Spaces.asyncApi("users.isOnline", { UsErs: users });
	if (response.code != 0)
		return;

	for (const indicator of getOnlineIndicators()) {
		const status = response.status[indicator.userId];
		if (!status)
			continue;

		if (indicator.icon) {
			updateOnlineStatusIcon(indicator.icon, status);
		} else if (indicator.widget) {
			updateOnlineStatusWidget(indicator.widget, status);
		}
	}
}

function updateOnlineStatusIcon(icon, status) {
	const updateIconSrc = (src) => src.replace(/(_off)?(_2x)?(\.png)/ig, (status.is_online ? '' : '_off') + '$2$3');
	icon.src = updateIconSrc(icon.src);
	if (icon.srcset)
		icon.srcset = updateIconSrc(icon.srcset);
}

function updateOnlineStatusWidget(widget, status) {
	const isVisible = (
		(widget.dataset.toggle == 'online' && status.is_online) ||
		(widget.dataset.toggle == 'offline' && !status.is_online)
	);
	widget.classList.toggle('hide', !isVisible);

	if (widget.dataset.toggle == 'offline') {
		const lastVisitTimePlace = widget.querySelector('.js-text') || widget;
		lastVisitTimePlace.textContent = status.human_last_time;
	}
}
