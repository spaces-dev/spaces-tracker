import module from "module";
import { rand } from "../utils/math";
import { confetti } from "../effects/confetti";
import Spaces from "../spacesLib";
import { showToast } from "./toaster";

let audio;
let resizeObserver;
let coinZone;

module.on("componentpage", () => {
	const content = document.getElementById('main');
	const coin = document.getElementById('bonus_coin');
	document.body.appendChild(coin);

	coinZone = getRandomCoinZone();
	if (!coinZone)
		return;

	coin.classList.remove('bonus-coin--hidden');
	recalcCointPosition(coinZone, coin);

	if (window.ResizeObserver) {
		resizeObserver = new window.ResizeObserver(() => updateCoin());
		resizeObserver.observe(content);
	} else {
		window.addEventListener('resize', updateCoin, false);
	}

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
});

module.on("componentpagedone", () => {
	if (resizeObserver) {
		resizeObserver.disconnect();
		resizeObserver = undefined;
	} else {
		window.removeEventListener('resize', updateCoin, false);
	}

	const coin = document.getElementById('bonus_coin');
	coin?.remove();

	coinZone = undefined;
});

function updateCoin() {
	const coin = document.getElementById('bonus_coin');
	clampCoinPosition(coinZone, coin);
}

function clampCoinPosition(coinZone, coinEl) {
	const rect = coinZone.getBoundingClientRect();
	const sx = window.scrollX;
	const sy = window.scrollY;
	const w = coinEl.offsetWidth;
	const h = coinEl.offsetHeight;

	const minX = rect.left + sx;
	const maxX = rect.right + sx - w;
	const minY = rect.top + sy;
	const maxY = rect.bottom + sy - h;

	const isBadPosition = (
		coinEl.offsetLeft < minX ||
		coinEl.offsetLeft > maxX ||
		coinEl.offsetTop < minY ||
		coinEl.offsetTop > maxY
	);
	if (isBadPosition) {
		console.log("bad position!!!");
		recalcCointPosition(coinZone, coinEl);
	}
}

function recalcCointPosition(coinZone, coinEl) {
	const sx = window.scrollX;
	const sy = window.scrollY;
	const rect = coinZone.getBoundingClientRect();
	const x1 = rect.x + sx;
	const x2 = rect.x + rect.width + sx;
	const y1 = rect.y + sy;
	const y2 = rect.y + rect.height + sy;
	coinEl.style.left = rand(Math.round(x1), Math.round(x2)) + "px";
	coinEl.style.top = rand(Math.round(y1), Math.round(y2)) + "px";
}

function getRandomCoinZone() {
	const zones = document.querySelectorAll(`.${Spaces.params.ac}`);
	if (!zones.length)
		return undefined;
	return zones[rand(0, zones.length - 1)];
}
