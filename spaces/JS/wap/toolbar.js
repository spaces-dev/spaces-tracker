import {L, each, find_parents, ge, extend, ce, insert_after, addClass, removeClass, tick, hasClass, html_unwrap, base_domain, toggleClass, set_caret_pos} from './utils';

var TOGGLE_TOOLBAR_ICO = ["ico/more.png", "ico/more_black.png"];
var ICO_SPINNER = ICONS_BASEURL + 'spinner2.gif';
var ITEM_WIDTH = 21;
var TOOLBAR_ITEMS = {
	quote:	["mail/quote.png",			L("Вставить цитату")],
	url:	["mail/link.png",			L("Вставить ссылку")],
	attach:	["ico/plus.png",			L("Вставить")],
	color:	["mail/color.png",			L("Цветной текст")],
	b:		["mail/bold.png",			L("Жирный текст")],
	i:		["mail/italic.png",			L("Наклонутый текст")],
	u:		["mail/underline.png",		L("Подчёркнутый текст")],
	s:		["mail/strike.png",			L("Зачёркнутый текст")],
	fon:	["mail/background.png",		L("Фон текста")],
	more:	[TOGGLE_TOOLBAR_ICO[0],		L("Ещё")]
};

var COLORS = [
	"90CAF9 80DEEA A5D6A7 FFF59D FFCC80 FFAB91 CE93D8".split(" "),
	"2196F3 00BCD4 4CAF50 FFEB3B FF9800 F44336 9C27B0".split(" "),
	"1565C0 00838F 2E7D32 F9A825 EF6C00 C62828 6A1B9A".split(" "),
	"ECF0F1 CFD8DC B0BEC5 97A6B0 546E7A 44565E 3A474C".split(" ")
];

var tpl = {
	toolbar: function (data) {
		if (data.hide)
			return '';
		
		var html = '';
		each(TOOLBAR_ITEMS, function (d, tag) {
			if ((data.disable.bgcolor && tag == 'fon') || tag == 'more' || data.disable[tag])
				return;
			if (tag == 'attach' && !data.attach)
				return;
			html += 
				'<a href="#bb_' + tag + '" data-tag="' + tag + '" class="js-bb bb bb_' + tag + '" title="' + d[1] + '" id="' + data.id + '-' + tag + '">' + 
					'<img src="' + ICONS_BASEURL + d[0] + '" alt="" class="m" />' + 
				'</a>';
		});
		html += '<div id="bbmenu_' + data.id + '"></div>';
		return html;
	},
	length: function (data) {
		return '<span class="right grey bb_cnt"><span id="tcounter_' + data.id + '">0</span>/' + data.maxlength + '</span>';
	},
	colors: function (tag) {
		var html = '<div class="spo_inj-wrap"><div class="spo_inj"><div class="block t_center bord">';
		each(COLORS, function (colors) {
			html += '<div>';
			each(colors, function (color) {
				html += '<a href="#' + color + '" style="background:#' + color + '" data-val="#' + color + '" data-tag="' + tag + '" class="bbcolor js-bb">&nbsp;</a>';
			});
			html += '</div>';
		});
		return html + '</div></div></div>';
	}
};

var lock_events = false;

var Toolbar = function (el, options) {
	var self = this,
		timer,
		id = 'tb_' + Date.now(),
		parent = find_parents(el, '.js-toolbar_wrap', true),
		toolbar = ge('.js-toolbar', parent)[0],
		max_length = +(el.getAttribute('maxlength') || el.getAttribute('data-maxlength') || 0),
		counter,
		last_items_on_line = 0,
		toolbar_opened = false,
		bb_menu_opened = false,
		cursors;
	
	setupToolbar();
	
	function setupToolbar() {
		options = extend({toolbar: true, hide: false, disable: {}}, options);
		
		if (!options.toolbar)
			options.hide = true;
		
		if (!toolbar) {
			toolbar = ce('div', {className: 'cf'});
			if (options.toolbar) {
				el.parentNode.insertBefore(toolbar, self);
			} else {
				insert_after(toolbar, el);
			}
		}
		
		var active_attaches = ge('#active_attaches');
		if (active_attaches) {
			// Отцепляем от тулбара эту кнопку
			active_attaches.parentNode.removeChild(active_attaches);
		}
		
		addClass(toolbar, 'toolbar');
		toolbar.innerHTML = 
			(max_length && Device.browser.name != 'operamini' ? tpl.length({id: id, maxlength: max_length}) : '') +
			(tpl.toolbar({id: id, disable: options.disable, hide: options.hide, attach: active_attaches})) +
			(options.hide ? '&nbsp' : '');
		
		// Добавляем инородную кнопку активных аттачей вместо обычной
		if (active_attaches) {
			var old_active_attaches = ge('#' + id + '-attach');
			insert_after(active_attaches, old_active_attaches);
			old_active_attaches.parentNode.removeChild(old_active_attaches);
			
			active_attaches.id = old_active_attaches.id;
			addClass(active_attaches, 'bb');
			addClass(active_attaches, 'js-bb');
			addClass(active_attaches, 'js-bb_attach');
		}
		
		removeClass(toolbar, 'hide');
		
		installCallbacks();
		
		if (Device.browser.name != 'operamini' && max_length) {
			el.onfocus = function () {
				if (!lock_events) {
					timer = setInterval(lengthMonitor, 300);
					tick(updateCursors);
				}
			};
			el.onblur = function () {
				if (!lock_events) {
					clearInterval(timer);
					updateCursors(true);
				}
			};
			lengthMonitor();
		}
	}
	
	function insertTag() {
		var link = this,
			ico = link.getElementsByTagName('img')[0],
			tag = link.getAttribute('data-tag'),
			val = link.getAttribute('data-val');
		
		if (!tag)
			return;
		
		if ((tag == 'color' || tag == 'fon') && !val) {
			showMenu(tag, bb_menu_opened == tag ? false : tpl.colors(tag));
		} else if (tag == 'more') {
			last_items_on_line = 0;
			toolbar_opened = !toolbar_opened;
			fixToolbarWidth();
		} else if (tag == 'url') {
			textReplaceTag(el, function (value) {
				if (!value.length) {
					var clip_el = ge('#toolbar_payload'),
						clipboard = clip_el ? clip_el.getAttribute('data-clipboard') : "";
					return clipboard ? 
						html_unwrap(clipboard) : 
						'[url=' + location.protocol + '//' + base_domain() + ']' + L('ссылка') + '[/url]'
				} else {
					return '[url=' + value + ']' + L('ссылка') + '[/url]';
				}
			});
		} else {
			var def_values = {color: "green", fon: "LightBlue", gray: '#ccc'},
				value = val || def_values[tag];
			textInsertTag(el, '[' + tag + (value ? '=' + value : '') +']', '[/' +tag + ']', '');
			
			showMenu(false);
		}
		return false;
	}
	
	function showMenu(tag, html) {
		if (tag) {
			var exit = ge('#sm_exit_' + id);
			if (exit)
				exit.click();
		}
		
		var bbmenu = ge('#bbmenu_' + id);
		bbmenu.innerHTML = html || '';
		toggleClass(bbmenu, 'hide', !html);
		bb_menu_opened = !!html ? tag : false;
		installCallbacks();
	}
	
	function fixToolbarWidth() {
		var table = ge('#bbtable_' + id),
			items = ge('.js-bb', table),
			width = (toolbar.clientWidth - (counter ? counter.parentNode.clientWidth : 0)),
			items_on_line = Math.max(4, Math.floor(Math.min(width, (items.length - 1) * ITEM_WIDTH) / ITEM_WIDTH));
		
		toggleClass(table, 'hide', options.hide);
		
		if (last_items_on_line != items_on_line && !options.hide) {
			var elements = [],
				lines = table.getElementsByTagName('tr'),
				max_lines = (items.length - 1) / items_on_line;
			
			var more_link;
			for (var i = 0, n = 0; items.length > 0; ) {
				var item = items[i], tag = item.getAttribute('data-tag');
				if (tag != 'more') {
					var line = Math.floor((max_lines > 1 ? n + 1 : n) / items_on_line);
					(elements[line] || (elements[line] = [])).push(item.parentNode);
					++n;
				} else {
					more_link = item.parentNode;
				}
				removeNode(item.parentNode);
			}
			
			for (var i = 0; i < elements.length; ++i) {
				var list = elements[i];
				for (var j = 0; j < list.length; ++j) {
					lines[i].appendChild(list[j]);
				}
			}
			
			lines[0].appendChild(more_link);
			
			if (elements[1]) {
				removeClass(more_link, 'hide');
			} else {
				addClass(more_link, 'hide');
			}
			
			more_link.getElementsByTagName('img')[0].src = ICONS_BASEURL + TOGGLE_TOOLBAR_ICO[+toolbar_opened];
			for (var i = 1; i < lines.length; ++i)
				toggleClass(lines[i], 'hide', i > max_lines || !toolbar_opened);
			
			last_items_on_line = items_on_line;
		}
	}
	
	function installCallbacks() {
		var links = ge('.js-bb', toolbar);
		for (var i = 0; i < links.length; ++i)
			links[i].onclick = insertTag;
	}
	
	function lengthMonitor() {
		if (!counter)
			counter = ge('#tcounter_' + id);
		var text_length =  el.value.length;
		counter.innerHTML = text_length;
		counter.style.color = text_length > max_length ? 'red' : ''
	}
	
	function updateCursors(from_blur) {
		if (!cursors) {
			cursors = ce('input', {type: 'hidden', name: 'toolbar_cursor', value: "0,0"});
			toolbar.appendChild(cursors);
		}
		cursors.value = (getSelectionRange(el, from_blur) || [0, 0]).join(",");
	}
	
	function toggleToolbar(flag) {
		last_items_on_line = 0;
		options.hide = !flag;
		fixToolbarWidth();
	}
	
	function removeNode(el) {
		el.parentNode.removeChild(el);
	}
	
	this.toggle = toggleToolbar;
};

function addEvent(el, name, func) {
	el.addEventListener ? el.addEventListener(name, func, false) : el.attachEvent('on' + name, func);
}

// Получить выделенный текст в поле ввода
function getSelectionRange(el, from_blur) {
	var offset = 0, length = 0;
	if (el.selectionStart !== undefined) {
		offset = el.selectionStart;
		length = el.selectionEnd - el.selectionStart;
	} else if (document.selection && el.createTextRange) {
		lock_events = true;
		el.focus();
		var len = el.value.length;
		var s = document.selection.createRange();
		length = s.text.length;
		var tr = el.createTextRange();
		tr.moveToBookmark(s.getBookmark());
		offset = -tr.moveStart("character", -len);
		if (from_blur)
			el.blur();
		lock_events = false;
	} else {
		return null;
	}
	return [offset, length];
}

// Вставка тега
function textInsertTag(el, text1, text2, text3) {
	var fix_pos;
	textReplaceTag(el, function (value, sel) {
		var middle = value || text3;
		if (sel)
			fix_pos = sel[0] + text1.length + middle.length;
		return text1 + middle + text2
	});
	if (fix_pos)
		set_caret_pos(el, fix_pos, fix_pos);
}

// Замена выделенного текста или добавление в конец
function textReplaceTag(el, callback) {
	var sel = getSelectionRange(el),
		scroll = [el.scrollLeft, el.scrollTop];
	if (sel) {
		var new_value = callback(el.value.substr(sel[0], sel[1]), sel),
			new_pos = sel[0] + new_value.length;
		el.value = 
			el.value.substr(0, sel[0]) + 
			new_value + 
			el.value.substr(sel[0] + sel[1]);
		el.focus();
	} else {
		el.value += callback("");
		new_pos = el.value.length;
	}
	el.focus();
	set_caret_pos(el, new_pos, new_pos);
	
	el.scrollLeft = scroll[0];
	el.scrollTop = scroll[1];
}

function initToolbars(textareas) {
	for (var i = 0; i < textareas.length; ++i) {
		var ta = textareas[i],
			data = ta.getAttribute('data-toolbar');
		if (data && !ta.toolbar)
			ta.toolbar = new Toolbar(ta, eval('(' + data + ')'));
	}
}

initToolbars(document.getElementsByTagName('textarea'));
initToolbars(document.getElementsByTagName('input'));
