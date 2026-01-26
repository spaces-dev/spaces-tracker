(function (window) {
	/*
	 * Console
	 * */
	var n = function () {},
		m = [
			"assert", "clear", "count", "debug", "dir", "dirxml", "error", "group", "groupEnd", 
			"info", "log", "markTimeline", "profile", "profileEnd", "table", "time", "timeEnd", 
			"timeStamp", "timeline", "timelineEnd", "trace", "warn"
		],
		c = (window.console = window.console || {});
	for (var k in m)
		c[m[k]] = c[m[k]] || n;
	
	/*
	 * Date.now (IE8)
	 * */
	if (!Date.now) {
		Date.now = function () {
			return (new Date()).getTime();
		};
	}
})(window);
