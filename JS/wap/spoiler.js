import {addClass, removeClass, hasClass, toggleClass, ge, each, find_parents, L} from './utils';

var Spoilers = {
	/*
		Универсальный спойлер для лайт и wap
		Пример юзания:
			onclick="return Spoilers.click(this)" data-show="about_spaces-link" data-hide="about_spaces"
	*/
	click: function (link) {
		var hide = get_elements(link.getAttribute('data-hide')),
			show = get_elements(link.getAttribute('data-show')),
			toggle = get_elements(link.getAttribute('data-toggle')),
			clazz = link.getAttribute('data-class');
		
		for (var i = 0; i < hide.length; ++i)
			addClass(hide[i], 'hide');
		for (var i = 0; i < show.length; ++i)
			removeClass(show[i], 'hide');
		
		if (toggle.length > 0) {
			var state = !hasClass(toggle[0], 'hide');
			if (clazz)
				toggleClass(link, clazz, !state);
			for (var i = 0; i < toggle.length; ++i) {
				var el = toggle[i],
					icon = ge('#' + el.id + '-icon');
				if (icon)
					icon.src = ICONS_BASEURL + icon.getAttribute(state ? 'data-show' : 'data-hide');
				toggleClass(el, 'hide', state);
			}
			each([['on', state], ['off', !state]], function (v) {
				var links = ge('.js-spoiler_' + v[0], link);
				for (var i = 0; i < links.length; ++i)
					toggleClass(links[i], 'hide', v[1]);
			});
		}
		
		return false;
	},
	expand: function (el) {
		var wrap = find_parents(el, '.js-expandadble_text_wrap', true);
		
		var full = ge('.js-expandadble_full_text', wrap)[0],
			short = ge('.js-expanadble_short_text', wrap)[0];
		
		full.style.display = 'block';
		short.style.display = 'none';
		
		return false;
	},
	extSpoiler: function (link) {
		var id = link.getAttribute('data-id'),
			place = ge('#' + link.getAttribute('data-place'));
		
		if (place) {
			var menu = ge('#' + id);
			place.appendChild(menu);
		}
		
		return Spoilers.toggle(link, id);
	},
    toggleQuote: function (id) {
		let el = ge('#quote-' + id);
		el.style.display = el.style.display != 'block' ? 'block' : 'none';
		return false;
	},
    toggle: function (el, id) {
        var spo_body = typeof id == 'string' ? ge('#' + id) : id,
			state = spo_body.style.display == 'none';
		spo_body.style.display = state ? '' : 'none';
		
		var spo_desc = ge('.spo_desc', el)[0],
			spo_desc_id = el.getAttribute('data-desc');
		if (spo_desc_id && spo_desc)
			spo_desc.innerHTML = ge('#spo-' + spo_desc_id + '-' + +state).innerHTML;
		if (el.getAttribute('data-self-hide'))
			el.style.display = 'none';
		return false;
    },
    toggleAll: function (el) {
		var flag = !+el.getAttribute('data-state');
		each(ge('.h_spl'), function (spoiler) {
			toggleClass(spoiler, 'hide', flag);
		});
		el.setAttribute('data-state', +flag);
		el.innerHTML = flag ? L('Показать скрытые комментарии') : L('Спрятать скрытые комментарии');
		return false;
	},
	spoiler: function (el) {
		var spo_all = find_parents(el, '.spo_all', true);
		return Spoilers.toggle(el, ge('.spo_text', spo_all)[0]);
	}
};
window.Spoilers = Spoilers;

function get_elements(list) {
	var ret = [];
	if (list) {
		var ids = list.split(/,\s*/);
		for (var i = 0; i < ids.length; ++i) {
			if (ids[i].substr(0, 1) != ".") {
				ret.push(ge('#' + ids[i]));
			} else {
				var result = ge(ids[i]);
				for (var j = 0; j < result.length; ++j)
					ret.push(result[j]);
			}
		}
	}
	return ret;
}
