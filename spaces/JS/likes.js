import $ from './jquery';
import {Spaces, Codes} from './spacesLib';
import { ge, html_wrap, TRANSPARENT_PIXEL } from './utils';
import { getPopperById } from './widgets/popper';
import { simplePagination } from './widgets/fragments/simplePagination';
import { L, select } from './core/l10n';

const USERS_PER_PAGE = 5;

let classes = {
	ico: {
		up: 'ico_abar_vote_up',
		upActive: 'ico_abar_vote_up_on',
		down: 'ico_abar_vote_down',
		downActive: 'ico_abar_vote_down_on'
	}
};
let tpl = {
	popper(id, gallery) {
		return `
			<div class="popper-dropdown" id="${id}"
				${gallery ? 'data-popper-type="gallery" style="z-index:100001"' : ''}
			></div>
		`;
	},
	userSkeleton() {
		return `
			<div class="list-link oh" aria-hidden="true">
				<div class="block-item__avatar block-item__avatar_small">
					<span>
						<img src="${TRANSPARENT_PIXEL}" width="40" height="40" class="preview s41_40 skeleton" />
					</span>
				</div>
				<div class="block-item__descr">
					<div>
						<span class="block-item__title">
							<span class="mysite-nick skeleton skeleton--text" style="width: 8em">&nbsp;</span>
						</span>
					</div>
					<div class="block-item__light oh">
						<span class="skeleton skeleton--text" style="width: 6em">&nbsp;</span>
					</div>
				</div>
			</div>
		`;
	},
	message(text, error = false) {
		return `
			<div class="content-item3 t_center ${error ? 'red' : 'grey'}">
				${text}
			</div>
		`;
	},
	usersList(users, pagination) {
		return `
			<a href="#" class="list-link js-popper_close">
				<span class="ico ico_dating_black"></span>
				${L('Поставили лайк')}
				<span class="ico ico_arr_up_black"></span>
			</a>
			<div>
				${users.length ? users.join('') : tpl.message(L('Ещё никто не лайкал.'))}
			</div>
			${pagination}
		`;
	},
	subscribeOffer({ author, subscribeLink }) {
		return `
			<span class="js-subscribe_offer_object m inl_bl padd_right">${author}</span>
			<span class="js-subscribe_offer_button m inl_bl">${subscribeLink}</span>
		`;
	}
};

let hide_err_timeout;

$('#main_wrap').on('click', '.js-vote_btn', function (e, extra) {
	e.stopImmediatePropagation(); e.preventDefault();
	e.stopPropagation();
	
	let current_btn = $(this),
		current_data = current_btn.data(),
		
		type = current_data.type,
		vid = current_data.vote_id,
		type_id = type + "_" + vid,
		
		like_up_btn = $('#' + vid + '_voteUp'),
		like_down_btn = $('#' + vid + '_voteDown'),
		like_up_data = like_up_btn.data(),
		like_down_data = like_down_btn.data(),
		
		opposite_btn = type < 0 ? like_up_btn : like_down_btn,
		opposite_data = type < 0 ? like_up_data : like_down_data;

	const likeOffer = $('#like_offer_' + current_data.ot + '_' + current_data.oid);
	const updateOffer = () => {
		const shareOffer = likeOffer.find('.js-share_buttons');
		const subscribeOffer = likeOffer.find('.js-subscribe_offer');
		const isVisible = shareOffer.length > 0 || !subscribeOffer.hasClass('hide');
		likeOffer.toggleClass('hide', !isVisible);
		
		// Костыль!
		if (isVisible) {
			const wrap = likeOffer.parents('.widgets-group').first();
			if (wrap.length > 0)
				likeOffer.insertAfter(wrap);
		}
	};
	
	let clearError = function () {
		$('#vote_err_' + vid).addClass('hide');
		clearTimeout(hide_err_timeout);
	};
	
	let showError = function (text) {
		let err = $('#vote_err_' + vid);
		
		if (!err.length) {
			err = current_btn.parents('.js-action_bar')
				.find('.js-vote_error');
		}
		
		if (err.length && !ge('#Gallery')) {
			err.removeClass('hide').html(text);
			hide_err_timeout = setTimeout(clearError, 4000);
		} else {
			Spaces.showMsg(text, {
				gallery: true,
				type: 'alert'
			});
		}
	};
	
	if (!extra || !extra.ignore)
		clearError();
	
	current_data.mode = current_data.mode || 'default';
	
	let binded = current_btn.data('binded');
	if (binded && !current_data.disabled) {
		$('#' + binded + (type < 0 ? '_voteDown' : '_voteUp')).click();
		return;
	}
	
	if (current_data.notAuth) {
		showError(Spaces.view.onlyAuthMotivator());
		return;
	}
	
	if (current_data.ot == Spaces.TYPES.EXTERNAL_VIDEO) {
		const action = type < 0 ? 'dislike' : 'like';
		showError(select(action, {
			dislike: 'Это видео нельзя дизлайкать.',
			other: 'Это видео нельзя лайкать.'
		}));
		return;
	}
	
	if (current_data.privatePhoto && type < 0) {
		showError(L("Это фото нельзя дизлайкать."));
		return;
	}
	
	if (current_data.disabled) {
		if (type < 0) {
			showError(L('Вы не можете голосовать за себя.'));
		} else {
			showLikes(current_btn, `${current_data.ot}_${current_data.oid}`, like_up_data.cnt);
		}
		return;
	}
	
	let api_method, api_data = {
		CK: null,
		Oid: current_data.oid,
		Ot: current_data.ot,
		from: current_data.from,
		Visit: current_data.visit,
		Widgets: likeOffer.length > 0 && current_data.subscr,
		Link_id: Spaces.params.link_id
	};
	
	let polarity_change = false;
	
	// Удаляем голос
	if (current_data.clicked) {
		--current_data.cnt;
		api_method = "voting.delete";
		current_data.clicked = false;
	} else if (opposite_btn.data('clicked')) { // Смена полярности
		++current_data.cnt; --opposite_data.cnt;
		
		api_method = "voting.like";
		api_data.Down = type < 0 ? 1 : 0;
		
		current_data.clicked = true;
		opposite_data.clicked = false;
		polarity_change = true;
	} else { // Ставим первый голос
		++current_data.cnt;
		
		api_method = "voting.like";
		api_data.Down = type < 0 ? 1 : 0;
		
		current_data.clicked = true;
	}
	
	like_up_data = like_up_data || {cnt: 0};
	like_down_data = like_down_data || {cnt: 0};
	
	// Счётчики
	let up_cnt = $('#vote_up_cnt_' + vid)
		.text(like_up_data.cnt);
	let down_cnt = $('#vote_down_cnt_' + vid)
		.text(like_down_data.cnt);
	
	if (up_cnt.data('hideable'))
		up_cnt.toggle(like_up_data.cnt > 0);
	if (down_cnt.data('hideable'))
		down_cnt.toggle(like_down_data.cnt > 0);
	
	// Общий счётчик
	let full_cnt = -like_down_data.cnt + like_up_data.cnt;
	$('#' + vid + '_voteFullCnt')
		.text(full_cnt)
		.toggleClass("red", full_cnt < 0)
		.toggleClass("green", full_cnt > 0);
	
	// l10n-set context="vote-count"
	like_up_btn.attr('title', L('За {count}', { count: like_up_data.cnt }));
	like_down_btn.attr('title', L('Против {count}', { count: like_down_data.cnt }));
	// l10n-reset

	if (!like_up_data.clicked)
		likeOffer.addClass('hide');

	if (current_data.mode == 'old_button') {
		like_up_btn.children().toggleClass('on', !!like_up_data.clicked);
		like_down_btn.children().toggleClass('on', !!like_down_data.clicked);
	} else if (current_data.mode == 'default') {
		like_up_btn.find('.ico_abar')
			.toggleClass(classes.ico.up, !like_up_data.clicked)
			.toggleClass(classes.ico.upActive, !!like_up_data.clicked);
		like_up_btn.find('.action-bar_cnt').toggleClass('action-bar_cnt_on', !!like_up_data.clicked);
		like_down_btn.find('.ico_abar')
			.toggleClass(classes.ico.down, !like_down_data.clicked)
			.toggleClass(classes.ico.downActive, !!like_down_data.clicked);
		like_down_btn.find('.action-bar_cnt').toggleClass('action-bar_cnt_on action-bar_cnt_on_red', !!like_down_data.clicked);
	}
	
	let voted = $('#voted_' + current_data.ot + '_' + current_data.oid);
	if (!like_down_data.clicked)
		voted.addClass('hide');
	
	like_up_btn.trigger('like', {
		polarity: like_down_data.clicked ? -1 : (like_up_data.clicked ? 1 : 0),
		plus: like_up_data.cnt,
		minus: like_down_data.cnt
	});
	
	if (extra && extra.ignore)
		return;
	
	Spaces.api(api_method, api_data, function (res) {
		if (res.code == 0 && res.warn)
			showError(res.warn);
		
		if (res.code == 0 && like_down_data.clicked)
			voted.removeClass('hide');
		
		if (res.code != 0 && res.code != Codes.VOTING.ERR_VOTE_NOT_FOUND) {
			showError(Spaces.apiError(res));
			
			if (like_up_data.clicked) {
				if (polarity_change) {
					like_down_btn.trigger("click", [{ignore: true}]);
				} else {
					like_up_btn.trigger("click", [{ignore: true}]);
				}
			} else if (like_down_data.clicked) {
				if (polarity_change) {
					like_up_btn.trigger("click", [{ignore: true}]);
				} else {
					like_down_btn.trigger("click", [{ignore: true}]);
				}
			}
		}
		
		if (like_up_data.clicked && res.widgets && res.widgets.author) {
			const subscribeOffer = likeOffer.find('.js-subscribe_offer');
			if (subscribeOffer.length > 0) {
				subscribeOffer.html(tpl.subscribeOffer({
					author: res.widgets.author,
					subscribeLink: res.widgets.subscr_link,
				}));
				subscribeOffer.removeClass('hide');
				updateOffer();
			}
		}
	});
	
}).on('click', '.js-show_likes', function (e) {
	e.preventDefault();
	e.stopPropagation();
	const el = $(this);
	showLikes(el, el.data('id'), el.data('count'));
});

function showLikes(el, elementId, count) {
	const [ot, oid] = elementId.split('_');
	// TODO: должно быть заранее в HTML
	const gallery = el.closest('#Gallery');
	let popperId;
	if (gallery.length) {
		popperId = `vote_users_gallery_${ot}_${oid}`;
		if (!document.getElementById(popperId)) {
			gallery.append(tpl.popper(popperId, true));
		}
	} else {
		popperId = `vote_users_${ot}_${oid}`;
		if (!document.getElementById(popperId)) {
			el.after(tpl.popper(popperId, false));
			initLikesPopper(getPopperById(popperId), ot, oid, count);
		}
	}

	const popper = getPopperById(popperId);
	popper.toggle({ clickedClass: 'clicked' }, el[0]);
}

function initLikesPopper(popper, ot, oid, count) {
	let currentPage;
	let usersCount = count;
	const requestId = popper.id();
	const showError = (text) => {
		popper.$content().html(tpl.usersList([tpl.message(text, true)], ''));
	};
	const pagination = () => {
		return simplePagination({ current: currentPage, total: Math.ceil(usersCount / USERS_PER_PAGE) });
	};
	const render = async () => {
		const skeletonCount = Math.min(USERS_PER_PAGE, usersCount);
		popper.$content().html(tpl.usersList(Array(skeletonCount).fill(tpl.userSkeleton()), pagination()));
		const response = await Spaces.asyncApi('voting.users', {
			Ot: ot,
			Oid: oid,
			O: (currentPage - 1) * USERS_PER_PAGE,
			L: USERS_PER_PAGE,
			List: 1
		}, {
			requestId,
			onError: showError
		});
		if (!response)
			return;
		if (response.code != Codes.COMMON.SUCCESS) {
			showError(Spaces.apiError(response));
			return;
		}
		usersCount = response.count;
		popper.$content().html(tpl.usersList(response.users, pagination()));
	};

	popper.on('beforeOpen', () => {
		currentPage = 1;
		render();
	});
	popper.on('afterClose', () => Spaces.cancelApi(requestId));
	popper.$content().on('click', '.js-simple_pagination', (e) => {
		e.preventDefault();
		currentPage += $(e.currentTarget).data('dir') == 'next' ? 1 : -1;
		render();
	});
}
