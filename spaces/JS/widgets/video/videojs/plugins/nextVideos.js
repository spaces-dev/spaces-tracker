import { executeScripts } from 'loader';
import videojs from 'video.js';
import { L } from '../../../../core/l10n';
import { reachGoal } from '../../../../metrics/track';
import { silentPromise } from './utils';

const REPLAY_ICON = `
	<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor">
		<path d="M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80q-75 0-140.5-28.5Z"/>
	</svg>
`;

const PREVIEW_ASPECT_RATIO = 16 / 9;

const Component = videojs.getComponent('Component');

videojs.registerPlugin('nextVideos', function VideoJsNextVideos(options = {}) {
	this.addClass('vjs-has-next-videos');
	this.addChild('NextVideos', options);
});

class NextVideos extends Component {
	constructor(player, options = {}) {
		super(player, options);

		executeScripts(this.el().querySelectorAll('script'));

		const replayButton = this.el().querySelector('.vjs-next-videos__replay');
		this.on(replayButton, 'click', () => {
			reachGoal('player_next_videos_replay');
			silentPromise('[next-videos] replay', player.play());
		});

		for (const link of this.el().querySelectorAll('a'))
			this.on(link, 'click', () => reachGoal('player_next_videos_click'));

		this.on(player, 'ended', () => {
			reachGoal('player_next_videos_show');
			this.updateLayout();
		});

		const resizeObserver = new ResizeObserver(() => {
			if (player.ended())
				this.updateLayout();
		});
		resizeObserver.observe(player.el());
		this.on('dispose', () => resizeObserver.disconnect());
	}

	updateLayout() {
		const el = this.el();
		el.style.paddingTop = '';
		el.classList.remove('vjs-next-videos--compact');
		const previewWidth = this.fitList();
		el.classList.add('vjs-next-videos--compact');
		if (this.fitList() <= previewWidth) {
			el.classList.remove('vjs-next-videos--compact');
			this.fitList();
		}
		this.centerInPlayer();
	}

	centerInPlayer() {
		const el = this.el();
		const style = getComputedStyle(el);
		if (this.getFreeHeight() >= parseFloat(style.paddingBottom) - parseFloat(style.paddingTop))
			el.style.paddingTop = style.paddingBottom;
	}

	fitList() {
		const list = this.el().querySelector('.vjs-next-videos__list');
		const preview = list.querySelector('.vjs-next-videos__preview');
		const count = list.children.length;
		const gap = parseFloat(getComputedStyle(list).columnGap);
		const previewHeight = Math.max(0, preview.offsetHeight + this.getFreeHeight());
		list.style.maxWidth = (previewHeight * PREVIEW_ASPECT_RATIO * count + gap * (count - 1)) + 'px';
		return preview.offsetWidth;
	}

	getFreeHeight() {
		const el = this.el();
		const style = getComputedStyle(el);
		const children = [...el.children].filter((child) => child.offsetHeight);
		const first = children[0];
		const last = children[children.length - 1];
		const contentHeight = last.offsetTop + last.offsetHeight - first.offsetTop;
		return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - contentHeight;
	}

	createEl() {
		const items = this.options_.videos.map((video) => `
			<div class="vjs-next-videos__item">
				<div class="vjs-next-videos__preview">${video.preview}</div>
				<a class="vjs-next-videos__name" href="${video.url}">${video.title}</a>
			</div>
		`);

		return videojs.dom.createEl('div', {
			className: 'vjs-next-videos vjs-swipe-follow',
			innerHTML: `
				<div class="vjs-next-videos__title">${L('Похожие видео')}</div>
				<div class="vjs-next-videos__list">${items.join('')}</div>
				<button class="vjs-next-videos__replay" type="button">
					${REPLAY_ICON}
					<!-- l10n context="video-replay-action" -->
					${L('Повторить')}
				</button>
			`
		});
	}
}

videojs.registerComponent('NextVideos', NextVideos);
