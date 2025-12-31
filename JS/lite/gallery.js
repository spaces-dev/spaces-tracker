import {Spaces} from './core';
import Device from './device';
import {Events} from './events';
import {moveable} from './touch';
import {canPlayMP4} from './video';
import {L, base_domain, each, ge, tick, addClass, ce, toggleClass, hasClass, removeClass, light_json, dattr, nsign, extend, insert_before, insert_after} from './utils';

import "Files/Gallery.css";

let TRANSPARENT_STUB = ICONS_BASEURL + "pixel.png",
	HEADER_HEIGHT = 40,
	FOOTER_HEIGHT = 40;
let FILE_META_DECODE_MAP = [
	'#nid', '#type', 'gid', 'content', '#extType', 'parent', 'commentsLink',
	'preview', 'image', '#adult', 'resolution', 'download', '#gif', '#converted'
];
let is_om = ("" + window.operamini) === "[object OperaMini]",
	has_history = window.history && window.history.pushState && !is_om,
	can_css_transform = !is_om && Device.can('transform'),
	can_css_3d = can_css_transform && Device.can('transform3d'),
	colections_closed;

let tpl = {
	gallery: function (data) {
		let tag = is_om ? 'a' : 'span';
		let html = 
		'<div id="Gallery" class="gallery js-action_bar">' + 
			'<a name="' + data.gtop + '"></a>' + 
			'<div class="gallery__shadow"></div>' + 
			
			'<div class="gallery__header gallery__header_fs">' + 
				'<div class="gallery__header_inner">' + 
					'<div class="gallery__tools_place">&nbsp;</div>' + 
					'<a class="gallery__tools_button js-gal_fs" href="#fullscreen">' + 
						'<span class="ico_gallery ico_gallery_fullscreen"></span>' + 
					'</a>' + 
					'<div class="gallery__tools_place gallery__tools_button">&nbsp;</div>' + 
				'</div>' + 
				'<div class="gallery__loader"></div>' + 
			'</div>' + 
			
			'<div class="gallery__header" id="gallery_tools">' + 
				'<div class="gallery__header_inner">' + 
					'<a class="gallery__tools_button" href="" id="g_dloadlink" target="_blank" rel="noopener">' + 
						'<span class="ico_gallery ico_gallery_download m"></span>' + 
					'</a>' + 
					'<a class="gallery__tools_button" href="" id="g_complaint" target="_blank" rel="noopener" style="display: none">' + 
						'<span class="ico_gallery ico_gallery_complaint m"></span>' + 
					'</a>' + 
					'<div class="gallery__tools_button" id="g_placeholder">' + 
					'</div>' + 
					
					'<div class="gallery_cnt" id="gallery_cnt"></div>' + 
					
					(can_css_transform ? 
						'<a class="gallery__tools_button js-gal_zoom" href="#zoom">' + 
							'<span class="ico_gallery ico_gallery_zoom m"></span>' + 
						'</a>' : '') + 
					'<a class="gallery__tools_button js-gal_fs" href="#fullscreen">' + 
						'<span class="ico_gallery ico_gallery_fullscreen m"></span>' + 
					'</a>' + 
					
					'<a class="gallery__tools_button js-gal_exit" href="#gallery_exit">' + 
						'<span class="ico_gallery ico_gallery_exit m"></span>' + 
					'</a>' + 
				'</div>' + 
				'<div class="gallery__loader"></div>' + 
			'</div>' + 
			'<div class="gallery__image-wrapper" id="gallery_img_wrap">' + 
				'<'+tag+' class="gallery__side gallery__side_prev" data-dir="-1" href="#gprev">' + 
					'<div class="gallery__side-arrow ico_gallery ico_gallery_arrow_left"></div>' + 
				'</'+tag+'>' + 
				'<'+tag+' class="gallery__side gallery__side_next" data-dir="1" href="#gnext">' + 
					'<div class="gallery__side-arrow ico_gallery ico_gallery_arrow_right"></div>' + 
				'</'+tag+'>' + 
				
				'<img src="' + TRANSPARENT_STUB + '" alt="" id="gallery_img" class="gallery__image" />' + 
				'<div class="gallery__error gallery__image"></div>' + 
				'<div id="gallery__gif_play"></div>' + 
				'<center id="gallery_video"><div id="gallery_video_wrap"></div></center>' + 
			'</div>' + 
			`
			<div class="gallery__play_btn">
				<img src="${ICONS_BASEURL}play_btn/normal.png" alt="" width="48" width="48" class="play-btn" style="margin: -24px 0 0 -24px" />
			</div>
			` +
			'<div class="gallery__footer" id="gallery_bottom">' + 
				'<table class="gallery__footer_table"><tr id="gallery_bottom_links">' + 
					'<td class="first gallery__link" id="g_comments">' + 
						'<a href="" id="g_comments_link">' + 
							'<span class="ico_gallery ico_gallery_mess m"></span> <span id="g_commentCnt" class="gallery__link_text"></span>' + 
						'</a>' + 
					'</td>' +
					'<td class="gallery__link" id="g_collections">' + 
						'<a href="" id="g_collections_link" target="_blank">' + 
							'<span class="ico_gallery ico_gallery_plus_white m"></span>' + 
						'</a>' + 
					'</td>' + 
					'<td class="gallery__link" id="g_share">' + 
						'<span id="g_share_link">' +
							'<span class="ico_gallery ico_gallery_share m" id="g_share_icon"></span>' + 
						'</span>' +
					'</td>' + 
					'<td class="gallery__link">' + 
						'<a href="#glup" class="js-vote_btn" id="like_up_gallery" data-type="1" mode="gallery">' + 
							'<span class="ico_gallery ico_gallery_vote_up m"></span> ' + 
							'<span class="js-vote_btn_cnt gallery__link_text"></span>' + 
						'</a>' + 
					'</td>' + 
					'<td class="last gallery__link">' + 
						'<a href="#gldown" class="js-vote_btn" id="like_down_gallery" data-type="-1" mode="gallery">' + 
							'<span class="ico_gallery ico_gallery_vote_down m"></span> ' + 
							'<span class="js-vote_btn_cnt gallery__link_text"></span>' + 
						'</a>' + 
					'</td>' + 
				'</tr></table>' + 
			'</div>' + 
			'<img src="' + TRANSPARENT_STUB + '" alt="" id="gallery_preload_0" class="hide" />' + 
			'<img src="' + TRANSPARENT_STUB + '" alt="" id="gallery_preload_1" class="hide" />' + 
			'<div id="g_share_menu" class="gallery__menu"></div>' +
		'</div>';
		return html;
	},
	adult: function (what) {
		let html = 
			'<div class="gallery__error_inner">' + 
				'<div class="gallery__error-msg">' + 
					L('Внимание! Эти материалы только для взрослых! ') + 
					L('Нажимая &quot;Показать {0}&quot;, вы подтверждаете, ', what) + 
					L('что вам 18 или более лет.')  + 
				'</div>' + 
				'<div class="gallery_error-side prev"></div>' + 
				'<div class="gallery_error-side next"></div>' + 
				'<a href="#g-adult-show" class="gallery__button" id="gallery_adult_show">' + 
					'<span class="ico_gallery ico_gallery_eye m"></span> ' + 
					'<span class="m">' + L('Показать  {0}', what) + '</span>' + 
				'</a>' + 
			'</div>';
		return html;
	},
	notif: function (data) {
		let html = 
			'<div id="gallery_notif">' + 
				'<table class="gallery__notif_inner"><tr>' + 
					'<td>' + data.text + '</td>' + 
					'<td style="width:18px">' + 
						'<a href="#gnc" class="js-gal_notif_close">' + 
							'<span class="ico_gallery ico_gallery_exit m"></span>' + 
						'</a>' + 
					'</td>' + 
				'</tr></table>' + 
			'</div>';
		return html;
	},
	videoStub: function (data) {
		return `
			<div class="player-dummy_wrap">
				<div class="player-dummy">
					<img src="${data.preview}" alt="" class="preview" />
				</div>
			</div>
		`;
		return html;
	},
	collectionsMotivator: function (data) {
		let html = 
			'<div class="t_center">' + 
				'Сохраните этот файл в свою коллекцию. Нажмите кнопку ' + 
				'<a href="' + data.link + '">' + 
					'<img class="m" alt="" src="' + ICONS_BASEURL + 'ico/plus_white.png" />' + 
				'</a>' + 
			'</div>';
		return html;
	},
	onlyAuthMotivator: function () {
		let html = 
			'<div class="t_center">' + 
				'<div class="m">' + L('Извините, эта функция доступна только зарегистрированным пользователям.') + '</div>' + 
				'<span class="m">' + L('Узнайте все преимущества') + '</span> ' + 
				'<a href="/registration/" class="inl-link link-blue">' + 
					'<span class="m">' + L('регистрации') + '</span> ' + 
					'<img src="' + ICONS_BASEURL + 'ico/arr3_r_blue.png" alt="" class="m" />' + 
				'</a>' + 
			'</div>';
		return html;
	}
};
let gallery_list = {},
	items_cache = [],
	current,
	gallery,
	gallery_rect,
	last_scroll,
	fullscreen = false,
	zoomed = false,
	gifed,
	zoom_inited,
	last_zoom_pos;

init();

function init() {
	let can_mp4 = !is_om && canPlayMP4(),
		links = ge('.gview_link');
	for (let i = 0; i < links.length; ++i) {
		let link = links[i],
			meta = getItemMeta(link);
		
		if (!meta.image)
			continue;
		
		if (meta.content == 'video' && (!can_mp4 || is_om || !meta.converted))
			continue;
		
		link.onclick = openGallery;
		
		if (!gallery_list[meta.gid])
			gallery_list[meta.gid] = [];
		meta.n = gallery_list[meta.gid].length;
		gallery_list[meta.gid].push(meta);
	}
	
	if (getLocationState('gallery')) {
		openGalleryFromUrl();
		setLocationState('gallery', false);
	}
	
	if (has_history) {
		window.addEventListener('popstate', function (e) {
			if (current && !getLocationState('gallery'))
				closeGallery(true);
			if (!current && getLocationState('gallery')) {
				if (!openGalleryFromUrl())
					setLocationState('gallery', false);
			}
		}, false);
	}
	
	Events.bulk(window, {
		resize: onGalleryResize,
		orientationchange: onGalleryResize,
		keydown: onGalleryKey
	}, true);
}

function openGalleryFromUrl() {
	let state = getLocationState('gallery');
	if (state) {
		tick(function () {
			state = state.split("/");
			if (gallery_list[state[0]] && gallery_list[state[0]][state[1]]) {
				gallery_list[state[0]][state[1]].el.click();
				return true;
			}
		});
	}
}

function playGif() {
	replaceImage(gifed ? current.image : current.gif);
	toggleClass(gallery, 'gallery__gif_playing', !gifed);
	gifed = !gifed;
}

function openGallery(e) {
	if (current)
		return false;
	
	zoom_inited = false;
	last_scroll = getScrollTop();
	
	let item = getItemMeta(this),
		gtop = 'gtop' + Date.now();
	
	addClass(document.body, 'gallery__open');
	addClass(document.body, 'gallery__doc');
	addClass(document.documentElement, 'gallery__doc');
	
	document.body.appendChild(ce('div', {
		innerHTML: tpl.gallery({gtop: gtop})
	}).firstChild);
	
	gallery = ge('#Gallery');
	toggleClass(gallery, 'gallery__pc', Device.pc);
	
	selectItem(item.gid, item.n);
	
	Events.glob('click', {
		'.gallery__side': function (e) {
			rewind(+this.getAttribute('data-dir'));
			return false;
		},
		'.js-gal_exit': function (e) {
			closeGallery();
			return false;
		},
		'.js-gal_zoom': function (e) {
			toggleZoom(!zoomed);
			return false;
		},
		'#gallery__gif_play': function (e) {
			playGif();
			return false;
		},
		'.js-gal_fs': function (e) {
			fullscreen = !fullscreen;
			toggleClass(gallery, 'gallery__fullscreen', fullscreen);
			onGalleryResize();
			return false;
		},
		'#g_share_link': function (e) {
			if (this.className.indexOf('disabled') >= 0)
				return;
			toggleShareMenu();
			return false;
		},
		'.gallery__link': function (e) {
			if (hasClass(this, 'disabled')) {
				let link = this.getElementsByTagName('a')[0],
					what = current.content == 'video' ? L("видео") : L("фото"),
					auth = Spaces.params.nid;
				
				let errors = {
					g_comments_link: L('У этого {0} нет комментариев.', what),
					g_collections_link: auth ? L("Это {0} нельзя сохранять в коллекции.", what) : tpl.onlyAuthMotivator(),
					like_up_gallery: auth ? L("Это {0} нельзя лайкать.", what) : tpl.onlyAuthMotivator(),
					like_down_gallery: auth ? L("Это {0} нельзя дислайкать.", what) : tpl.onlyAuthMotivator()
				};
				if (errors[link.id])
					showNotif(errors[link.id]);
				
				return false;
			}
		}
	});
	tick(onGalleryResize);
	
	// Анимация стрелочек
	if (!is_om) {
		let i = 0;
		let interval = setInterval(function () {
			if (!gallery || i == 1)
				clearInterval(interval);
			++i;
			if (gallery)
				toggleClass(gallery, 'gallery-arrows');
		}, 800);
	}
	
	if (is_om) {
		// Если открыть просмотрщик с самого низа ленты, то размер документа не уменьшается и не скролится вверх
		// Это едиственный способ проскроллить вверх
		location.hash = '#' + gtop;
	}
	
	// Autoplay GIF
	if (item.gif)
		playGif();
	
	return false;
}

function closeGallery(from_history) {
	if (has_history && !from_history) {
		history.back();
		return;
	}
	if (gallery) {
		removeClass(document.body, 'gallery__open');
		removeClass(document.body, 'gallery__doc');
		removeClass(document.documentElement, 'gallery__doc');
		document.body.style.cssText = "";
		
		gallery.parentNode.removeChild(gallery);
		current = gallery = null;
		
		window.scrollTo(0, last_scroll);
		tick(function () {
			window.scrollTo(0, last_scroll);
		});
	}
}

function onGalleryKey(e) {
	if (!current)
		return;
	
	let code = e.keyCode || e.which;
	if (code == Spaces.KEYS.ESC) {
		closeGallery();
	} else if (code == Spaces.KEYS.UP) {
		toggleZoom(true);
	} else if (code == Spaces.KEYS.DOWN) {
		toggleZoom(false);
	} else if (code == Spaces.KEYS.LEFT) {
		rewind(-1);
	} else if (code == Spaces.KEYS.RIGHT) {
		rewind(1);
	}
	
	return false;
}

function onGalleryResize() {
	if (!current)
		return;
	
	let min_height = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
	if (min_height)
		document.body.style.cssText = "min-height:" + min_height + "px !important";
	
	gallery_rect = getGalleryRect();
	if (current.gif) {
		let play = ge('#gallery__gif_play');
		play.style.top = (gallery_rect.h - play.offsetHeight) / 2 + "px";
	}
	
	if (current.content == 'video') {
		let video = ge('#gallery_video_wrap'),
			wide_size = videoResize(gallery_rect.w, gallery_rect.h);
		video.style.width = wide_size[0] + 'px';
		video.style.marginTop = (gallery_rect.h - wide_size[1]) / 2 + "px";
	}
	
	let share_menu = ge('#g_share_menu');
	share_menu.style.bottom = FOOTER_HEIGHT + 'px';
	
	let error = ge('.gallery__error', gallery)[0];
	if (error) {
		let mr = (gallery_rect.w - error.offsetWidth) / 2;
		error.style.marginLeft = mr / 2 + "px";
		error.style.marginRight = mr / 2 + "px";
	}
	
	if (is_om) {
		gallery.height = gallery_rect.h + "px";
		gallery.width = gallery_rect.w + "px";
	}
	
	toggleSmallScreenMode();
}

function toggleSmallScreenMode() {
	// Кнопка шеринга/коллекций
	let is_small_screen = (Math.min(gallery_rect.w, gallery_rect.h) < 340);
	let collections_link = document.getElementById('g_collections');
	let comments_link = document.getElementById('g_comments');
	let share_link_ico = document.getElementById('g_share_icon');
	let share_link = document.getElementById('g_share');
	let gallery_bottom_links = document.getElementById('gallery_bottom_links');
	
	collections_link.style.display = is_small_screen ? 'none' : '';
	share_link_ico.className = is_small_screen ? 'ico_gallery ico_gallery_dots m' : 'ico_gallery ico_gallery_share m';
	
	if (is_small_screen) {
		insert_before(comments_link, share_link);
	} else {
		insert_after(share_link, collections_link);
	}
	
	// Фуллскрин меню шеринга/коллекций
	let share_menu = ge('#g_share_menu');
	let share_menu_opened = !hasClass(g_share_menu, 'hide');
	if (is_small_screen) {
		gallery.style.display = share_menu_opened ? 'none' : '';
		share_menu.style.position = 'static';
		document.body.appendChild(share_menu);
	} else {
		gallery.style.display = '';
		share_menu.style.position = 'absolute';
		gallery.appendChild(share_menu);
	}
}

function rewind(dir) {
	let offset = current.n + dir,
		group_items = gallery_list[current.gid];
	
	if (offset < 0)
		offset = group_items.length - 1;
	if (offset >= group_items.length)
		offset = 0;
	
	selectItem(current.gid, offset);
}

function selectItem(gid, id) {
	if (current && current.adult)
		showError(false);
	
	gifed = false;
	
	let dloadlink = ge('#g_dloadlink');
	let group_items = gallery_list[gid];
	let item = group_items[id];
	
	current = item;
	
	if (item.content == 'video') {
		renderVideo();
	} else {
		replaceImage(item.image)
	}
	toggleClass(gallery, 'gallery__gif_playing', false);
	toggleClass(gallery, 'gallery__gif', !!item.gif);
	toggleClass(gallery, 'gallery__video', item.content == 'video');
	
	// Обновляем ссылку на скачивание
	dloadlink.href = item.download;
	dloadlink.style.display = !item.download ? 'none' : '';
	
	let offset = +id;
	let total = group_items.length;
	
	// Выводим заголовок
	ge('#gallery_cnt').innerHTML = L('{0} из {1}', offset + 1, total);
	
	toggleClass(gallery, 'one_image', total < 2);
	
	// Предзагрузка
	let prev = !offset ? total - 1 : offset - 1;
	let next = offset == total - 1 ? 0 : offset + 1;
	
	if (!is_om) {
		ge('#gallery_preload_0').src = prev != offset ? group_items[prev].image : TRANSPARENT_STUB;
		ge('#gallery_preload_1').src = next != offset && prev != next ? group_items[next].image : TRANSPARENT_STUB;
	}
	
	toggleShareMenu(false);
	toggleZoom(false);
	onGalleryResize();
	setLocationState('gallery', gid + '/' + id);
	
	if (item.adult)
		showAdult();
	
	if (item.loaded) {
		updateExtraInfo();
	} else {
		lockFooterLinks(true);
		loadExtraInfo();
	}
}

function renderVideo() {
	if (current.player) {
		ge('#gallery_video_wrap').innerHTML = current.player;
	} else {
		ge('#gallery_video_wrap').innerHTML = tpl.videoStub({preview: current.preview});
	}
}

function loadExtraInfo() {
	let api_data = {IdS: [], TyPes: [], PaRent_ids: [], PaRent_types: []};
	let not_loaded = [];
	
	gallery_list[current.gid].forEach((item) => {
		if (!item.loaded && !item.loading) {
			api_data.IdS.push(item.nid);
			api_data.TyPes.push(item.type);
			api_data.PaRent_ids.push(item.parentId || '');
			api_data.PaRent_types.push(item.parentType || '');
			item.loading = true;
			not_loaded.push(item);
		}
	});
	
	if (!not_loaded.length)
		return;
	
	let on_fail = () => {
		not_loaded.forEach((item) => {
			item.loading = false;
		});
	};
	
	Spaces.api("files.getViewerInfo", api_data, (res) => {
		if (res.code == 0) {
			let viewer_info_hash = {};
			for (let i = 0, l = res.viewerInfo.length; i < l; i++) {
				let item = res.viewerInfo[i];
				let item_key = `${item.parentType || 0}_${item.parentId || 0}_${item.type}_${item.id}`;
				viewer_info_hash[item_key] = item;
			}
			
			let need_update = false;
			not_loaded.forEach((item) => {
				let item_key = `${item.parentType || 0}_${item.parentId || 0}_${item.type}_${item.nid}`;
				if (viewer_info_hash[item_key]) {
					extend(item, viewer_info_hash[item_key]);
					item.loaded = true;

					// Если у нас в списке только "Поделиться с помощью..." и он не работает, то отключаем кнопку деления
					if (('shareLinks' in item) && item.shareLinks.length == 2 && typeof navigator.share !== 'function')
						item.shareLinks = false;
					
					if (current && current == item)
						need_update = true;
				} else {
					item.loading = false;
				}
			});
			
			if (need_update)
				tick(() => updateExtraInfo());
		} else {
			console.error('[getViewerInfo] ' + Spaces.apiError(res));
			on_fail();
		}
	}, {
		onError(err) {
			console.error('[getViewerInfo] ' + err);
			on_fail();
		}
	});
}

function lockFooterLinks(flag) {
	let links = [
		ge('#g_comments_link'), ge('#g_collections_link'), ge('#g_complaint'), ge('#g_placeholder'),
		ge('#like_up_gallery'), ge('#like_down_gallery'), ge('#g_share_link')
	];
	
	let disable_click_handler = () => {
		return false;
	};
	
	for (let i = 0, l = links.length; i < l; i++) {
		let link = links[i];
		if (link) {
			toggleClass(link, 'disabled', flag);
			link.href = 'javascript:void(0)';
		}
	}
}

function updateExtraInfo() {
	lockFooterLinks(false);
	
	let advancepage = ge('#g_comments_link');
	let collections = ge('#g_collections_link');
	let complaint = ge('#g_complaint');
	let placeholder = ge('#g_placeholder');
	let share = ge('#g_share_link');
	let share_menu = ge('#g_share_menu');
	
	ge('#Gallery').setAttribute('data-object-url', current.commentsLink);
	
	// Обновляем ссылки
	collections.href = current.saveLink;
	complaint.href = current.complainUrl;
	advancepage.href = current.commentsLink;
	
	// Костыль для маржинов
	toggleClass(advancepage, 'mr_l_0', current.commentCnt > 0);
	
	// Флаг о том, что ссылка недоступна
	toggleClass(collections.parentNode, 'disabled', !current.saveLink || current.saveLink.indexOf('#no_link') >= 0);
	toggleClass(share, 'disabled', !current.shareLinks || !current.shareLinks.length);
	
	// Меню шеринга
	if (current.shareLinks) {
		share_menu.innerHTML = current.shareLinks.join('');
		
		import('./action_bar').then(({setupMenuLinks}) => {
			setupMenuLinks(share_menu, () => toggleShareMenu(false));
		});
	}
	
	// Ссылки на жалобу может и не быть!
	complaint.style.display = !current.complainUrl ? 'none' : '';
	placeholder.style.display = current.complainUrl ? 'none' : '';
	
	// Обновляем счётчики
	ge('#g_commentCnt').innerHTML = +current.commentCnt || '';
	
	syncLikes();
	
	if (current.content == 'video')
		renderVideo();
	
	if (!current.haveCollections && !colections_closed && current.saveLink) {
		tick(() => {
			showNotif(tpl.collectionsMotivator({link: current.saveLink}), () => {
				colections_closed = true;
			});
		});
	}
}

function onLike(evt) {
	if (current) {
		if (((evt.ot == current.parentType && evt.oid == current.parentId) || (evt.ot == current.type && evt.oid == current.nid)) && current.loaded) {
			current.votingInfo.vote = evt.dir;
			current.votingInfo.likes_count = evt.cntUp;
			current.votingInfo.dislikes_count = evt.cntDown;
			syncLikes();
		}
	}
}

function syncLikes() {
	if (current.parentId) { // Бинд лайков родительского объекта
		let type_id = current.parentType + '_' + current.parentId;
		let up = ge('#like_up' + type_id);
		let down = ge('#like_down' + type_id);
		
		if (up) {
			current.votingInfo = {
				is_owner:		Spaces.params.nid && (!up || +dattr(up, 'disabled')),
				not_auth:		!Spaces.params.nid,
				hide_dislike:	!down,
				likes_count:	dattr(up, 'cnt'),
				dislikes_count:	down ? dattr(down, 'cnt') : 0,
				vote:			(+dattr(up, 'clicked') ? 1 : (down && +dattr(down, 'clicked') ? -1 : 0)),
				binded:			type_id
			};
		}
	}
	
	let vote_info = current.votingInfo;
	let is_disabled = vote_info.is_owner || vote_info.not_auth || current.type == Spaces.TYPES.EXTERNAL_VIDEO;
	
	each(ge('.js-vote_btn', gallery), function (btn) {
		let counter = ge('.js-vote_btn_cnt', btn)[0];
		let vote_id = current.type + '_' + current.nid;
		let vote_type = +btn.getAttribute('data-type');
		let cnt = vote_type < 0 ? +vote_info.dislikes_count : +vote_info.likes_count;
		
		// Счётчик
		toggleClass(counter, 'mr_l_0', cnt > 0);
		counter.innerHTML = cnt || '';
		
		btn.id = 'like_' + (vote_type < 0 ? 'down' : 'up') + "_gallery";
		let setup = {
			ot:			current.type,
			oid:		current.nid,
			clicked:	vote_info.vote == vote_type,
			mode:		'gallery',
			disabled:	!!(is_disabled || (vote_type < 0 && vote_info.hide_dislike)),
			cnt:		cnt,
			binded:		vote_info.binded || ""
		};
		each(setup, function (v, k) {
			if (typeof v == "boolean")
				v = +v;
			btn.setAttribute('data-' + k, v);
		});
		
		toggleClass(btn.parentNode, 'disabled', !!setup.disabled);
		toggleClass(btn.parentNode, 'js-clicked', vote_info.vote == vote_type);
	});
	import("./likes").then(function ({initLikes}) {
		initLikes('_gallery');
	});
}

function closeNotif() {
	let notif = ge('#gallery_notif');
	if (notif)
		notif.parentNode.removeChild(notif);
}

function showNotif(text, callback) {
	closeNotif();
	
	gallery.appendChild(ce('div', {
		innerHTML: tpl.notif({text: text})
	}).firstChild);
	
	Events.on(ge('.js-gal_notif_close', gallery)[0], 'click', function (e) {
		callback && callback();
		closeNotif();
		return false;
	});
}

function showAdult() {
	showError(tpl.adult(current.content == 'video' ? L('видео') : L('фото')));
	
	// Аццкое костылище, чтобы по клику по тексту можно было перелистывать
	Events.on(ge('.gallery_error-side', gallery), 'click', function () {
		rewind(hasClass(this, 'prev') ? -1 : 1);
		return false;
	});
	
	Events.on(ge('#gallery_adult_show'), 'click', function () {
		showError(false);
		Spaces.api("session.adultCheck", {Passed: 1});
		
		each(items_cache, function (v) {
			v.adult = 0;
		});
		return false;
	});
}

function toggleShareMenu(flag) {
	let share_link = ge('#g_share');
	let share_menu = ge('#g_share_menu');
	
	if (flag == null)
		flag = !hasClass(share_link, 'js-clicked');
	
	toggleClass(share_link, 'js-clicked', flag);
	toggleClass(share_menu, 'hide', !flag);
	
	onGalleryResize();
}

function showError(text) {
	let img = ge('#gallery_img');
	toggleClass(img.parentNode, 'gallery__show_error', !!text);
	let error = ge('.gallery__error', gallery)[0];
	error.innerHTML = text || '';
	onGalleryResize();
}

function replaceImage(src) {
	let image = ge('#gallery_img');
	image.parentNode.replaceChild(ce('img', {
		id: image.id,
		src: src,
		className: image.className
	}), image);
}

function decodeFileMeta(el) {
	let out = {el: el, link: el.href},
		raw_data = el.getAttribute('g');
	if (raw_data) {
		let data = raw_data.split("|");
		for (let i = 0, l = FILE_META_DECODE_MAP.length; i < l; ++i) {
			let k = FILE_META_DECODE_MAP[i], v = data[i];
			if (k.substr(0, 1) == '#') {
				k = k.substr(1);
				v = +v || 0;
			}
			out[k] = v;
		}
		
		if (out.parent) {
			let tmp = out.parent.split(':');
			out.parentType = tmp[0];
			out.parentId = tmp[1];
		}
		
		if (out.gif)
			out.gif = out.download;
		
		if (!out.commentsLink)
			out.commentsLink = out.link;
		
		if (out.commentsLink)
			out.commentsLink = out.commentsLink.replace('" data-url-params="', '?');
		
		return out;
	}
}

function toggleZoom(flag) {
	if (!can_css_transform)
		return;
	if (zoomed == flag)
		return;
	
	zoomed = flag;
	toggleClass(gallery, 'gallery__zoom', flag);
	
	let thumb = current.image,
		img = ge('#gallery_img');
	if (flag) {
		addClass(gallery, 'gallery__loading');
		loadImage(current.download, function (src, status) {
			if (current && current.image == thumb && zoomed) {
				removeClass(gallery, 'gallery__loading');
				if (status) {
					if (!img.getAttribute('data-zoom-ok')) {
						let size = parseThumbSize(thumb);
						if (img.width) {
							img.style.width = img.width + "px";
							img.style.height = img.height + "px";
						} else if (size) {
							img.style.maxWidth = size[0] + "px";
							img.style.maxHeight = size[1] + "px";
						}
						img.setAttribute('data-zoom-ok', 1);
					}
					img.src = src;
				}
			}
		});
	} else {
		removeClass(gallery, 'gallery__loading');
		img.src = thumb;
	}
	
	if (flag) {
		last_zoom_pos = {x: 0, y: 0};
		img.style[can_css_transform] = mkTransform(2, 0, 0);
		if (!zoom_inited) {
			let img_wrap = ge('#gallery_img_wrap');
			moveable(img_wrap, function (e) {
				if (e.type == 'init') {
					img = ge('#gallery_img');
					// Если не в зуме, то отсекаем все события
					return zoomed;
				} else {
					let x = e.dx + last_zoom_pos.x,
						y = e.dy + last_zoom_pos.y;
					
					if (Math.abs(x) - img.offsetWidth / 2 >= 0)
						x = nsign(x) * (img.offsetWidth / 2);
					if (Math.abs(y) - img.offsetHeight / 2 >= 0)
						y = nsign(y) * (img.offsetHeight / 2);
					
					if (e.type == 'move') {
						img.style[can_css_transform] = mkTransform(2, x, y);
					} else if (e.type == 'end') {
						last_zoom_pos.x = x;
						last_zoom_pos.y = y;
					}
				}
			});
			zoom_inited = true;
		}
	} else {
		last_zoom_pos = false;
		img.style[can_css_transform] = 'none';
	}
}

function getItemMeta(el) {
	if ('gallery_cache_id' in el)
		return items_cache[el.gallery_cache_id];
	let meta = decodeFileMeta(el);
	el.gallery_cache_id = items_cache.length;
	items_cache.push(meta);
	return meta;
}

function setLocationState(app, value) {
	if (!has_history)
		return;
	
	let url = location.href.replace(/#.*?$/, '') + (value ? "#" + app + "/" + value : "");
	if (location.hash.indexOf('#' + app + '/') == 0) {
		history.replaceState({}, document.title, url);
	} else if (value) {
		history.pushState({}, document.title, url);
	}
}

function getLocationState(app) {
	if (!has_history)
		return false;
	let m;
	if ((m = location.hash.match(new RegExp('^#' + app + '/(.*?)$', 'i'))))
		return m[1];
	return false;
}

function getScrollTop() {
	if (typeof window.pageYOffset != 'undefined')
		return window.pageYOffset;
	// IE
	let body = document.body,
		html = document.documentElement;
	return (body.clientHeight ? body : html).scrollTop;
}

function getGalleryRect() {
	let h = is_om ? screen.availHeight : gallery.offsetHeight;
	return {
		x: 0,
		y: !fullscreen ? HEADER_HEIGHT : 0,
		h: h - (!fullscreen ? HEADER_HEIGHT + FOOTER_HEIGHT : 0),
		rh: h,
		w: gallery.offsetWidth
	};
}

function videoResize(w, h) {
	let self = this;
	let a = 16 / 9;
	if (w * a == h)
		return [w, h];
	
	let new_h = w / a,
		new_w = h * a;
	
	if (new_h > h) {
		return [Math.round(new_w), Math.round(new_w / a)];
	} else {
		return [Math.round(new_h * a), Math.round(new_h)];
	}
	
	return [w, h];
}

function parseThumbSize(src) {
	let size = src.match(/\.\w+\.(\d+)\.(\d+)/);
	return size && [size[1], size[2]];
}

function loadImage(src, callback) {
	let image = new Image();
	image.onload = function() {
		callback.call(image, src, true);
	};
	image.onerror = function() {
		callback.call(image, src, false);
	};
	image.src = src;
	image = null;
}

function mkTransform(scale, x, y) {
	return can_css_3d ? 'translate3d(' + x + 'px, ' + y + 'px, 0px) scale3d(' + scale + ', ' + scale + ', 1)' : 
		'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
}

let Gallery = {onLike};
export {Gallery};
