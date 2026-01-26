import {Events} from './events';
import Device from './device';
import {Spaces} from './core';
import {ge, find_parents, tick, insert_after, toggleClass, hasClass, copyToClipboard, L} from './utils';

let last_open_link;

if (Device.browser.name != 'operamini')
	init();

function init() {
	Events.bulk(ge('.js-action_link'), {
		click(e) {
			switch (this.getAttribute('data-action')) {
				case "comment_reply":		return onCommentReply(this, e);
				case "comment_link":		return onCommentLink(this, e);
				case "comment_link_copy":	return onCommentLinkCopy(this, e);
			}
		}
	}, true);
}

function onCommentReply(link, e) {
	let wrap = ge('#comments_form_wrap'),
		form = ge('#comments_form'),
		reply = ge('#comments_form_reply'),
		textarea = form.getElementsByTagName('textarea')[0],
		comm = find_comm_wrap(link),
		attached = form.parentNode != wrap,
		is_hidden = !!ge('.comm_hidden', comm)[0],
		checkbox = document.getElementsByName('Hidden')[0];
	
	let user_place = ge('#comments_form_user'),
		real_form = find_parents(user_place, 'form', true),
		last_comm_id = real_form.getAttribute('data-comm_id');
	
	if (attached) {
		wrap.appendChild(form);
		real_form.action = real_form.getAttribute('data-action');
		
		if (last_comm_id != comm.getAttribute('data-id')) {
			tick(function () {
				link.click();
			});
		}
		if (checkbox)
			checkbox.checked = false;
		if (textarea.toolbar)
			textarea.toolbar.toggle(false);
	} else {
		insert_after(form, comm);
		real_form.setAttribute('data-action', real_form.action);
		real_form.setAttribute('data-comm_id', comm.getAttribute('data-id'));
		real_form.action = link.href.replace(/^http(s)?:\/\/([^\/?:#]+)/i, '').replace(/#.*?$/gi, '');
		if (checkbox)
			checkbox.checked = is_hidden;
		if (textarea.toolbar)
			textarea.toolbar.toggle(true);
	}
	
	toggleClass(link, 'js-clicked', !attached);
	toggleClass(reply, 'hide', attached);
	
	let user = ge('.mysite-link', comm)[0];
	user_place.innerHTML = user.parentNode.innerHTML.replace(/^\s+|\s+$/g, '');
	
	return false;
}

function onCommentLink(link, e) {
	if (last_open_link && last_open_link != link) {
		last_open_link.click();
		tick(function () {
			link.click();
		});
		return false;
	}
	
	let comm = find_comm_wrap(link),
		menu = ge('#m' + comm.getAttribute('data-id')),
		copy_link = ge('#tpl-comments_link'),
		state = !hasClass(menu, 'hide');
	
	if (!state) {
		menu.appendChild(copy_link);
		last_open_link = link;
		
		// Заполняем форму
		ge('#comm_do_copy_link').href = link.getAttribute('data-copy');
		ge('#comm_copy_link').value = comm.getAttribute('data-link');
	} else {
		last_open_link = null;
	}
	
	toggleClass(menu, 'hide', state);
	
	return false;
}

function onCommentLinkCopy(link, e) {
	let url = ge('#comm_copy_link').value;
	
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
		link.innerHTML = flag ? `<span class="green">${L('Скопировано!')}</span>` : L('Копировать');
	};
	
	set_status(true);
	
	setTimeout(() => {
		set_status(false);
		last_open_link && last_open_link.click();
	}, 1500);
	
	return false;
}

function find_comm_wrap(el) {
	while (el && !/^c\d+$/.test(el.id))
		el = el.parentNode;
	return el;
}
