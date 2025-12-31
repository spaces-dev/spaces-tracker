import {L, ge, each, html_wrap} from './utils';

import 'Reg.css';

var SOCIAL_LINKS = {
	tg: {
		title:	"Telegram",
		url:	"https://t.me/share/url?url={link}&text={title}",
		icon:	'soc/tg.png'
	},
	twitter: {
		title:	"X",
		url:	"https://twitter.com/share?url={link}&text={title}",
		icon:	'soc/twitter.png'
	},
	vk: {
		title:	"VK",
		url:	"https://vk.com/share.php?url={link}&title={title}",
		icon:	'soc/vk.png'
	},
	ok: {
		title:	L("Одноклассники"),
		url:	"https://connect.ok.ru/offer?url={link}&title={title}&imageUrl={logo}",
		icon:	'soc/odnk.png'
	},
	fb: {
		title:	"Facebook",
		url:	"https://www.facebook.com/sharer.php?u={link}&t={title}&src=sp",
		icon:	'soc/fb.png'
	},
	mymir: {
		title:	L("Мой Мир@Mail.Ru"),
		url:	"https://connect.mail.ru/share?url={link}&title={title}&imageurl={logo}",
		icon:	'soc/mymir.png'
	},
	email: {
		title:	L("Отправить на email"),
		url:	"mailto:?Subject={title}&body={link}%0A",
		icon:	'soc/email.png'
	}
};

var tpl = {
	wrap: function (data) {
		var html = 
			'<div class="soc-links__share pad_b_a">' + 
				'<div class="pad_t_a t_center">' + 
					'<label class="grey">Поделиться:</label>' + 
				'</div>' + 
				data + 
			'</div>';
		return html;
	},
	link: function (data) {
		var html =
			'<div class="inl_bl pad_t_a">' + 
				'<a href="' + data.url + '"' + (data.blank ? ' target="_blank" rel="noopener"' : '') + ' class="js-sps soc-link ' + data.id + '" data-id="' + data.id + '" title="' + data.title + '">' + 
					'<img src="' + ICONS_BASEURL + data.icon + '" alt="' + data.id + '" class="m p16" />' + 
				'</a>' + 
			'</div>';
		return html;
	}
};

var share_link_el = ge('#share_link'),
	share_title_el = ge('#share_title'),
	site_logo_el = ge('#site_logo'),
	share_link = ((share_link_el && (share_link_el.textContent || share_link_el.innerText)) || location.href).replace(/([&?;])sid=\d+/g, '$1sid='),
	share_title = (share_title_el && (share_title_el.textContent || share_title_el.innerText)) || document.title,
	page_logo = (site_logo_el && site_logo_el.src) || "";

var elements = ge('.js-share_buttons');
for (var i = 0, l = elements.length; i < l; ++i) {
	var el = elements[i],
		html = "";
	each(SOCIAL_LINKS, function (link, id) {
		var url = link.url
			.replace(/\{link\}/g, encodeURIComponent(el.getAttribute('data-url') || share_link))
			.replace(/\{title\}/g, encodeURIComponent(el.getAttribute('data-title') || share_title))
			.replace(/\{logo\}/g, encodeURIComponent(el.getAttribute('data-logo') || page_logo));
		html += tpl.link({
			id:		id,
			title:	link.title,
			icon:	link.icon,
			url:	html_wrap(url),
			blank:	!link.direct
		});
	});
	el.innerHTML = tpl.wrap(html);
}
