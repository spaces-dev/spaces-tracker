import {each, ge} from './utils';

const k_events = 'se' + Date.now();

function preventDefault() {
	this.returnValue = false;
}

function stopPropagaton() {
	this.cancelBubble = true;
}

function fixEvent(e) {
	e = e || window.event;

	if (e[k_events])
		return e;
	e[k_events] = true;

	e.preventDefault = e.preventDefault || preventDefault;
	e.stopPropagation = e.stopPropagaton || stopPropagaton;

	if (!e.target)
		e.target = e.srcElement;

	return e;
}

function addEvent(el, events, func) {
	if (isArrayLike(el)) {
		for (let i = 0; i < el.length; ++i)
			addEvent(el[i], events, func);
		return el;
	}

	const handlers = el[k_events] || (el[k_events] = [null, {}]);

	if (!handlers[0]) {
		handlers[0] = function (e) {
			return handler.call(el, e);
		};
	}

	events = events.split(/\s+/);
	each(events, function (event) {
		if (!handlers[1][event]) {
			handlers[1][event] = [];
			if (el.addEventListener)
				el.addEventListener(event, handlers[0], false);
			else
				el.attachEvent('on' + event, handlers[0]);
		}
		handlers[1][event].push(func);
	});

	return el;
}

function removeEvent(el, events, func) {
	if (isArrayLike(el)) {
		for (let i = 0; i < el.length; ++i)
			removeEvent(el[i], events, func);
		return el;
	}

	events = events || '*';

	const handlers = el[k_events];
	if (handlers) {
		if (events === '*') {
			const list = [];
			for (const k in handlers[1])
				list.push(k);
			return removeEvent(el, list.join(' '), func);
		}

		events = events.split(/\s+/);
		each(events, function (event) {
			const event_handlers = handlers[1][event];
			if (event_handlers) {
				if (func) {
					for (let i = event_handlers.length - 1; i >= 0; i--) {
						if (event_handlers[i] === func)
							event_handlers.splice(i, 1);
					}
				}

				if (!func || !event_handlers.length) {
					delete handlers[1][event];
					if (el.removeEventListener)
						el.removeEventListener(event, handlers[0], false);
					else
						el.detachEvent('on' + event, handlers[0]);
				}
			}
		});

		for (const k in handlers[1])
			return el;

		try {
			delete el[k_events];
		} catch (e) {
			el.removeAttribute(k_events);
		}
	}
	return el;
}

function handler(e) {
	e = fixEvent(e);
	const handlers = this[k_events][1][e.type];
	for (let i = 0; i < handlers.length; ++i) {
		if (handlers[i].call(this, e) === false)
			e.preventDefault();
	}
}

function bulkEvents(el, events, add) {
	each(events, function (v, k) {
		(add ? addEvent : removeEvent)(el, k, v);
	});
}

function isArrayLike(a) {
	return 'length' in a && (0 in a || !a.length) && a.window != window;
}

function delegate(root, selector, eventName, fn) {
	addEvent(root, eventName, (e) => {
		let target = e.target;
		while (target && target !== root) {
			if (matchesSelector(target, selector)) {
				e.delegateTarget = target;
				fn.call(target, e);
				break;
			}
			target = target.parentNode;
		}
	});
}

function matchesSelector(el, selector) {
	if (selector.charAt(0) === '.') {
		const className = selector.slice(1);
		const classes = (el.className || '').split(/\s+/);
		for (let i = 0; i < classes.length; i++) {
			if (classes[i] === className)
				return true;
		}
	}
	return false;
}

const Events = {
	on: addEvent,
	off: removeEvent,
	bulk: bulkEvents,
	delegate: delegate,
	glob: function (event, list, parent) {
		each(list, function (func, clazz) {
			const el = ge(clazz, parent);
			if (el) bulkEvents(el, {[event]: func}, true);
		});
	}
};

export {Events};
