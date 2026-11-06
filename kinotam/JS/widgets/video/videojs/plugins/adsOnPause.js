import { executeScripts } from 'loader';
import videojs from 'video.js';
import { debounce } from '../../../../utils';

const Component = videojs.getComponent('Component');

videojs.registerPlugin('adsOnPause', function VideoJsAdsOnPause(options = {}) {
	this.addChild('AdsOnPause', options);
});

class AdsOnPause extends Component {
	constructor(player, options = {}) {
		super(player, options);

		const preventAdsEvents = [
			'waiting', 'seeking', 'error', 'ended', 'play',
			'adstart', 'adend', 'adskip'
		];

		const startAds = debounce(() => {
			if (player.ads) {
				if (player.ads.isWaitingForAdBreak() || player.ads.inAdBreak() || player.ads.isContentResuming()) {
					console.log('[ads-on-pause] skip due vast');
					return;
				}
			}

			player.off(preventAdsEvents, cancelAds);
			player.off('pause', startAds);
			this.startAds();
		}, 100);

		const cancelAds = (e) => {
			startAds.cancel();
			console.log('[ads-on-pause] skip due', e.type);
		};

		player.on(preventAdsEvents, cancelAds);
		player.on('pause', startAds);

		this.el().addEventListener('click', () => this.stopAds());
	}

	createEl() {
		const block = videojs.dom.createEl('div', {
			className: 'vjs-ads-on-pause',
		});
		return block;
	}

	startAds() {
		const block = this.el();

		const skip = videojs.dom.createEl('div', {
			className: 'vjs-ads-on-pause__skip',
			innerHTML: `
				<svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="currentColor">
					<path d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
				</svg>
			`
		});
		block.appendChild(skip);

		const content = videojs.dom.createEl('div', {
			className: 'vjs-ads-on-pause__content',
		});
		block.appendChild(content);

		const adsCode = videojs.dom.createEl('div');
		content.appendChild(adsCode);

		adsCode.innerHTML = this.options_.html;
		executeScripts(adsCode.querySelectorAll('script'));
		content.appendChild(adsCode);

		waitForAdsLoad(adsCode, (flag) => {
			if (!this.player().paused()) {
				this.setTimeout(() => this.stopAds(), 100);
				return;
			}

			if (flag) {
				block.classList.add('vjs-ads-on-pause--show');
				this.player().controlBar.hide();
			} else {
				block.innerHTML = '';
			}
		});
	}

	stopAds() {
		const block = this.el();
		block.classList.remove('vjs-ads-on-pause--show');
		block.innerHTML = '';
		this.player().controlBar.show();
	}
}

function waitForAdsLoad(block, callback) {
	const checkIfAdsLoaded = () => {
		const rect = block.getBoundingClientRect();
		return rect.width > 30 && rect.height > 30;
	};

	const unregisterObserver = () => {
		resizeObserver.unobserve(block);
		resizeObserver.disconnect();
		clearTimeout(timeoutTimer);
	};

	const timeoutTimer = setTimeout(() => {
		callback(checkIfAdsLoaded());
		unregisterObserver();
	}, 3000);

	const resizeObserver = new ResizeObserver(() => {
		if (checkIfAdsLoaded()) {
			callback(true);
			unregisterObserver();
			return true;
		}
	});
	resizeObserver.observe(block);
}

videojs.registerComponent('AdsOnPause', AdsOnPause);
