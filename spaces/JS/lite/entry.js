import { windowReady, loadScript } from "loader";
import Device from './device';
import './spoiler';
import './trackers';
import './loadable_item';
import cookie from './cookie';
import SPACES_PARAMS from "../core/env";

// Удобно!
window.cookie = cookie;

spaces_click_hook();

if (window.devicePixelRatio)
	cookie.set("dpr", window.devicePixelRatio);

cookie.set("theme", 'light');

if (SPACES_PARAMS.hetznerCheckURL)
	windowReady(() => import("./htz-checker"));

if (!SPACES_PARAMS.nid && !cookie.get("sandbox") && document.querySelectorAll) {
	import("./thumb-guard");
}

if (cookie.get("spaces_js_console")) {
	loadScript("https://cdn.jsdelivr.net/npm/eruda@3.4.3", () => {
		window.eruda.init();
	});
}

function spaces_click_hook() {
	var spaces_click_hook_handler = function (el, form_click) {
		while (el) {
			if (el.nodeName == "UC-CLICK" || el.nodeName == "A" || el.nodeName == "FORM") {
				var attr = el.nodeName == "FORM" ? "action" : "href",
					query = el.getAttribute('data-url-params');
				if (query) {
					el.setAttribute(attr, el.getAttribute(attr) + "?" + query);
					el.removeAttribute('data-url-params');
				}
				
				if (form_click && el.nodeName == 'UC-CLICK')
					location.href = el.getAttribute('href');
				break;
			}
			el = el.parentNode;
		}
	};
	
	if (Device.browser.name == 'operamini') {
		var links = document.querySelectorAll('a, form, uc-click');
		for (var i = 0; i < links.length; ++i)
			spaces_click_hook_handler(links[i]);
	} else {
		window.onclick = function (e) {
			spaces_click_hook_handler(e.target, true);
		};
		
		window.onauxclick = function (e) {
			if (e.button == 1)
				spaces_click_hook_handler(e.target, true);
		};
		
		window.onsubmit = function (e) {
			spaces_click_hook_handler(e.target);
		};
	}
}
