(function (window) {
	if (document.cookie.indexOf('android_api_test=1') >= 0) {
		window.prompt = console.log;
	}
	
	window.SpacesApp = {
		params: {},
		appInit: function (params) {
			window.prompt('init', JSON.stringify(params)); /* old android bug */
			window.prompt('init', JSON.stringify(params));
		},
		onParams: function (params) {
			this.params = params;
		},
		back: function () {
			var e = 1, o = function () { e = 0 };
			window._spcs1337 && window._spcs1337();
			window.addEventListener("popstate", o, !1);
			history.back();
			var n = setTimeout(window._spcs1337 = function () { 
				clearTimeout(n);
				window.removeEventListener("popstate", o, !1);
				e && window.prompt("closeApp", "{}");
				delete window._spcs1337
			}, 300)
		}
	};
})(window);
