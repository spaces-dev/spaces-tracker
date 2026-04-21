import videojs from 'video.js';

const MOVE_DIR_THRESHOLD = 5;
const SCALE_THRESHOLD = 26;
const EXIT_THRESHOLD = 100;
const DRAG_SCALE = 0.95;

videojs.registerPlugin('swipeFromFullscreen', function VideoJsSwipeFromFullscreen(options = {}) {
	const player = this;
	const playerEl = player.el();
	const techEl = playerEl.querySelector('.vjs-tech');
	const posterEl = playerEl.querySelector('.vjs-poster');

	let startY = 0;
	let startX = 0;
	let deltaY = 0;
	let tracking = false;
	let axisLocked = false;

	const update = (deltaY, withTransition) => {
		const scale = Math.max(1 - (Math.abs(deltaY) / SCALE_THRESHOLD) * (1 - DRAG_SCALE), DRAG_SCALE);
		for (const el of [techEl, posterEl]) {
			el.style.transition = withTransition ? 'transform 0.2s' : 'none';
			el.style.transform = `translateY(${deltaY}px) scale(${scale})`;
		}
	};

	const onTouchStart = (e) => {
		if (e.touches.length !== 1)
			return;

		startY = e.touches[0].clientY;
		startX = e.touches[0].clientX;
		deltaY = 0;
		tracking = true;
		axisLocked = false;
	};

	const onTouchMove = (e) => {
		if (!tracking || e.touches.length !== 1)
			return;

		const dy = e.touches[0].clientY - startY;
		const dx = e.touches[0].clientX - startX;

		if (!axisLocked) {
			if (Math.abs(dy) < MOVE_DIR_THRESHOLD && Math.abs(dx) < MOVE_DIR_THRESHOLD)
				return;
			if (Math.abs(dx) > Math.abs(dy)) {
				tracking = false;
				return;
			}
			axisLocked = true;
		}

		e.preventDefault();

		deltaY = dy;
		update(deltaY, false);
	};

	const onTouchEnd = () => {
		if (!tracking)
			return;

		tracking = false;

		if (Math.abs(deltaY) >= EXIT_THRESHOLD) {
			player.exitFullscreen();
		} else {
			update(0, true);
		}
	};

	const onTouchCancel = () => {
		tracking = false;
		update(0, true);
	};

	const start = () => {
		playerEl.addEventListener('touchstart', onTouchStart, { passive: true });
		playerEl.addEventListener('touchmove', onTouchMove);
		playerEl.addEventListener('touchend', onTouchEnd, { passive: true });
		playerEl.addEventListener('touchcancel', onTouchCancel, { passive: true });
		update(0, true);
	};

	const stop = () => {
		playerEl.removeEventListener('touchstart', onTouchStart);
		playerEl.removeEventListener('touchmove', onTouchMove);
		playerEl.removeEventListener('touchend', onTouchEnd);
		playerEl.removeEventListener('touchcancel', onTouchCancel);

		for (const el of [techEl, posterEl]) {
			el.style.transition = '';
			el.style.transform = '';
		}
	};

	player.on('fullscreenchange', () => player.isFullscreen() ? start() : stop());
	player.on('dispose', stop);
});
