import {tick, clearTick} from 'loader';

export function each(a, callback) {
	if (a) {
		if ('length' in a && (0 in a || !a.length)) {
			for (var i = 0, l = a.length; i < l; ++i)
				callback.call(a[i], a[i], i);
		} else {
			for (var k in a) {
				if (Object.prototype.hasOwnProperty.call(a, k))
					callback.call(a[k], a[k], k);
			}
		}
	}
}

export function base_domain(d) {
	d = d || location.host.toString();
	return d.match(/[a-zA-Z-_\d]+\.[a-zA-Z-_\d]+\.?$/)[0];
}

export function ce(tag, params, css, attrs) {
	var el = document.createElement(tag);
	var vars = [
		[params, el],
		[css, el.style],
		[attrs, 'setAttribute']
	];
	each(vars, function (v, k) {
		var vv = v[1];
		each(v[0], function (value, key) {
			if (value !== undefined) {
				typeof vv == 'string' ? el[vv](key, value) : (vv[key] = value);
			}
		});
	});
	return el;
}

export function ge(query, p) {
	var c = query.charAt(0);
	if (c == '#')
		return document.getElementById(query.substr(1));
	if (c == '.' || c == '`') {
		var parent = (p || document);
		if (parent.getElementsByClassName && c == '.') {
			return parent.getElementsByClassName(query.substr(1));
		} else {
			var elements = parent.getElementsByTagName("*"),
				out = [],
				class_name = query.substr(1),
				regexp = new RegExp('(^|\\s)' + class_name + '(\\s|$)');
			for (var i = 0; i < elements.length; ++i) {
				if (regexp.test(elements[i].className))
					out.push(elements[i]);
			}
			return out;
		}
	}
	return null;
}

export function numeral(num, titles) {
	var cases = [2, 0, 1, 1, 1, 2];
	return titles[(num % 100 > 4 && num % 100 < 20 ? 2 : cases[Math.min(num % 10, 5)])].replace(/\$n/g, num);
}

export function extend() {
	var target = arguments[0];
	for (var i = 1; i < arguments.length; ++i) {
		if (arguments[i]) {
			for (var k in arguments[i]) {
				if (Object.prototype.hasOwnProperty.call(arguments[i], k))
					target[k] = arguments[i][k];
			}
		}
	}
	return target;
}

export function addClass(o, c) {
	var re = new RegExp("(^|\\s)" + c + "(\\s|$)", "g")
	if (re.test(o.className)) return
	o.className = (o.className + " " + c).replace(/\s+/g, " ").replace(/(^ | $)/g, "")
}

export function removeClass(o, c) {
	var re = new RegExp("(^|\\s)" + c + "(\\s|$)", "g")
	o.className = o.className.replace(re, "$1").replace(/\s+/g, " ").replace(/(^ | $)/g, "")
}

export function hasClass(o, c) {
	return !!o.className.match(new RegExp('(\\s|^)' + c + '(\\s|$)'))
}

export function toggleClass(o, c, f) {
	if (typeof f != 'boolean')
		f = !hasClass(o, c);
	return (f ? addClass : removeClass)(o, c)
}

export function html_unwrap(str) {
	var map = {'quot': '"', 'lt': '<', 'gt': '>', 'nbsp': '\xA0', 'amp': '&', 'apos': '\''};
	return ((str || "") + "").replace(/&(#x[a-f\d]+|#\d+|[\w\d]+);/gim, function (m, s) {
		if (s.charAt(0) == "#") {
			var val;
			if (s.charAt(1) == "x")
				val = parseInt(s.substr(2), 16);
			else
				val = parseInt(s.substr(1));
			return String.fromCharCode(val);
		} else
			return map[s] || m;
	});
}

export function html_wrap(str) {
	var map = {"<": "lt", ">": "gt", "\"": "quot", "&": "amp", "'": "apos"};
	return ((str || "") + "").replace(/["'<>&]/gim, function (m) {
		return '&' + (map[m] || ('#' + m.charCodeAt(0))) + ';';
	});
}

export function set_caret_pos(e, start, end) {
	if (e.setSelectionRange) {
		e.focus();
		e.setSelectionRange(start, end);
	} else if (e.createTextRange) {
		var range = e.createTextRange();
		range.collapse(true);
		range.moveStart('character', start);
		range.moveEnd('character', end - start);
		range.select();
	}
}

export function L(text, strings) {
	if ((typeof strings == "object")) {
		return text.replace(/\{([\w\d-_]+)\}/gim, function (m, s) {
			return strings[s] !== undefined ? strings[s] : m;
		});
	} else if (arguments.length > 1) {
		var str = arguments;
		return text.replace(/\{(\d+)\}/gim, function (m, s) {
			return s < str.length - 1 ? str[+s + 1] : m;
		});
	}
	return text;
}

export function insert_after(el, ref_el) {
	var parent = ref_el.parentNode,
		next = ref_el.nextSibling;
	return next ? parent.insertBefore(el, next) : parent.appendChild(el);
}

export function insert_before(p, e) {
	p.parentElement.insertBefore(e, p);
	return e;
}

export function find_parents(e, selector, one) {
	var elements = [];
	if (selector) {
		var clazz, tag_name;
		if (selector[0] == '.')
			clazz = new RegExp('(^|\\s)' + selector.substr(1) + '(\\s|$)');
		else
			tag_name = selector.toLowerCase();
		
		while ((e = e.parentNode)) {
			if ((tag_name && e.nodeName.toLowerCase() == tag_name) || (clazz && clazz.test(e.className))) {
				elements.push(e);
				if (one)
					break;
			}
		}
	} else {
		while ((e = e.parentNode) && e != document)
			elements.push(e);
	}
	return one ? elements[0] : elements;
}

export {tick, clearTick} from 'loader';
