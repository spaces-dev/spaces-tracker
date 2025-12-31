import { loadScript } from "loader";
import './spoiler';

spaces_click_hook();

if (document.cookie.indexOf("spaces_js_console") >= 0) {
	loadScript("https://cdn.jsdelivr.net/npm/eruda@3.4.3", () => {
		window.eruda.init();
	});
}

if (!SPACES_PARAMS.nid && document.querySelectorAll && document.cookie.indexOf('sandbox=') < 0) {
	__require.push(["thumb-guard"]);
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
