import videojs from 'video.js';

const Component = videojs.getComponent('Component');

videojs.registerPlugin('bigPlayingStatus', function VideoJsBigPlayingStatus(options = {}) {
	this.addChild('BigPlayingStatus', options);
});

class BigPlayingStatus extends Component {
	constructor(player, options = {}) {
		super(player, options);

		const el = this.el();
		el.addEventListener('animationend', () => {
			el.classList.remove('vjs-big-playing-status--animation');
		});

		let firstPlayed = false;
		player.one('firstplay', () => {
			firstPlayed = true;
		});
		player.on(['play', 'pause'], () => {
			const el = this.el();
			if (firstPlayed)
				el.classList.add('vjs-big-playing-status--animation');
		});
	}

	createEl() {
		const block = videojs.dom.createEl('div', {
			className: 'vjs-big-playing-status',
		});
		block.appendChild(videojs.dom.createEl('span', {
			className: 'vjs-icon-placeholder'
		}, {
			'aria-hidden': true
		}));
		return block;
	}
}

videojs.registerComponent('BigPlayingStatus', BigPlayingStatus);
