import {extend, L, ce, ge, each} from './utils';

/*
	Одиночный инстанс:
		play        | Переключаем инстанс
		stop        | pause + setPosition
		pause       | Текущий инстанс - пауза, иначе только обновляем переменные
		setVolume   | Текущий инстанс - меняем громкость, иначе только обновляем переменные
		setPosition | Текущий инстанс - перемотка, иначе только обновляем переменные
*/

var global_audio, sounds = {}, cur_instance, errors_cnt = 0,
	events_list = {}, instances_cnt = 0, active_instances = 0,
	ua = navigator.userAgent,
	is_ios = /(ipad|iphone|ipod)/i.test(ua),
	is_android23 = /android\s2\.3/i.test(ua),
	is_safari = (ua.match(/safari/i) && !ua.match(/chrome/i)),
	is_firefox = ua.match(/firefox/i),
	// https://bugs.webkit.org/show_bug.cgi?id=32159
	is_bad_safari = (!is_safari && !ua.match(/silk/i) && ua.match(/OS X 10_6_([3-7])/i));
;
var Sound = function (opts) {
	var self = this,
		sound_id = instances_cnt++,
		need_single_html5 = !(is_ios || is_android23),
		use_single_audio = false,
		audio,
		is_flash = false,
		
		ready_queue = [],
		destroyed = false,
		is_ready = false,
		error_called = false,
		track_loaded = false,
		load_called = false,
		current_src,
		current_volume = 100,
		player_events; // События
	
	sounds[sound_id] = self;
	
	extend(self, {
		load: function (src) {
			if (checkInstance()) {
				// Загружаем новый трек
				loadTrack(src);
			} else {
				// Если не текущий инстанс, то только сохраняем URL
				current_src = src;
			}
			return self;
		},
		isSingle: function () {
			return use_single_audio;
		},
		play: function () {
		//	console.warn('play()');
			playTrack(true);
			return self;
		},
		pause: function () {
		//	console.warn('pause()');
			playTrack(false);
			return self;
		},
		stop: function () {
		//	console.warn('stop()');
			self.setPosition(0);
			playTrack(false);
			is_flash && audio.flashSync();
			return self;
		},
		destroy: function () {
		//	console.warn('destroy()');
			if (destroyed)
				return;
			
			if (checkInstance())
				html_events(audio, player_events, false);
			
			// Убиваем HTML5 плеер только если это не синглинстанс или последний
			if (!use_single_audio || active_instances == 1) {
			//	console.log('real destory');
				if (is_flash) {
					audio.flashDestory();
				} else {
					audio.muted = true;
					audio.pause();
					audio.src = 'about:blank';
				}
				delete sounds[sound_id];
				global_audio = cur_instance = undefined;
			}
			
			audio = opts = player_events = null;
			
			--active_instances;
			destroyed = true;
		},
		setVolume: function (volume) {
		//	console.warn('setVolume('+volume+')');
			current_volume = volume;
			if (checkInstance()) {
				audio.volume = current_volume / 100;
				is_flash && audio.flashSync();
			}
		},
		setPosition: function (position) {
			try {
				if (checkInstance()) {
					audio.currentTime = position;
					is_flash && audio.flashSync();
				}
				self.currentTime = position;
			} catch (e) { }
		},
		_unbind: function () { // Метод отвязки инстанса от HTML5 плеера
			html_events(audio, player_events, false); // Убиваем ивенты
			if (self.playing)
				triggerEvent('pause');
			playTrack(false); // Ставим на паузу
			triggerEvent('buffer', {pct: self.buffered = 0});
			track_loaded = false;
		},
		ready: function (callback) {
			if (is_ready) {
				callback && callback.apply(self, [self]);
			} else {
				ready_queue.push(callback);
			}
		}
	});
	preInitSound();
	
	// Выбор текущего инстанса
	function switchInstace() {
		if (!use_single_audio)
			return;
		if (cur_instance != sound_id) {
			var rewind = self.currentTime,
				instance = sounds[cur_instance];
			instance && instance._unbind();
			cur_instance = sound_id;
			html_events(audio, player_events, true);
			loadTrack(current_src);
			self.setPosition(rewind);
		//	console.error('Меняем инстанс');
		}
	}
	
	function checkInstance() {
		return !use_single_audio || cur_instance == sound_id;
	}
	
	function preInitSound() {
		opts = extend({
			autoLoad: false
		}, opts);
		
		audio = global_audio || create_audio();
		if (!audio && has_adobe_flash()) { // Если есть флеш
			import("./sound_flash").then(function ({FlashAudio}) {
				audio = new FlashAudio({
					autoLoad: opts.autoLoad
				});
				is_flash = true;
				initSound();
			});
		} else {
			initSound();
		}
	}
	
	function initSound() {
		resetProps();
		++active_instances;
		
		if (!sound_id && !is_flash)
			use_single_audio = need_single_html5;
		
		if (!audio) {
			triggerEvent('unsupported');
			return;
		}
		
		if (!sound_id && use_single_audio) {
			global_audio = audio;
			cur_instance = sound_id;
		}
		
		var canplay = function (e) {
			if (!track_loaded) {
			//	console.log('canplay');
				setLoading(false);
				try { audio.currentTime = self.currentTime || (is_flash ? 0 : 0.01); } catch(e) { }
				audio.volume = current_volume / 100;
				audio.muted = false;
				is_flash && audio.flashSync();
				playTrack(self.playing);
			} 
		};
		var duration_update = function (true_duration) {
			if (track_loaded) {
				errors_cnt = 0;
				
				// UC Browser сначала шлёт 0.1 в duration
				if (self.duration != audio.duration && (true_duration || audio.duration > 0.3)) {
					self.duration = audio.duration;
					triggerEvent('durationChange');
				}
				if (self.currentTime != audio.currentTime) {
					self.currentTime = audio.currentTime;
					triggerEvent('timeUpdate');
				}
			} else if (audio.duration && is_firefox) {
				// Костыль для FireFox mobile
				canplay();
			}
		};
		
		html_events(audio, player_events = {
			play: function () {
				if (!track_loaded)
					return;
				self.playing = true;
				triggerEvent('play');
			},
			pause: function () {
				if (!track_loaded)
					return;
				self.playing = false;
				triggerEvent('pause');
			},
			// Начинаем играть только когда пришёл первый canplaythrough
			canplay: canplay,
			canplaythrough: canplay,
			loadeddata: duration_update,
			loadedmetadata: duration_update,
			durationchange: duration_update,
			timeupdate: duration_update,
			progress: function (e) {
				duration_update();
				
				if (e.loaded && e.total && e.loaded == e.total)
					canplay();
				
				if (audio.buffered.length > 0) {
					var end = audio.buffered.end(audio.buffered.length - 1);
					self.duration = audio.duration;
					self.buffered = end / audio.duration;
					
					triggerEvent('buffer', {
						pct: self.buffered
					});
				}
			},
			ended: function () {
				duration_update(true);
				
				if (!track_loaded)
					return;
				self.ended = true;
				triggerEvent('ended');
			},
			error: function (e) {
				// UC Browser шлёт событие error вместо ended. WTF?
				if (track_loaded && Math.abs(self.duration - self.currentTime) < 1 && self.duration > 0) {
					self.ended = true;
					triggerEvent('ended');
					return;
				}
				
				var err_net = L('Ошибка загрузки'),
					err_decode = L('Ошибка декодирования'),
					// https://dev.w3.org/html5/spec-author-view/video.html#mediaerror
					errors = ['', err_net, err_net, err_decode, 'Invalid source'];
				
				var error_msg;
				if (e && e.target && audio.error) {
					error_msg = '#' + audio.error.code + ':' + (errors[audio.error.code] || err_net);
				} else if (is_flash) {
					error_msg = e || err_net;
				} else {
					error_msg = err_net;
				}
				
				if (!error_called) {
					error_called = true;
					console.error('AUDIO ERROR [' + errors_cnt + ']: ' + error_msg + ' ' + audio.src);
					if (errors_cnt <= 4) {
						track_loaded = false;
						setTimeout(function () {
							var need_play = self.playing;
							self.load(current_src);
							playTrack(need_play);
						}, 500 * errors_cnt);
						++errors_cnt;
					} else {
						triggerEvent('error', error_msg);
					}
				}
			}
		}, true);
		
	//	remove_events = html_events(audio, events, true);
		
		if (!is_flash) {
			triggerEvent('ready');
		} else {
			html_events(audio, {
				flashInit: function () {
					triggerEvent('ready');
				}
			}, true);
		}
		
		// deffered ready
		is_ready = true;
		if (ready_queue.length) {
			for (var i = 0; i < ready_queue.length; ++i)
				self.ready(ready_queue[i]);
		}
	}
	
	function playTrack(state) {
		state && switchInstace(); // Выбираем этот инстанс только если play
		if (track_loaded) {
			if (audio.paused == state) {
				try {
					state ? audio.play() : audio.pause();
				} catch (e) {
					console.error(e);
				}
			}
		} else {
			if (!load_called)
				realLoadTrack();
			if (self.playing != !!state)
				triggerEvent(state ? 'play' : 'pause');
		}
		self.playing = !!state;
	}
	
	function loadTrack(src) {
		current_src = src;
		error_called = false;
		load_called = false;
		setLoading(true);
		audio.src = src;
		audio.autobuffer = 'auto';
		audio.preload = 'auto';
		if (opts.autoLoad)
			realLoadTrack();
		return self;
	}
	
	function realLoadTrack() {
		audio.load();
		load_called = true;
		triggerEvent('loadStart');
	}
	
	function triggerEvent(event, e) {
		event = 'on' + event.substr(0, 1).toUpperCase() + event.substr(1);
		try {
			opts[event] && opts[event].apply(self, [e]);
		} catch (e) { console.error(e); }
	}
	
	function setLoading(flag) {
		if (!flag && !track_loaded)
			triggerEvent('loadEnd');
		
		track_loaded = !flag;
		if (!track_loaded)
			resetProps();
	}
	
	function resetProps() {
		self.ended = self.playing = false;
		self.buffered = self.duration = self.currentTime = 0;
	}
};

function create_audio() {
	var html5_audio, force_flash = false, is_flash = false;
	if ((is_bad_safari && !has_adobe_flash()) || !document.cookie.match(/audio_force_flash=1/) || !has_adobe_flash()) {
		try {
			html5_audio = window.Audio ? new Audio() : ce('audio');
		} catch (e) { // opera 9 fix
			html5_audio = window.Audio ? new Audio(null) : ce('audio');
		}
		if (!html5_audio || !html5_audio.canPlayType || !html5_audio.canPlayType('audio/mpeg').replace(/no/, ''))
			html5_audio = false;
	}
	return html5_audio;
}

function get_adobe_flash_ver(desc) {
	if (desc) {
		var matches = desc.match(/[\d]+/g);
		return +(matches[0] + '.' + matches[1]);
	}
	return 0;
}

function has_adobe_flash() {
	var ver = 0;
	if (navigator.plugins && navigator.plugins.length) {
		var plugin = navigator.plugins["Shockwave Flash"];
		ver = get_adobe_flash_ver(plugin && plugin.description);
	} else {
		if (navigator.mimeTypes && navigator.mimeTypes.length) {
			var plugin = navigator.mimeTypes["application/x-shockwave-flash"];
			ver = get_adobe_flash_ver(plugin && plugin.enabledPlugin && plugin.enabledPlugin.description);
		} else {
			try {
				var f = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
				ver = get_adobe_flash_ver(f.GetVariable("$version"));
			} catch (e) { }
		}
	}
	return ver >= 9; // Нам нужен только flash9
}

function html_events(el, events, add) {
	if (!el.addEventListener)
		return;
	each(events, function (v, k) {
		add ? el.addEventListener(k, v, false) : el.removeEventListener(k, v);
	});
	if (add) {
		return function () {
			html_events(el, events, false);
		};
	}
}

export {Sound};
