import videojs from './videojs/player';
import Spaces from '../../spacesLib';
import Device from '../../device';
import cookie from '../../cookie';
import BaseDriver from './base';
import { setupAds } from './videojs/openVastAds';
import { setupStatistic, setupViewTracker } from './videojs/statistic';
import { isMobilePlayer } from './videojs/plugins/utils';

// Адаптер для video.js
class VideoJsDriver extends BaseDriver {
	init(callback) {
		const video = document.createElement('video');
		video.className = `
			video-js
			vjs-fill
			vjs-big-play-centered
			${this.options.noAudioTrack ? 'vjs-no-audio' : ''}
			${isMobilePlayer() ? 'vjs-theme-touch' : 'vjs-theme-desktop'}
		`;

		// На говнобраузерах постер растягивается....
		// Нужно сделать превьюшки на 16:9 сначала
		if (Device.type == 'desktop' || Device.engine.name == 'Blink')
			video.setAttribute('poster', this.options.preview);

		// Отключаем контекстное меню у плеера
		this.container.on('contextmenu', (e) => {
			e.preventDefault();
		});

		this.container.find('.js-vp_player_frame')
			.removeClass('video-player--is-stub')
			.empty()
			.append(video);

		let controlbar_children = [
			'playToggle',
			'volumePanel',
			'progressControl',
			'currentTimeDisplay',
			'timeDivider',
			'durationDisplay',
			'controlBarSpacer',
			'qualitySelector'
		];

		// Картинку-в-Картинке включаем только в пк и только если плеер не внутри просмотрщика
		if (('exitPictureInPicture' in document) && !isMobilePlayer() && !this.options.viewer)
			controlbar_children.push('pictureInPictureToggle');

		if (isFullscreenEnabled())
			controlbar_children.push('fullscreenToggle');

		let player_options = {
			controls:				true,
			poster:					this.options.preview,
			altProxyDomains:		this.options.altProxyDomains,
			altSources:				this.options.sources,
			autoplay:				this.options.autoplay ? 'any' : false,
			preload:				this.options.autoplay ? 'auto' : 'none',
			loop:					this.options.loop,
			language:				Spaces.params.lang,
			playsinline:			true,
			nativeControlsForTouch:	false,
			enableSmoothSeeking:	true,

			userActions: {
				hotkeys: (e) => {
					if (e.which == 39) { // ArrowRight
						e.preventDefault();
						e.stopPropagation();

						player.controlBar.progressControl.seekBar.stepForward();
					} else if (e.which == 37) { // ArrowLeft
						e.preventDefault();
						e.stopPropagation();

						player.controlBar.progressControl.seekBar.stepBack();
					} else {
						player.handleHotkeys(e);
					}
				}
			},

			html5: {
				nativeTextTracks:	true,
				nativeCaptions:		true
			},

			controlBar: {
				children: controlbar_children,
				progressControl: {
					seekBar: {
						stepSeconds: isMobilePlayer() ? 10 : 5,
					}
				}
			}
		};

		if (this.options.noAudioTrack)
			player_options.muted = true;

		if (isMobilePlayer())
			player_options.disableSeekWhileScrubbingOnMobile = true;

		let player = videojs(video, player_options);
		this.player = player;

		if (this.options.viewer) {
			player.ready(() => {
				console.log('focus in viewer');
				player.focus();
			});
		}

		let old_playing;
		let trigger_pause = () => {
			if (old_playing) {
				this.trigger('pause');
				old_playing = false;
			}
		};

		player.on('play', () => {
			if (!old_playing) {
				this.trigger('play');
				old_playing = true;
			}

			this.played = true;
		});
		player.on('pause', trigger_pause);
		player.on('ended', trigger_pause);
		player.on('dispose', trigger_pause);
		player.on('volumechange', () => {
			saveVolume(player.volume(), player.muted());
		});
		player.on('fullscreenchange', () => {
			this.trigger('fullscreen', [player.isFullscreen()]);
		});
		player.on('quality-changed', (event, resolution) => {
			this.trigger('quality-changed', [resolution]);
		});

		// https://opencdn.b-cdn.net/pub/5.0/e-n-1/nonlinear_html_sample.xml?token=76b
		// https://cdnzone.nuevodevel.com/pub/5.0/e-c-1/companion_sample_05.xml
		// https://cdnzone.nuevodevel.com/pub/5.0/e-a-1/vast_adpods_sample2.xml?token=62792171
		// https://cdnzone.nuevodevel.com/pub/5.0/e-i-1/icon_sample_02x.xml?tm=123

		if (cookie.get('vast_test')) {
			this.options.vast = [
				{
					"id": "postroll",
					"offset": "end",
					"tag": 'https://opencdn.b-cdn.net/pub/5.0/e-v-1/postroll.xml',
					"type": "linear"
				},
				{
					"id": "midroll",
					"offset": "00:00:03.000",
					"tag": 'https://opencdn.b-cdn.net/pub/5.0/e-v-1/midroll.xml',
					"type": "linear"
				},
				{
					"id": "preroll",
					"offset": "start",
					"tag": 'https://opencdn.b-cdn.net/pub/5.0/e-v-1/preroll.xml',
					"type": "linear"
				}
			];
		}

		if (this.options.vast && this.options.vast.length)
			setupAds(player, this.options.vast);

		let saved_volume = getSavedVolume();
		if (saved_volume) {
			player.volume(saved_volume.volume);
			player.muted(saved_volume.muted);
		}

		if (this.options.adsOnPause)
			player.adsOnPause({ html: this.options.adsOnPause });

		// Плагины
		player.bigPlayingStatus();
		player.betterAutoplay();
		player.resizeMonitor();
		player.seekingStatus();

		if (isMobilePlayer()) {
			const isHorizontal = this.options.videoWidth && this.options.videoHeight && this.options.videoWidth / this.options.videoHeight >= 1.05;
			player.fullscreenOnRotate({
				enterOnRotate: true,
				exitOnRotate: true,
				lockOnRotate: false,
				lockToLandscapeOnEnter: false,
				lockToLandscapeOnManualEnter: isHorizontal,
			});
			player.tapToRewind();
			player.swipeFromFullscreen();
		} else {
			player.smartAltTab();
			player.hideOnBlur();
			player.fastShowOnHover();
		}

		if (this.options.duration)
			player.dummyDuration({ duration: this.options.duration });

		if (this.options.storyboard && this.options.storyboard.totalFramesCount > 0)
			player.storyboard(this.options.storyboard);

		setupStatistic(player);

		if (this.options.viewToken)
			setupViewTracker(player, this.options.viewToken);

		if (this.options.heatmap) {
			player.heatmap({
				heatmap: this.options.heatmap
			});
		}

		if (this.options.headerUrl) {
			player.videoTitle({
				title: this.options.title,
				url: this.options.headerUrl,
			});
		}

		player.ready(callback);
	}

	onStoryboardReady(totalFramesCount) {
		const storyboard = this.options.storyboard;
		if (!storyboard || this.player.getChild('Storyboard'))
			return;

		const realSpritesCount = Math.ceil(totalFramesCount / storyboard.spriteFramesCount);
		const sprites = storyboard.sprites.slice(0, realSpritesCount);

		this.player.storyboard({
			...storyboard,
			totalFramesCount,
			sprites
		});
	}

	updateSource(resolution, converted) {
		this.player.trigger('quality-enable', [resolution, converted]);
	}

	isFullscreen() {
		return this.player.isFullscreen();
	}

	setFullscreen(flag) {
		let player = this.player;
		player.ready(() => {
			if (flag) {
				if (!player.isFullscreen())
					player.requestFullscreen();
			} else {
				if (player.isFullscreen())
					player.exitFullscreen();
			}
		});
	}

	play() {
		let player = this.player;
		player.ready(() => player.play());
	}

	pause() {
		let player = this.player;
		player.ready(() => player.pause());
	}

	isPlaying() {
		return !this.player.paused()
	}

	handleGlobalKey(e) {
		const ev = new Event('keydown');
		ev.key = e.key;
		ev.code = e.code;
		ev.keyCode = e.keyCode;
		ev.which = e.which;
		this.player.el().dispatchEvent(ev);

		if (ev.defaultPrevented)
			e.preventDefault();
	}

	destroy() {
		// Не уверен в этом API, лучше завернуть в try
		try {
			if (this.player.isInPictureInPicture())
				this.player.exitPictureInPicture();
		} catch (e) { }

		this.player.dispose();

		this.player = false;
	}
}

function isFullscreenEnabled() {
	let isEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled;
	return isEnabled || isEnabled === undefined;
}

function getSavedVolume() {
	try {
		if (window.localStorage && window.localStorage["videojs"])
			return JSON.parse(window.localStorage["videojs"]);
	} catch (e) { }

	// cookie fallback
	let from_cookie = cookie.get('vjs');
	if (from_cookie) {
		let tmp = from_cookie.split(":");
		return {volume: +tmp[0], muted: tmp[1] == 1};
	}

	return false;
}

function saveVolume(volume, muted) {
	try {
		if (window.localStorage) {
			window.localStorage["videojs"] = JSON.stringify({volume, muted});
			return;
		}
	} catch (e) { }

	// cookie fallback
	cookie.set('vjs', volume + ":" + (muted ? 1 : 0));
}

export default VideoJsDriver;
