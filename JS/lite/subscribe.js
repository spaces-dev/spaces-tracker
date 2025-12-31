import {Events} from './events';
import {Spaces, Codes, node_data} from './core';
import {ge, L, toggleClass, removeClass, insert_after, addClass, hasClass} from './utils';

let CLASS_ROW_WRAP = ['js-row', 'wrapper'];

let curr_state,
	curr_menu,
	curr_link;

init();

function init() {	
	Events.glob('click', {
		'.js-subscr_link': function (e) {
			curr_link = this;
			curr_state = node_data(curr_link);
			
			if (curr_state.error)
				return;
			
			if (curr_state.rand) {
				showMenu(ge('#' + curr_state.sub + '_confirm_' + curr_state.type + '_' + curr_state.rand));
			} else {
				routeAction();
			}
			
			return false;
		},
		'.js-subscr_ok': function (e) {
			routeAction();
			return false;
		},
		'.js-subscr_cancel': function (e) {
			hideMenu();
			return false;
		}
	});
}

function routeAction() {
	let states = {
		'friend': {
			'add': {
				method: 'friends.offer',
				friends: 'revoke'
			},
			'revoke': {
				method: 'friends.revokeOffer',
				friends: 'add'
			},
			'delete': {
				method: 'friends.delete',
				friends: 'add',
				lenta: 'add'
			}
		},
		'lenta': {
			'add': {
				method: 'lenta.authorAdd',
				lenta: 'delete'
			},
			'delete': {
				method: 'lenta.authorDelete',
				lenta: 'add'
			}
		}
	};
	
	let state = states[curr_state.sub][curr_state.type];
	let api_data = {CK: null};
	
	if (curr_state.sub == 'lenta') {
		api_data.Aid = curr_state.author_id;
		api_data.At = curr_state.author_type;
	} else {
		api_data.user = curr_state.user;
	}
	
	let message = curr_menu && curr_menu.getElementsByTagName('textarea')[0];
	if (message) {
		message = message.value;
		if (message.length > 100) {
			Spaces.showError(L('Длина сообщения не должна превышать 100 символов.'));
			return false;
		}
		api_data.message = message;
	}
	
	let fallback = curr_link.getElementsByTagName('a')[0];
	Spaces.api(state.method, api_data, function (res) {
		let dup = res.code == Codes.LENTA.ERR_SUBSCR_ALREADY_EXISTS || res.code == Codes.LENTA.ERR_SUBSCR_NOT_FOUND || 
			res.code == Codes.FRIENDS.ERR_OFFER_EXISTS || res.code == Codes.FRIENDS.ERR_ALREADY_FRIENDS;
		
		if (res.captcha_url && fallback) {
			location.assign(fallback.href);
		} else if (res.code == 0 || dup) {
			if (res.offer_accepted) {
				switchState('friend', 'delete');
				switchState('lenta', 'delete');
			} else {
				if (state.friends)
					switchState('friend', state.friends);
				if (state.lenta)
					switchState('lenta', state.lenta);
			}
			hideMenu();
		} else {
			Spaces.showError(res.$error);
		}
	}, {
		onError: function (error) {
			Spaces.showError(error);
		}
	});
}

function switchState(sub, action) {
	let links = ge('.js-subscr_link');
	for (let i = 0; i < links.length; ++i) {
		let link = links[i], data = node_data(link),
			ok_author = data.author_id && curr_state.author_id == data.author_id && curr_state.author_type == data.author_type,
			ok_user = data.user && curr_state.user == data.user;
		
		if (ok_author || ok_user) {
			if (sub == data.sub)
				toggleClass(link, 'hide', data.type != action);
		}
	}
}

function showMenu(menu) {
	let same = curr_menu && curr_menu.id == menu.id;
	hideMenu();
	if (!same) {
		let parent = find_parent(curr_link);
		curr_menu = menu;
		removeClass(curr_menu, 'hide');
		insert_after(curr_menu, parent);
		
		if (parent.className.indexOf('wrapper') < 0)
			curr_menu.className = 'bord-botm';
	}
}

function hideMenu() {
	if (curr_menu) {
		addClass(curr_menu, 'hide');
		insert_after(curr_menu, curr_link);
		curr_menu = null;
	}
}

function find_parent(orig_el) {
	let el = orig_el;
	while (el) {
		if (el.nodeType == 1) {
			let name = el.tagName.toLowerCase();
			for (let i = 0; i < CLASS_ROW_WRAP.length; ++i) {
				if (hasClass(el, CLASS_ROW_WRAP[i]))
					return el;
			}
		}
		el = el.parentNode;
	}
	return orig_el;
}


