import {Events} from './events';
import {moveable} from './touch';
import {hasClass, ge, insert_after, ce, L, toggleClass, tick, each, find_parents} from './utils';
import {Sound} from './sound';
import {Spaces, parse_query} from './core';

/*
	Лёгкий плеер для TouchLite
	Умеет только в перемотку и автоматическое переключение треков на странице.
*/
let players = {},
	current, html5_audio,
	playing = false,
	track_loaded = false,
	in_rewind = false,
	VP_ID = 0,
	
	class_loading = 'progress-item__runner_anim',
	class_playing = 'playing';

tick(function () {
	each(ge('.player'), function (v, k) {
		v.id = v.id || ('player_' + (VP_ID++));
		v.onclick = function (e) {
			// Нажали на ссылку, пропускаем
			if (isLink(e.target))
				return;
			
			setupPlayer(this);
			return false;
		};
		
		setupActions(v);
	});
});

function setupActions(player_el) {
	Events.on(ge('.js-copy2me', player_el), 'click', function (e) {
		e.preventDefault();
		e.stopPropagation();
		
		let el = this;
		
		if (el.getAttribute('data-loading'))
			return;
		
		let saved = +(el.getAttribute('data-saved') || 0);
		let img = el.getElementsByTagName('img')[0];
		
		let api_method, api_data;
		if (saved) {
			api_method = 'files.delete';
			api_data = {
				CK: null,
				File_id: saved,
				Type: Spaces.TYPES.MUSIC
			};
		} else {
			let file_type = el.getAttribute('data-type');
			api_method = 'files.copy2me';
			api_data = parse_query(el.href.split('?')[1]);
			api_data.Type = Spaces.TYPES.MUSIC;
			
			if (file_type != Spaces.TYPES.MUSIC)
				api_data.Ft = file_type
		}
		
		let setLoading = function (state, saved) {
			if (state) {
				img.src = ICONS_BASEURL + 'spinner2.gif';
				el.setAttribute('data-loading', 1);
			} else {
				img.src = (saved ? ICONS_BASEURL + 'ico/ok_darkblue.png' : ICONS_BASEURL + 'ico/plus_darkblue.png');
				el.removeAttribute('data-loading');
			}
		};
		
		setLoading(true);
		
		Spaces.api(api_method, api_data, (res) => {
			if (res.code != 0 && !res.fileId) {
				console.error(`[copy2me] ${Spaces.apiError(res)}`);
				setLoading(false, saved);
				return;
			}
			
			setLoading(false, !!res.fileId);
			el.setAttribute('data-saved', res.fileId || 0);
		}, {
			onError(err) {
				console.error(`[copy2me] ${err}`);
				setLoading(false, saved);
			}
		})
	});
}

function setupPlayer(el) {
	if (!el)
		return;
	
	let id = +el.id.replace('player_', ''),
		player = players[id];
	
	if (!player) {
		player = {
			id: id,
			el: el,
			url: el.getAttribute('data-url'),
			pb: ge('.js-mpb', el)[0],
			pbl: ge('.js-mpbl', el)[0],
			time: ge('.js-mtime', el)[0],
			err: insert_after(ce('div', {
				className: 'red',
				innerHTML: ''
			}), el)
		};
		player.duration = player.time.innerHTML;
		
		Events.on(ge('.js-mplay', el), 'click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (!current || current.id != id) {
				stopTrack();
				current = player;
				if (!initTrack()) {
					current = null;
					return;
				}
				playTrack(true);
			} else {
				playTrack(!playing);
			}
		});
		
		// Перемотка
		let base_rect, rewind_pos, rewind_el = player.pb.parentNode;
		Events.on(rewind_el, 'click', function (e) {
			e.preventDefault();
			e.stopPropagation();
		});
		moveable(rewind_el, function (e) {
			if (!track_loaded)
				return;
			if (e.type == 'init') {
				if (!current || current.id != id)
					return false;
			} else if (e.type == 'start') {
				base_rect = rewind_el.getBoundingClientRect();
				if (!base_rect.width)
					base_rect = {top: base_rect.top, left: base_rect.left, width: rewind_el.offsetWidth};
				in_rewind = true;
			} else if (e.type == 'move') {
				let delta = Math.min(1, Math.max(0, (e.x - base_rect.left) / base_rect.width));
				updateTime(rewind_pos = html5_audio.duration * delta);
			} else if (e.type == 'end') {
				in_rewind = false;
				html5_audio.ready(function () {
					html5_audio.setPosition(rewind_pos);
				});
				updateTime(rewind_pos);
			}
		});
		players[id] = player;
	}
	if (!current || current.id != id) {
		stopTrack();
		current = player;
		if (!initTrack()) {
			current = null;
			return;
		}
		playTrack(true);
		return false;
	}
}
function initTrack() {
	showError('');
	showLoading(true);
	if (!html5_audio) {
		let go_next = function () {
			if (current) {
				let voice = current.el.getAttribute('data-voice');
				if (voice && !current.el.getAttribute('data-received'))
					return;
				let nextPlayer = getPlayer(current.id  + 1, voice);
				nextPlayer && setupPlayer(nextPlayer);
			}
		};
		
		html5_audio = new Sound({
			autoLoad: true,
			onPlay: function () {
				playTrack(true, true);

				if (current.el.getAttribute('data-received')) {
					let unlistened = current.el.getElementsByClassName('js-unlistened')[0];
					if (unlistened) {
						Spaces.api("mail.voice.setListened", {
							Id: current.el.getAttribute('data-voice-id'),
							CK: null,
						});
						unlistened.parentNode.removeChild(unlistened);
					}
				}
			},
			onPause: function () {
				playTrack(false, true);
			},
			onEnded: go_next,
			onTimeUpdate: function () {
				if (!in_rewind)
					updateTime(html5_audio.currentTime);
				if (!track_loaded)
					showLoading(false);
			},
			onDurationChange: function () {
				if (html5_audio.duration && track_loaded)
					showLoading(false);
			},
			onLoadStart: function () {
				showLoading(true);
			},
			onLoadEnd: function () {
				showLoading(false);
			},
			onBuffer: function (e) {
				current.pbl.style.width = (html5_audio.buffered * 100) + '%';
			},
			onError: function (error) {
				showError(error);
				go_next();
			},
			onUnsupported: function () {
				showError(L("Ваш браузер не поддерживает воспроизвидение MP3."));
			}
		});
	}
	html5_audio.ready(function () {
		html5_audio.load(current.url);
		html5_audio.setVolume(100);
	});
	return true;
}
function updateTime(time) {
	let duration = html5_audio.duration;
	if (duration) {
		current.pb.style.width = ((time * 100) / duration) + '%';
		current.time.innerHTML = formatTime(time);
	}
}
function showError(msg) {
	showLoading(false);
	if (current)
		current.err.innerHTML = msg;
}
function showLoading(flag) {
	track_loaded = !flag;
	toggleClass(current.pb.parentNode, class_loading, flag);
}
function playTrack(flag, no_change) {
	toggleClass(current.el, class_playing, flag);
	playing = flag;
	if (!no_change) {
		html5_audio.ready(function () {
			flag ? html5_audio.play() : html5_audio.pause();
		});
	}
}
function stopTrack() {
	if (!current)
		return;
	playTrack(false);
	showLoading(false);
	updateTime(0);
	current.pbl.style.width = '0%';
	current.time.innerHTML = current.duration;
	current = null;
}
function getPlayer(id, voice) {
	let player = ge('#player_' + id);
	if (player && player.getAttribute('data-type') == 'video')
		return getPlayer(id + 1, voice);
	if (player && voice && (!player.getAttribute('data-voice') || !player.getAttribute('data-received')))
		return getPlayer(id + 1, voice);
	if (player && !voice && player.getAttribute('data-voice'))
		return getPlayer(id + 1, voice);
	return player;
}
function formatTime(time) {
	let h = Math.floor(time / 3600);
	time -= h * 3600;
	let m = Math.floor(time / 60),
		s = Math.floor(time -= m * 60),
		space = '<span class="hid">0</span>';
	return (h ? (h < 10 ? space + h : h) + ":" : "") + 
		(m < 10 ? (!h ? space : '0') + m : m) + ":" + (s < 10 ? '0' + s : s);
}

function isLink(el) {
	let cursor = el;
	while (cursor) {
		if (cursor.nodeName == 'A')
			return true;
		cursor = cursor.parentNode;
	}
	return false;
}
