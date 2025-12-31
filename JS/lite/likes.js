import require from 'require';
import {Spaces, Codes} from './core';
import {Events} from './events';
import {ge, dattr, find_parents, addClass, removeClass, L, toggleClass} from './utils';

/*
	Лёгкие лайки для Lite версии
*/
var cache = {},
	LIKE_UP_IMG		= [['vote/up_on', 'vote/up'], ['abar/vote_up_on', 'abar/vote_up']],
	LIKE_DOWN_IMG	= [['vote/down_on', 'vote/down'], ['abar/vote_down_on', 'abar/vote_down']];

export function initLikes(id) {
	const prefix = '#like_';
	let down = ge(prefix + 'down' + id);
	let up = ge(prefix + 'up' + id);
	
	if (!up)
		return;
	
	var cnt_el = ge(prefix + 'cnt' + id),
		// Объект
		ot = dattr(up, 'ot'),
		oid = dattr(up, 'oid'),
		vid = ot + '_' + oid,
		mode = dattr(up, 'mode') || 'full',
		// Кол-во голосов + и -
		total_up = +dattr(up, 'cnt'),
		total_down = down ? +dattr(down, 'cnt') : 0,
		// Иконки
		down_img = down && down.getElementsByTagName('img')[0],
		up_img = up.getElementsByTagName('img')[0],
		// Счётчики
		up_counters = [ge(prefix + 'up_cnt' + id), ge('#vote_up_cnt_' + id)], 	
		down_counters = [ge(prefix + 'down_cnt' + id), ge('#vote_down_cnt_' + id)],
		subscr_offer = ge('#subscribe_offer_' + ot + '_' + oid),
		share_offer = ge('#share_offer_' + ot + '_' + oid),
		wait = false,
		hide_error_timeout;
	
	if (up.getAttribute('data-not-auth'))
		return;
	
	var findErr = function () {
		var err = ge('#vote_err_' + vid);
		if (!err) {
			err = find_parents(up, '.js-action_bar', 1);
			if (err)
				return ge('.js-vote_error', err)[0];
		}
		return err;
	}
	
	var clearError = function () {
		var err = findErr();
		if (err) {
			addClass(err, 'hide');
			clearTimeout(hide_error_timeout);
		}
	};
	
	var showError = function (text) {
		var err = findErr();
		if (err) {
			removeClass(err, 'hide');
			err.innerHTML = text;
			hide_error_timeout = setTimeout(clearError, 4000);
		} else {
			Spaces.showError(text);
		}
	};
	
	var onclick = function (evt) {
		var is_plus = this == up,
			show_subscr = dattr(this, 'subscr'),
			clicked = dattr(this, 'clicked'),
			disabled = +dattr(up, 'disabled') || +dattr(this, 'disabled'),
			binded = dattr(up, 'binded');
		
		if (evt) {
			var err = ge('#vote_err_' + vid);
			err && addClass(err, 'hide');
		}
		
		if (disabled) {
			if (!Spaces.params.nid)
				return;
			showError(L("Вы не можете голосовать за себя."));
			return false;
		}
		
		if (binded) {
			var btn = ge('#' + (is_plus ? 'like_up' : 'like_down') + binded);
			if (btn)
				btn.click();
			return false;
		}
		
		if (evt)
			evt.preventDefault();
		
		if (wait)
			return false;
		
		var down_pressed,
			up_pressed;
		
		down_pressed = down && +dattr(down, 'clicked');
		up_pressed = +dattr(up, 'clicked');
		
		var is_delete = false,
			is_change_polarity = false;
		
		if (up_pressed || down_pressed) {
			if (is_plus && !up_pressed) {
				++total_up;
				--total_down;
				is_change_polarity = true;
			} else if (!is_plus && !down_pressed) {
				--total_up;
				++total_down;
				is_change_polarity = true;
			} else {
				is_plus ? --total_up : --total_down;
				is_delete = true;
			}
		} else {
			is_plus ? ++total_up : ++total_down;
		}
		
		up_pressed = !is_delete && is_plus;
		down_pressed = !is_delete && !is_plus;
		
		if (cnt_el) {
			// Обновляем общее число лайков
			var cnt = total_up - total_down;
			toggleClass(cnt_el, 'red', cnt < 0);
			toggleClass(cnt_el, 'green', cnt > 0);
			cnt_el.innerHTML = cnt;
		}
		
		var update_cnt = function (counters, cnt) {
			for (var i = 0; i < counters.length; ++i) {
				var el = counters[i];
				if (el) {
					if (dattr(el, 'hideable'))
						toggleClass(el, 'hide', !cnt);
					el.innerHTML = cnt;
				}
			}
		};
		
		// Обновляем кнопку За
		if (up_img) {
			for (var i = 0; i < LIKE_UP_IMG.length; ++i) {
				up_img.src = up_img.src.replace(new RegExp(LIKE_UP_IMG[i].join('|'), 'g'),
					LIKE_UP_IMG[i][up_pressed ? 0 : 1]);
			}
		}
		update_cnt(up_counters, total_up);
		
		// Обновляем кнопку Против
		if (down) {
			if (down_img) {
				for (var i = 0; i < LIKE_DOWN_IMG.length; ++i) {
					down_img.src = down_img.src.replace(new RegExp(LIKE_DOWN_IMG[i].join('|'), 'g'),
						LIKE_DOWN_IMG[i][down_pressed ? 0 : 1]);
				}
			}
			update_cnt(down_counters, total_down);
		}
		
		up.setAttribute('data-clicked', +up_pressed);
		up.setAttribute('data-cnt', total_up);
		
		if (down) {
			down.setAttribute('data-clicked', +down_pressed);
			down.setAttribute('data-cnt', total_down);
		}
		
		var voted = ge('#voted_' + ot + '_' + oid);
		if (voted && !down_pressed)
			addClass(voted, 'hide');
		
		require.loaded(import.meta.id('./gallery'), ({Gallery}) => {
			Gallery.onLike({
				oid: oid, ot: ot,
				dir: down_pressed ? -1 : (up_pressed ? 1 : 0),
				cntUp: total_up,
				cntDown: total_down
			});
		});
		
		if (share_offer)
			toggleClass(share_offer, 'hide', !up_pressed);
		
		if (!evt)
			return;
		
		var api_method = is_delete ? "voting.delete" : "voting.like",
			api_data = {
				CK: null,
				Oid: oid,
				Ot: ot,
				Widgets: show_subscr && !!subscr_offer,
				Link_id: Spaces.params.link_id
			};
		if (!is_delete)
			api_data.Down = is_plus ? 0 : 1;
		
		wait = true;
		
		Spaces.api(api_method, api_data, function (res) {
			wait = false;
			if (res.code == 0 && res.warn)
				showError(res.warn);
			
			if (res.code == 0 && down_pressed && voted)
				removeClass(voted, 'hide');
			
			if (res.code != 0 && res.code != Codes.VOTING.ERR_VOTE_NOT_FOUND) {
				showError(res.$error);
				if (is_change_polarity) {
					onclick.call(is_plus ? down : up);
				} else {
					onclick.call(is_plus ? up : down);
				}
			}
			if (subscr_offer) {
				if (res.widgets && res.widgets.author) {
					subscr_offer.style.display = '';
					ge('.js-subscribe_offer_object', subscr_offer)[0].innerHTML = res.widgets.author;
					ge('.js-subscribe_offer_button', subscr_offer)[0].innerHTML = res.widgets.subscr_link;
				} else {
					subscr_offer.style.display = 'none';
				}
			}
			
		}, {
			onError: function (error) {
				wait = false;
				showError(error);
			}
		});
		
		return false;
	};
	
	Events.off(up);
	Events.on(up, 'click', onclick);
	
	if (down) {
		Events.off(down);
		Events.on(down, 'click', onclick);
	}
}
