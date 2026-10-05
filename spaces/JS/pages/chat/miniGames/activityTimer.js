import module from 'module';
import { formatDuration } from '../../../utils';

function getTimerSeconds(timer, now) {
	if (timer.endsAt !== undefined)
		return Math.max(0, (timer.endsAt - now) / 1000);
	const end = timer.running ? now : timer.stoppedAt;
	return Math.max(0, (end - timer.startedAt) / 1000);
}

function parseTimer(value) {
	return {
		running: value.running,
		startedAt: value.startedAt === null ? undefined : Date.parse(value.startedAt),
		endsAt: value.endsAt === null ? undefined : Date.parse(value.endsAt),
		stoppedAt: value.stoppedAt === null ? undefined : Date.parse(value.stoppedAt),
	};
}

function updateTimer(element, timer, now) {
	element.textContent = formatDuration(getTimerSeconds(timer, now));
}

module.on('componentpage', () => {
	const main = document.getElementById('main');
	const runningTimers = new Map();
	let interval;

	const stopInterval = () => {
		clearInterval(interval);
		interval = undefined;
		runningTimers.clear();
	};

	const updateTimers = () => {
		const now = Date.now();
		for (const [element, timer] of runningTimers) {
			if (!element.isConnected) {
				runningTimers.delete(element);
				continue;
			}
			updateTimer(element, timer, now);
			if (timer.endsAt !== undefined && timer.endsAt <= now)
				runningTimers.delete(element);
		}
		if (!runningTimers.size)
			stopInterval();
	};

	const startInterval = () => {
		if (!interval)
			interval = setInterval(updateTimers, 1000);
	};

	module.on('component', () => {
		const now = Date.now();
		for (const element of main.querySelectorAll('.js-game-activity-timer:not([data-inited])')) {
			element.dataset.inited = 'true';
			const timer = parseTimer(JSON.parse(element.dataset.activityTimer));
			updateTimer(element, timer, now);
			if (timer.running)
				runningTimers.set(element, timer);
		}
		if (runningTimers.size)
			startInterval();
	});

	return () => {
		stopInterval();
		module.on('component', undefined);
	};
});
