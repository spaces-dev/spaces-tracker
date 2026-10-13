import module from "module";
import { rand } from "../utils/math";
import { isFullyVisibleOnScreen, isVisibleOnScreen } from "../utils/dom";
import { confetti } from "../effects/confetti";
import Spaces from "../spacesLib";
import { showToast } from "./toaster";

const COIN_GAP = 8;

let audio;

module.on("componentpage", () => {
	const content = document.getElementById('main');
	const coin = document.getElementById('bonus_coin');
	const zone = getRandomCoinZone();

	if (!zone)
		return;

	document.body.appendChild(coin);

	const position = {
		side: undefined,
		offset: Math.random(),
	};
	const updatePosition = () => updateCoinPosition(coin, zone, position);
	const handleResize = () => {
		if (isFullyVisibleOnScreen(coin))
			return;
		position.side = undefined;
		updatePosition();
	};

	coin.classList.remove('bonus-coin--hidden');
	updatePosition();

	let resizeObserver;
	if (window.ResizeObserver) {
		resizeObserver = new window.ResizeObserver(updatePosition);
		resizeObserver.observe(content);
	}
	window.addEventListener('resize', handleResize, false);

	coin.addEventListener('click', async (e) => {
		e.preventDefault();

		coin.classList.add('bonus-coin--hidden');
		confetti(coin, { emoji: '🪙' });

		if (audio) {
			setTimeout(() => {
				audio.stop();
				audio.play();
			}, 0);
		}

		const response = await Spaces.asyncApi("services.getGiftCoins", {
			...JSON.parse(coin.dataset.params),
			CK: null,
		});
		if (response.code == 0) {
			if (response.notification) {
				showToast({
					severity: "info",
					text: response.notification.text,
					timeout: 30000,
				});
			}
		} else {
			showToast({
				severity: "error",
				text: Spaces.apiError(response),
			});
		}
	});

	if (!audio) {
		import('howler/src/howler.core.js').then(() => {
			if (audio)
				return;
			audio = new Howl({
				src: [ICONS_BASEURL + 'sounds/coin.mp3'],
				html5: true,
				preload: true,
				volume: 0.15,
				onplayerror(error) {
					console.error(`[Howl]`, error);
				}
			});
		});
	}

	return () => {
		if (resizeObserver)
			resizeObserver.disconnect();
		window.removeEventListener('resize', handleResize, false);
		coin.remove();
	};
});

function updateCoinPosition(coin, zone, position) {
	const rect = zone.getBoundingClientRect();
	const scrollX = window.scrollX;
	const scrollY = window.scrollY;
	const coinWidth = coin.offsetWidth;
	const coinHeight = coin.offsetHeight;
	const availableSides = getAvailableCoinSides(rect, coinWidth, coinHeight);

	if (!position.side || !availableSides.includes(position.side))
		position.side = availableSides[rand(0, availableSides.length - 1)];

	let coinLeft;
	let coinTop;
	if (position.side == 'top' || position.side == 'bottom') {
		coinLeft = calculateCoinAxisPosition(rect.left + scrollX, rect.width, coinWidth, position.offset);
		coinTop = position.side == 'top'
			? rect.top + scrollY - coinHeight - COIN_GAP
			: rect.bottom + scrollY + COIN_GAP;
	} else {
		coinLeft = position.side == 'left'
			? rect.left + scrollX - coinWidth - COIN_GAP
			: rect.right + scrollX + COIN_GAP;
		coinTop = calculateCoinAxisPosition(rect.top + scrollY, rect.height, coinHeight, position.offset);
	}

	coin.style.left = Math.round(coinLeft) + 'px';
	coin.style.top = Math.round(coinTop) + 'px';
}

function getAvailableCoinSides(zoneRect, coinWidth, coinHeight) {
	const viewportWidth = document.documentElement.clientWidth;
	const viewportHeight = window.innerHeight;
	const sides = [];

	if (zoneRect.top >= coinHeight + COIN_GAP)
		sides.push('top');
	if (zoneRect.right + coinWidth + COIN_GAP <= viewportWidth)
		sides.push('right');
	if (zoneRect.bottom + coinHeight + COIN_GAP <= viewportHeight)
		sides.push('bottom');
	if (zoneRect.left >= coinWidth + COIN_GAP)
		sides.push('left');

	if (!sides.length)
		sides.push('top');
	return sides;
}

function calculateCoinAxisPosition(start, zoneSize, coinSize, offset) {
	if (zoneSize <= coinSize)
		return start + (zoneSize - coinSize) / 2;
	return start + (zoneSize - coinSize) * offset;
}

function getRandomCoinZone() {
	const zones = Spaces.params.ac ? document.querySelectorAll(`.${Spaces.params.ac}`) : [];
	if (!zones.length)
		return document.getElementById('coins_gift');

	const offscreenZones = Array.from(zones).filter((zone) => !isVisibleOnScreen(zone));
	const preferredZones = offscreenZones.length ? offscreenZones : zones;
	return preferredZones[rand(0, preferredZones.length - 1)];
}
