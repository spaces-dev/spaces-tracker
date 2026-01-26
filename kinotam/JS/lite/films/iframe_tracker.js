import module from 'module';
import {Spaces} from '../core';
import {find_parents} from '../utils';

const IFRAME_POLLING_INTERVAL = 3000;

let last_blur_time;
let last_check_timeout;
let iframe_poll_interval;

if (('activeElement' in document) && window.addEventListener)
	startIframePolling();

function startIframePolling() {
	window.addEventListener('blur', onWindowBlur, false);
	
	iframe_poll_interval = setInterval(() => {
		let focused = document.activeElement;
		if (focused && focused.tagName == "IFRAME") {
			last_blur_time = Date.now();
			checkIfIframeClick();
		}
	}, IFRAME_POLLING_INTERVAL);
}

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
		let video_wrap = find_parents(focused, '.js-video_player_block', true);
		if (video_wrap) {
			disableTracking();
			
			Spaces.api("films.item.view", {
				Ot:	video_wrap.getAttribute('data-item-type'),
				Oi:	video_wrap.getAttribute('data-item-id'),
				V:	video_wrap.getAttribute('data-video-id'),
				CK:	null
			}, (res) => {
				if (res.code != 0)
					console.error('[iframe_tracker] ' + Spaces.apiError(res));
			}, {
				onError: (error) => {
					console.error('[iframe_tracker] ' + error);
				}
			});
			
			if (video_wrap.onExternalVieoPlay)
				video_wrap.onExternalVieoPlay();
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
