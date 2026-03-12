import module from "module";
import { rand } from "../utils/math";
import { confetti } from "../effects/confetti";
import Spaces from "../spacesLib";
import { showToast } from "./toaster";

const MARGIN = 15;

let audio;
let resizeObserver;

module.on("componentpage", () => {
	const content = document.getElementById('main');
	const coin = document.getElementById('bonus_coin');
	document.body.appendChild(coin);

	const coinPosition = getRandomCoinPosition(content, coin, MARGIN);
	if (coinPosition) {
		coin.style.left = coinPosition.x + "px";
		coin.style.top = coinPosition.y + "px";
		coin.classList.remove('bonus-coin--hidden');
	}

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
});

function updateCoin() {
	const content = document.getElementById('main');
	const coin = document.getElementById('bonus_coin');
	clampCoinPosition(content, coin, MARGIN);
}

function clampCoinPosition(contentEl, coinEl, margin) {
	const contentRect = contentEl.getBoundingClientRect();
	const w = coinEl.offsetWidth;
	const h = coinEl.offsetHeight;

	const minX = contentRect.left + scrollX + margin;
	const maxX = contentRect.right + scrollX - w - margin;
	const minY = contentRect.top + scrollY + margin;
	const maxY = contentRect.bottom + scrollY - h - margin;

	coinEl.style.left = Math.max(minX, Math.min(coinEl.offsetLeft, maxX)) + "px";
	coinEl.style.top = Math.max(minY, Math.min(coinEl.offsetTop, maxY)) + "px";
}

function getRandomCoinPosition(contentEl, coinEl, margin) {
	const r = contentEl.getBoundingClientRect();
	const sx = window.scrollX;
	const sy = window.scrollY;

	const coinRect = coinEl.getBoundingClientRect();

	const content = {
		x1: sx + r.left + margin,
		y1: sy + r.top + margin,
		x2: sx + r.right - coinRect.width - margin,
		y2: sy + r.bottom - coinRect.height - margin,
	};

	if (content.x1 > content.x2 || content.y1 > content.y2)
		return undefined;

	const intersectRects = (a, b) => {
		const x1 = Math.max(a.x1, b.x1);
		const y1 = Math.max(a.y1, b.y1);
		const x2 = Math.min(a.x2, b.x2);
		const y2 = Math.min(a.y2, b.y2);
		return x1 <= x2 && y1 <= y2 ? { x1, y1, x2, y2 } : undefined;
	};

	const zones = [
		intersectRects(content, { x1: -Infinity, y1: -Infinity, x2: Infinity, y2: sy - coinRect.height - margin }),
		intersectRects(content, { x1: -Infinity, y1: sy + innerHeight + margin, x2: Infinity, y2: Infinity }),
		intersectRects(content, { x1: -Infinity, y1: -Infinity, x2: sx - coinRect.width - margin, y2: Infinity }),
		intersectRects(content, { x1: sx + innerWidth + margin, y1: -Infinity, x2: Infinity, y2: Infinity }),
	].filter(Boolean);

	if (!zones.length)
		return undefined;

	const zone = zones[rand(0, zones.length - 1)];
	return {
		x: rand(Math.round(zone.x1), Math.round(zone.x2)),
		y: rand(Math.round(zone.y1), Math.round(zone.y2)),
	};
}
