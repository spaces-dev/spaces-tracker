import {ce, extend} from './utils';

var tests_cache = {};
var cache = {}, el,
	Device = window.Device;

var tests = {
	transform: function () {
		var is_old_android = navigator.userAgent.indexOf('Android 2.') > -1;
		return ((!Device.webkit() || !is_old_android) && Device.browser.name != 'operamini') && Device.css('transform', 'translate(1px,1px)', /translate/i);
	}
};

extend(Device, {
	css: check_css,
	webkit: function () {
		var m = navigator.userAgent.match(/AppleWebKit\/([\d\.]+)/);
		return m ? parseFloat(m[1]) : 0;
	},
	android: function () {
		var m = navigator.userAgent.match(/Android\s+([\d\.]+)/);
		return m ? parseFloat(m[1]) : 0;
	},
	can: function (test_name) {
		if (!(test_name in tests))
			return false;
		if (!(test_name in tests_cache))
			return (tests_cache[test_name] = tests[test_name]());
		return tests_cache[test_name];
	}
});

function can_css(name, css_style) {
	var js_prefixes = ['', 'webkit', 'Moz', 'ms', 'O'],
		css_prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'];
	var names = cache[name];
	if (!names) {
		for (var i = 0, l = js_prefixes.length; i < l; ++i) {
			var js_prefix = js_prefixes[i],
				property = css2js(name);
			if (js_prefix.length)
				property = js_prefix + property.charAt(0).toUpperCase() + property.substr(1);
			el = el || ce('div');
			if (typeof el.style[property] !== 'undefined') {
				names = cache[name] = [css_prefixes[i] + name, property];
				break;
			}
		}
	}
	return names ? names[css_style ? 0 : 1] : false;
}

function check_css(prop, val, expected) {
	var self = this;
	var prop_key = can_css(prop);
	if (expected) {
		el = el || ce('div');
		el.style[prop_key] = val;
		if (!expected.test(el.style[prop_key] + ""))
			prop_key = false;
	}
	return prop_key;
}

function check_val(v) {
	return v !== null && v !== undefined;
}

function css2js(name) {
	return (name || '').replace(/-([a-z])/g, function(s, s1) {
		return (s1 || '').toUpperCase();
	});
}

function can_eom(o, prop, vendor) {
	var vendor = vendor || ["", "webkit", "moz", "o", "ms"];
	for (var i = 0; i < vendor.length; ++i) {
		var p = !vendor[i].length ? prop : vendor[i] + prop.substr(0, 1).toUpperCase() + prop.substr(1);
		if (p in o)
			return p;
	}
	return false;
}

export default Device;
export {css2js};
