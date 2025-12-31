import Device from './device';
import {ge, insert_before, each, ce, removeClass} from './utils';

var supports = null;

export function canPlayMP4() {
	return has_video(ce('video'));
}

export function initVideo(id) {
	var player = ge('#' + id);
	if (!has_video(player)) {
		var error = ge('#' + id + '_err');
		insert_before(player, error);
		player.parentNode.removeChild(player);
		
		var error_msg = ge('#' + id + '_err_msg');
		removeClass(error_msg, 'hide');
	}
	
	if (Device.engine.name == 'Blink') {
		var check_video_interval,
			load_ok;
		
		/*
			Chrome с включенным Chrome Data Saver рандомно отдаёт 404 на видео, при этом onerror не срабатывает. 
			Поэтому при первом событии play мониторим networkState, если он перешёл в NETWORK_NO_SOURCE, то
			пытаемся повторить загрузку видео.
		*/
		
		var stop_bug_monitor = function () {
			if (check_video_interval) {
				clearInterval(check_video_interval);
				check_video_interval = null;
				load_ok = true;
			}
		};
		
		player.addEventListener('play', function (e) {
			if (!load_ok) { // Только один раз выполняем этот костыль
				check_video_interval = setInterval(function () {
					if (player.networkState == 3) {
						stop_bug_monitor();
						load_ok = false;
						
						console.log('chrome save data bug!!!');
						
						try { player.load(); } catch (e) { }
						try { player.play(); } catch (e) { }
					}
				}, 500);
			}
		});
		
		each('canplaythrough durationchange canplay progress loadedmetadata'.split(' '), function (v) {
			player.addEventListener(v, stop_bug_monitor);
		});
	}
}

function has_video(player) {
	if (supports !== null)
		return supports;
	supports = false;
	if (player.canPlayType) {
		var codecs = ["avc1.42c00d, mp4a.40.2", "avc1.42c01e, mp4a.40.2", "avc1.4d401e, mp4a.40.2", "avc1.64001f, mp4a.40.2"];
		for (var i = 0; i < codecs.length; ++i) {
			if (player.canPlayType('video/mp4;codecs="' + codecs[i] + '"')) {
				supports = true;
				break;
			}
		}
	}
	return supports;
}
