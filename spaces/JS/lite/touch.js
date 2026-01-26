import {Events} from './events';
import Device from './device';

export function moveable(el, callback) {
	var in_move = false, sx, sy, x, y, true_touch;
	function on_start(e) {
		true_touch = e.type == 'touchstart';
		if (in_move || (e.touches && e.touches.length > 1))
			return;
		
		if (callback({type: 'init'}) === false)
			return;
		
		in_move = true;
		toggle_events(true);
		on_move(e, true);
		
		if (Device.browser.name == 'ucbrowser')
			return false;
	};
	function on_move(e, is_start) {
		if (!in_move || (true_touch && e.type.indexOf('touch') != 0))
			return;
		
		if (!is_start)
			cancelEvent(e);
		
		var touches = e.touches;
		if (touches) {
			y = touches[0].pageY;
			x = touches[0].pageX;
		} else {
			x = e.pageX;
			y = e.pageY;
			if (x === undefined) { // IE fix
				x = e.clientX;
				y = e.clientY;
			}
		}
		
		if (is_start) {
			sx = x; sy = y;
			callback({x: x, y: y, dx: x - sx, dy: y - sy, type: 'start'});
		}
		callback({x: x, y: y, dx: x - sx, dy: y - sy, type: 'move'});
	};
	function on_end(e) {
		if (!in_move || (e.touches && e.touches.length > 0) || (true_touch && e.type.indexOf('touch') != 0))
			return;
		
		callback({x: x, y: y, dx: x - sx, dy: y - sy, type: 'end'});
		
		cancelEvent(e);
		
		in_move = false;
		toggle_events(true);
		
		return false;
	};
	function toggle_events(flag) {
		Events.bulk(document, {
			mousemove: on_move,
			mouseup: on_end
		}, flag);
	}
	function cancelEvent(e) {
		e.preventDefault();
		e.stopPropagation();
	}
	
	Events.bulk(el, {
		mousedown: on_start,
		touchstart: on_start,
		touchmove: on_move,
		touchend: on_end,
		touchcancel: on_end
	}, true);
	
	if (Device.browser.name == "msie" && Device.browser.version <= 8) {
		Events.on(document, 'mousedown', function (e) {
			var cur = e.target || e.srcElement;
			while (cur) {
				if (cur === el)
					return on_start.apply(cur, [e]);
				cur = cur.parentNode;
			}
		});
	}
}
