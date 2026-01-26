import module from 'module';
import {Spaces} from '../spacesLib';
import $ from '../jquery';
import { reachGoal } from '../metrics/track';

const IFRAME_POLLING_INTERVAL = 3000;

let last_blur_time;
let last_check_timeout;
let iframe_poll_interval;

module.on("componentpage", () => {
	if (window.addEventListener) {
		window.addEventListener('blur', onWindowBlur, false);
		
		iframe_poll_interval = setInterval(() => {
			let focused = document.activeElement;
			if (focused && focused.tagName == "IFRAME") {
				last_blur_time = Date.now();
				checkIfIframeClick();
			}
		}, IFRAME_POLLING_INTERVAL);
	}
});

module.on("componentpagedone", () => {
	disableTracking();
});

function disableTracking() {
	stopTracking();
	stopIframePolling();
	
	if (window.removeEventListener)
		window.removeEventListener('blur', onWindowBlur, false);
}

function stopIframePolling() {
	if (iframe_poll_interval) {
		clearInterval(iframe_poll_interval);
		iframe_poll_interval = false;
	}
}

function onWindowBlur() {
	last_blur_time = Date.now();
	checkIfIframeClick();
}

function checkIfIframeClick() {
	stopTracking();
	
	let focused = document.activeElement;
	if (focused && focused.tagName == "IFRAME") {
		let video_wrap = $(focused).parents('.js-video_player_block');
		if (video_wrap.length) {
			disableTracking();
			
			video_wrap.trigger('video_play');
			
			reachGoal("external_player_play");

			Spaces.api("films.item.view", {
				Ot:	video_wrap.data('itemType'),
				Oi:	video_wrap.data('itemId'),
				V:	video_wrap.data('videoId'),
				CK:	null
			}, (res) => {
				if (res.code != 0)
					console.error('[iframe_tracker] ' + Spaces.apiError(res));
			}, {
				onError: (error) => {
					console.error('[iframe_tracker] ' + error);
				}
			});
			
			video_wrap.trigger('video_play');
		}
	} else if (Date.now() - last_blur_time <= 500) {
		last_check_timeout = setTimeout(checkIfIframeClick, 50);
	}
}

function stopTracking() {
	if (last_check_timeout) {
		clearTimeout(last_check_timeout);
		last_check_timeout = false;
	}
}
