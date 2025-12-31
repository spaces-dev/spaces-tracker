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
	 * Array.prototype.forEach (IE8)
	 * */
	if (!Array.prototype.forEach) {
		Array.prototype.forEach = function (action, that) {
			for (var  i = 0, n = this.length; i < n; ++i)
				action.call(that, this[i], i, this);
		};
	}

	/*
	 * Date.now (IE8)
	 * */
	if (!Date.now) {
		Date.now = function () {
			return (new Date()).getTime();
		};
	}

	/*
	 * Function.prototype.bind (IE8)
	 * */
	if (!Function.prototype.bind) {
		Function.prototype.bind = function (context /* ...args */) {
			var fn = this;
			var args = Array.prototype.slice.call(arguments, 1);

			return function () {
				return fn.apply(context, args.concat(Array.prototype.slice.call(arguments)));
			};
		}
	}

	if (!document.getElementsByName) {
		document.getElementsByName = (name) => {
			let all = document.getElementsByTagName("*");
			let result = [];
			for (let i = 0; i < all.length; i++) {
				if (all[i].getAttribute("name") === name)
					result.push(all[i]);
			}
			return result;
		};
	}

	if (!Array.prototype.includes) {
		Array.prototype.includes = function (searchElement, fromIndex) {
			// 1. Let O be ? ToObject(this value).
			if (this == null) {
				throw new TypeError('"this" is null or not defined');
			}

			var o = Object(this);

			// 2. Let len be ? ToLength(? Get(O, "length")).
			var len = o.length >>> 0;

			// 3. If len is 0, return false.
			if (len === 0) {
				return false;
			}

			// 4. Let n be ? ToInteger(fromIndex).
			//    (If fromIndex is undefined, this step produces the value 0.)
			var n = fromIndex | 0;

			// 5. If n ≥ 0, then
			//  a. Let k be n.
			// 6. Else n < 0,
			//  a. Let k be len + n.
			//  b. If k < 0, let k be 0.
			var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

			function sameValueZero(x, y) {
				return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
			}

			// 7. Repeat, while k < len
			while (k < len) {
				// a. Let elementK be the result of ? Get(O, ! ToString(k)).
				// b. If SameValueZero(searchElement, elementK) is true, return true.
				// c. Increase k by 1.
				if (sameValueZero(o[k], searchElement)) {
					return true;
				}
				k++;
			}

			// 8. Return false
			return false;
		};
	}
})(window);
