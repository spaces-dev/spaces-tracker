(function (window) {
// From: https://github.com/taylorhakes/promise-polyfill

// Store setTimeout reference so promise-polyfill will be unaffected by
// other code modifying setTimeout (like sinon.useFakeTimers())
var setTimeoutFunc = setTimeout;

function isArray(x) {
	return Boolean(x && typeof x.length !== 'undefined');
}

function noop() {}

/**
 * @constructor
 * @param {Function} fn
 */
function Promise(fn) {
//	if (!(this instanceof Promise))
//		throw new TypeError('Promises must be constructed via new');
//	if (typeof fn !== 'function') throw new TypeError('not a function');
	
	/** @type {!number} */
	this._state = 0;
	/** @type {!boolean} */
	this._handled = false;
	/** @type {Promise|undefined} */
	this._value = undefined;
	/** @type {!Array<!Function>} */
	this._deferreds = [];

	doResolve(fn, this);
}

function handle(self, deferred) {
	while (self._state === 3) {
		self = self._value;
	}
	if (self._state === 0) {
		self._deferreds.push(deferred);
		return;
	}
	self._handled = true;
	setTimeoutFunc(function() {
		var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
		if (cb === null) {
			(self._state === 1 ? resolve : reject)(deferred.promise, self._value);
			return;
		}
		var ret;
		try {
			ret = cb(self._value);
		} catch (e) {
			reject(deferred.promise, e);
			return;
		}
		resolve(deferred.promise, ret);
	}, 0);
}

function resolve(self, newValue) {
	try {
		// Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
		if (newValue === self)
			throw new TypeError('A promise cannot be resolved with itself.');
		
		if (
			newValue &&
			(typeof newValue === 'object' || typeof newValue === 'function')
		) {
			var then = newValue.then;
			if (newValue instanceof Promise) {
				self._state = 3;
				self._value = newValue;
				finale(self);
				return;
			} else if (typeof then === 'function') {
				doResolve(then.bind(newValue), self);
				return;
			}
		}
		self._state = 1;
		self._value = newValue;
		finale(self);
	} catch (e) {
		reject(self, e);
	}
}

function reject(self, newValue) {
	self._state = 2;
	self._value = newValue;
	finale(self);
}

function finale(self) {
	if (self._state === 2 && self._deferreds.length === 0) {
		setTimeoutFunc(function() {
			if (!self._handled) {
				_unhandledRejectionFn(self._value);
			}
		}, 0);
	}

	for (var i = 0, len = self._deferreds.length; i < len; i++) {
		handle(self, self._deferreds[i]);
	}
	self._deferreds = null;
}

/**
 * @constructor
 */
function Handler(onFulfilled, onRejected, promise) {
	this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
	this.onRejected = typeof onRejected === 'function' ? onRejected : null;
	this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, self) {
	var done = false;
	try {
		fn(
			function(value) {
				if (done) return;
				done = true;
				resolve(self, value);
			},
			function(reason) {
				if (done) return;
				done = true;
				reject(self, reason);
			}
		);
	} catch (ex) {
		if (done) return;
		done = true;
		reject(self, ex);
	}
}

Promise.prototype['catch'] = function(onRejected) {
	return this.then(null, onRejected);
};

Promise.prototype.then = function(onFulfilled, onRejected) {
	// @ts-ignore
	var prom = new this.constructor(noop);

	handle(this, new Handler(onFulfilled, onRejected, prom));
	return prom;
};

Promise.all = function(arr) {
	return new Promise(function(resolve, reject) {
		if (!isArray(arr)) {
			return reject(new TypeError('Promise.all accepts an array'));
		}

		var args = Array.prototype.slice.call(arr);
		if (args.length === 0) return resolve([]);
		var remaining = args.length;

		function res(i, val) {
			try {
				if (val && (typeof val === 'object' || typeof val === 'function')) {
					var then = val.then;
					if (typeof then === 'function') {
						then.call(
							val,
							function(val) {
								res(i, val);
							},
							reject
						);
						return;
					}
				}
				args[i] = val;
				if (--remaining === 0) {
					resolve(args);
				}
			} catch (ex) {
				reject(ex);
			}
		}

		for (var i = 0; i < args.length; i++) {
			res(i, args[i]);
		}
	});
};

Promise.resolve = function(value) {
	if (value && typeof value === 'object' && value.constructor === Promise) {
		return value;
	}

	return new Promise(function(resolve) {
		resolve(value);
	});
};

Promise.reject = function(value) {
	return new Promise(function(resolve, reject) {
		reject(value);
	});
};

Promise.race = function(arr) {
	return new Promise(function(resolve, reject) {
		if (!isArray(arr)) {
			return reject(new TypeError('Promise.race accepts an array'));
		}

		for (var i = 0, len = arr.length; i < len; i++) {
			Promise.resolve(arr[i]).then(resolve, reject);
		}
	});
};

function _unhandledRejectionFn(err) {
	console.error('Unhandled Promise Rejection:', err);
}

// Use polyfill for setImmediate for performance gains
if (typeof setImmediate === 'function') {
	setTimeoutFunc = (cb) => setImmediate(cb);
}

// Expose the polyfill if Promise is undefined or set to a
// non-function value. The latter can be due to a named HTMLElement
// being exposed by browsers for legacy reasons.
// https://github.com/taylorhakes/promise-polyfill/issues/114
if (typeof window.Promise !== 'function')
	window.Promise = Promise;

//
})(window);
