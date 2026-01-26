import {Events} from './events';
import {toggleClass, addClass, removeClass, find_parents, copyToClipboard, L} from './utils';
import {Spaces} from './core';
import Device from './device';

const SUPPORTED = Device.browser.name != 'operamini';

if (SUPPORTED) {
	let links = document.getElementsByClassName('js-share_menu_open')
	for (let i = 0, l = links.length; i < l; i++)
		setupMenu(links[i]);
}

function setupMenu(link) {
	Events.on(link, 'click', function (e) {
		e.preventDefault();
		
		let object = this.getAttribute('data-object');
		let menu = document.getElementById('share_menu_' + object);
		toggleClass(menu, 'hide');
		
		if (!menu.getAttribute('data-inited')) {
			setupMenuLinks(menu);
			menu.setAttribute('data-inited', 1);
		}
	});
}

function findActionLink(parent, target_action) {
	let links = parent.getElementsByTagName('a');
	for (let i = 0, l = links.length; i < l; i++) {
		let link = links[i];
		let action = link.getAttribute('data-action') || '';
		if (target_action == action)
			return link;
	}
	return false;
}

function setupMenuLinks(menu, hide_menu) {
	let copy_link = findActionLink(menu, "copy_link");
	let share_external = findActionLink(menu, "share_external");
	let cancel_link = findActionLink(menu, "cancel");
	
	// Скрываем ссылку, если браузер не умеет
	if (typeof navigator.share !== 'function')
		addClass(share_external, 'hide');
	
	if (!hide_menu) {
		hide_menu = () => {
			addClass(menu, 'hide');
		};
	}
	
	if (cancel_link) {
		Events.on(cancel_link, 'click', function (e) {
			e.preventDefault();
			hide_menu();
		});
	}
	
	if (!SUPPORTED)
		return;
	
	if (share_external) {
		Events.on(share_external, 'click', function (e) {
			e.preventDefault();
			navigator.share({url: getObjectUrl(this)});
			hide_menu();
		});
	}
	
	if (copy_link) {
		Events.on(copy_link, 'click', function (e) {
			e.preventDefault();
			
			let url = getObjectUrl(this);
			
			// Копируем в буфер браузера
			copyToClipboard(url);
			
			// Копируем в буфер сайта
			if (Spaces.params.nid) {
				Spaces.api("common.copyURL", {
					url:	url,
					CK:		null
				});
			}
			
			let set_status = (flag) => {
				this.getElementsByClassName('js-text')[0].innerHTML = flag ? L('Скопировать ссылку (скопировано)') : L('Скопировать ссылку');
			};
			
			set_status(true);
			
			setTimeout(() => {
				set_status(false);
				hide_menu();
			}, 1500);
		});
	}
}

function getObjectUrl(link) {
	let action_bar = document.getElementById('Gallery') || find_parents(link, '.js-action_bar', true);
	return action_bar.getAttribute('data-object-url');
}

export { setupMenuLinks };
