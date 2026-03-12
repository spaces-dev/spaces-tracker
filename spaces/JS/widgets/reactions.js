import 'CommentWidget/Reactions.css';
import module from "module";
import $ from "../jquery";
import Spaces from "../spacesLib";
import { ICONS_BASEURL } from "../core/env";
import * as pushstream from '../core/lp';
import { isVisibleOnScreen } from '../utils/dom';
import { numeral, L, TRANSPARENT_PIXEL } from "../utils";
import { closeAllPoppers } from './popper';
import { confetti } from '../effects/confetti';

const USERS_PER_PAGE = 5;
const TOP_EMOJI_COUNT = 7;

let observer;
let reactionsCache = {};

const tpl = {
	iconArrDown() {
		return `
			<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M13 16.6833L6.5 10.1833L8.01667 8.66663L13 13.65L17.9833 8.66663L19.5 10.1833L13 16.6833Z" fill="currentColor" />
			</svg>
		`;
	},

	iconArrUp() {
		return `
			<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M13 9.31659L6.5 15.8166L8.01667 17.3333L13 12.3499L17.9833 17.3333L19.5 15.8166L13 9.31659Z" fill="currentColor" />
			</svg>
		`;
	},

	reactionSelectorListSkeleton() {
		return `
			<div class="reactions-selector__content reactions-selector__content--type-list">
				${Array.from({ length: TOP_EMOJI_COUNT }).map(() => `
					<div class="reactions-selector__item">
						<img class="skeleton skeleton--circle" src="${ICONS_BASEURL}/pixel.png" />
					</div>
				`).join('')}
				<div class="reactions-selector__expand">
					${tpl.iconArrDown()}
				</div>
			</div>
		`;
	},

	reactionSelectorList({ reactions, selected }) {
		return `
			<div class="reactions-selector__content reactions-selector__content--type-list">
				${reactions.map((reaction) => `
					<div
						role="button"
						class="
							js-reaction_toggle
							reactions-selector__item
							${reaction.id == selected ? ' reactions-selector__item--is-selected' : ''}
						"
						data-emotion-id="${reaction.id}"
						${reaction.id == selected ? `data-selected="true"` : ``}
					>
						${reaction.emoji}
					</div>
				`).join('')}
				<div
					role="button"
					class="js-reactions_selector_expand reactions-selector__expand"
					data-action="expand"
				>
					${tpl.iconArrDown()}
				</div>
			</div>
		`;
	},

	reactionSelectorGrid({ reactions, selected }) {
		const reactionItem = (reaction) => `
			<div
				role="button"
				class="
					js-reaction_toggle
					reactions-selector__item
					${reaction.id == selected ? ' reactions-selector__item--is-selected' : ''}
				"
				data-emotion-id="${reaction.id}"
				${reaction.id == selected ? `data-selected="true"` : ``}
			>
				${reaction.emoji}
			</div>
		`;
		return `
			<div class="reactions-selector__content reactions-selector__content--type-grid">
				${reactions.slice(0, 7).map(reactionItem).join('')}
				<div
					role="button"
					class="js-reactions_selector_expand reactions-selector__expand"
					data-action="collapse"
				>
					${tpl.iconArrUp()}
				</div>
				${reactions.slice(7).map(reactionItem).join('')}
			</div>
		`;
	},

	userSkeleton() { // пиздец
		return `
			<div class="list-link__wrap wbg" style="pointer-events: none">
				<div class="btn-tools_centered btn-tools_centered-indent">
					<img src="${TRANSPARENT_PIXEL}" width="20" height="20" class="skeleton skeleton--circle" />
				</div>
				<a href="#" style="padding-right: 60px" class="list-link oh">
					<div class="block-item__avatar block-item__avatar_small">
						<span>
							<img src="${TRANSPARENT_PIXEL}" width="40" height="40" class="preview s41_40 skeleton" />
						</span>
					</div>
					<div class="block-item__descr">
						<div>
							<span class="block-item__title break-word">
								<span class="mysite-nick skeleton skeleton--text">RickAstley</span>
							</span>
						</div>
						<div class="block-item__light oh skeleton skeleton--text">at 13:37</div>
					</div>
				</a>
			</div>
		`;
	},

	usersList({ users, count, reactions, emotionId, pagination }) {
		const reactionsCountText = numeral(count, [L('$n реакция'), L('$n реакции'), L('$n реакций')]);
		return `
			<a href="#" class="list-link js-popper_close">
				<span class="ico ico_dating_black"></span>
				${reactionsCountText}
				<span class="ico ico_arr_up_black"></span>
			</a>
			<div class="reactions-list reactions-list--variant-pills">
				${reactions.map((reaction) => tpl.reactionPill(reaction, reaction.emotion == emotionId)).join("")}
			</div>
			<div>
				${users.join("")}
			</div>
			${pagination ?? ""}
		`;
	},

	reactionPill(reaction, selected) {
		if (reaction.label) {
			return `
				<div class="js-reaction_filter reaction ${selected ? 'reaction--is-selected' : ''}" data-emotion-id="${reaction.emotion}">
					<div class="reaction__label">
						${reaction.label}
					</div>
				</div>
			`;
		} else {
			return `
				<div class="js-reaction_filter reaction ${selected ? 'reaction--is-selected' : ''}" data-emotion-id="${reaction.emotion}">
					<div class="reaction__emoji">
						${reaction.emoji}
					</div>
					<div class="reaction__counter">
						${reaction.count}
					</div>
				</div>
			`;
		}
	},

	error(errorMessage) {
		return `
			<div class="content-item3 red">
				${errorMessage}
			</div>
		`;
	},

	pagination({ current, total }) {
		if (total <= 1)
			return '';

		return `
			<div class="pgn-wrapper">
				<div class="pgn">
					<table class="table__wrap pgn__table">
						<tr>
							<td class="table__cell" width="35%">
								<button
									class="
										js-reaction_users_pgn
										pgn__button
										pgn__link_prev
										pgn__link_hover
										${current == 1 ? 'pgn__link_disabled' : ''}
									"
									data-dir="prev"
								>
									<span class="js-ico ico ico_arr_left"></span>
									<span class="js-text">${L("Назад")}</span>
								</button>
							</td>
							<td class="table__cell">
								<div class="pgn__counter pgn__range">
									${L("{0} из {1}", current, total)}
								</div>
							</td>
							<td class="table__cell table__cell_last" width="35%">
								<button
									class="
										js-reaction_users_pgn
										pgn__button
										pgn__link_next
										pgn__link_hover
										${current == total ? 'pgn__link_disabled' : ''}
									"
									data-dir="next"
								>
									<span class="js-text">${L("Вперёд")}</span>
									<span class="js-ico ico ico_arr_right"></span>
								</button>
							</td>
						</tr>
					</table>
				</div>
			</div>
		`;
	}
};

module.on("component", () => {
	for (const reactionsWidget of document.querySelectorAll('.js-reactions_list:not([data-inited])'))
		initReactionsWidget($(reactionsWidget));
});

module.on("componentpage", () => {
	observer = new IntersectionObserver((items) => {
		for (const item of items) {
			if (item.isIntersecting)
				handleReactionsRead($(item.target));
		}
	});

	pushstream.on('message', 'reactions', (message) => {
		if (message.act == pushstream.TYPES.USER_OBJECT_ADD_REACTION || message.act == pushstream.TYPES.USER_OBJECT_DELETE_REACTION) {
			if (!document.getElementById(`reactions_${message.objectType}_${message.objectId}`))
				return;
			if (message.hash == Spaces.tabId())
				return;
			refreshReactionsList(message.objectType, message.objectId);
		}
	});
});

module.on("componentpagedone", () => {
	if (observer) {
		observer.disconnect();
		observer = undefined;
	}
	pushstream.off('*', 'reactions');
	reactionsCache = {};
});

function initUsersMenu(objectType, objectId) {
	const usersListMenu = $(`#reaction_users_${objectType}_${objectId}`);
	let currentPage = 0;
	let totalPages = 0;
	let emotionId = 0;

	const getReactionsCount = () => {
		const reactionsList = document.querySelector(`#reactions_${objectType}_${objectId}`);
		return +reactionsList.dataset.count;
	};

	const render = async (refresh = false) => {
		const reactionsCount = getReactionsCount();

		const all = {
			emotion: 0,
			label: L("Все"),
			count: 0,
		};

		if (refresh) {
			usersListMenu.html(tpl.usersList({
				users: Array(Math.min(USERS_PER_PAGE, reactionsCount)).fill(tpl.userSkeleton()),
				count: reactionsCount,
				reactions: [all],
				emotionId: 0,
				pagination: tpl.pagination({ current: currentPage, total: totalPages }),
			}));
		}

		const response = await Spaces.asyncApi("uobj.reaction.usersList", {
			Ot: objectType,
			Oid: objectId,
			Emotion: emotionId,
			O: (currentPage - 1) * USERS_PER_PAGE,
			L: USERS_PER_PAGE,
		});
		if (response.code != 0) {
			usersListMenu.html(tpl.error(Spaces.apiError(response)));
			return;
		}

		totalPages = Math.ceil(response.count / USERS_PER_PAGE);

		usersListMenu.html(tpl.usersList({
			reactions: [all, ...response.reactions],
			users: response.users,
			count: reactionsCount,
			emotionId,
			pagination: tpl.pagination({ current: currentPage, total: totalPages }),
		}));
	};

	usersListMenu.on('popper:beforeOpen', () => {
		emotionId = 0;
		currentPage = 1;
		totalPages = Math.ceil(getReactionsCount() / USERS_PER_PAGE);
		render(true);
	});
	usersListMenu.on('click', '.js-reaction_filter', async function (e) {
		e.preventDefault();
		const link = $(this);
		emotionId = link.data('emotionId');
		currentPage = 1;
		render();
	});
	usersListMenu.on('click', '.js-reaction_users_pgn', async function (e) {
		e.preventDefault();
		const link = $(this);
		const direction = link.data('dir');
		if (direction == 'prev')
			currentPage--;
		if (direction == 'next')
			currentPage++;
		await render();
	});
}

function updateReactionsCount(type, id, count) {
	const reactionsList = document.querySelector(`#reactions_${type}_${id}`);
	if (reactionsList) {
		$(reactionsList).data('count', count);
		reactionsList.dispatchEvent(new CustomEvent('reactions:updateCounter', {
			detail: { type, id, count },
			bubbles: true
		}));
	}

	const reactionsSpoilerButton = reactionsList?.querySelector(`.js-reactions_spoiler_button`);
	if (reactionsSpoilerButton)
		reactionsSpoilerButton.querySelector('.js-reactions_count').textContent = count;
}

function initReactionsWidget(reactionsWidget) {
	const objectType = reactionsWidget.data('objectType');
	const objectId = reactionsWidget.data('objectId');

	reactionsWidget.data('inited', true);
	if (reactionsWidget.data('unread'))
		observer.observe(reactionsWidget[0]);

	getAvailableReactions(reactionsWidget.data('objectType')); // preload

	reactionsWidget.on('click', '.js-reaction', async function (e) {
		e.preventDefault();

		if (reactionsWidget.data('disabled'))
			return;

		const reaction = $(this);

		const toggleReaction = (flag) => {
			reaction.toggleClass('reaction--is-selected', flag);
			reaction.data('count', reaction.data('count') + (flag ? 1 : -1));
			reaction.find('.js-reaction_counter').text(reaction.data('count'));
			reaction.data('selected', flag);

			if (flag)
				confetti(reaction[0], { emoji: reaction[0].querySelector('img').alt });

			if (reaction.data('count') <= 0)
				reaction.remove();

			updateReactionsCount(objectType, objectId, reactionsWidget.data('count') + (flag ? 1 : -1));
		};

		const apiMethod = reaction.data('selected') ? "uobj.reaction.delete" : "uobj.reaction.add";
		toggleReaction(!reaction.data('selected'));
		const response = await Spaces.asyncApi(apiMethod, {
			CK: null,
			Ot: objectType,
			Oid: objectId,
			Emotion: reaction.data('emotionId'),
			hash: Spaces.tabId(),
		});
		if (response.code == 0)
			replaceReactionsList(objectType, objectId, response.reactions);
	});

	const reactionsSelectorMenu = $(`#reactions_selector_${objectType}_${objectId}`);
	const renderReactionsSelector = async (expanded) => {
		const selectedReaction = reactionsWidget.find('.js-reaction[data-selected="true"]');
		reactionsSelectorMenu.html(tpl.reactionSelectorListSkeleton());

		const reactions = await getAvailableReactions(objectType);
		if (expanded) {
			reactionsSelectorMenu.html(tpl.reactionSelectorGrid({
				objectType,
				objectId,
				reactions,
				selected: selectedReaction.data('emotionId'),
			}));
		} else {
			reactionsSelectorMenu.html(tpl.reactionSelectorList({
				objectType,
				objectId,
				reactions: reactions.slice(0, TOP_EMOJI_COUNT),
				selected: selectedReaction.data('emotionId'),
			}));
		}
	};

	reactionsSelectorMenu.on('popper:beforeOpen', () => {
		renderReactionsSelector(false);
	});

	reactionsSelectorMenu.on('click', '.js-reactions_selector_expand', async function (e) {
		e.preventDefault();
		renderReactionsSelector(this.dataset.action == "expand");
		const eventType = this.dataset.action == "expand" ? "reactions:selectorExpand" : "reactions:selectorCollapse";
		reactionsSelectorMenu[0].dispatchEvent(new CustomEvent(eventType, { bubbles: true }));
	});

	reactionsSelectorMenu.on('click', '.js-reaction_toggle', async function (e) {
		e.preventDefault();
		const selectedReaction = $(this);
		const emotionId = selectedReaction.data('emotionId');
		const isDelete = selectedReaction.data('selected');

		closeAllPoppers();

		const reactionButton = reactionsWidget.find(`.js-reaction[data-emotion-id="${emotionId}"]`);
		if (reactionButton.length > 0) {
			reactionButton.click();
		} else {
			const apiMethod = isDelete ? "uobj.reaction.delete" : "uobj.reaction.add";
			const resposne = await Spaces.asyncApi(apiMethod, {
				CK: null,
				Ot: objectType,
				Oid: objectId,
				Emotion: emotionId,
				hash: Spaces.tabId(),
			});
			if (resposne.code == 0) {
				replaceReactionsList(objectType, objectId, resposne.reactions);
				if (!isDelete) {
					const addedReaction = reactionsWidget.find(`.js-reaction[data-emotion-id="${emotionId}"]`);
					confetti(addedReaction[0], { emoji: addedReaction[0].querySelector('img').alt });
				}
			}
		}
	});

	initUsersMenu(objectType, objectId);

}

async function refreshReactionsList(objectType, objectId) {
	const resposne = await Spaces.asyncApi("uobj.reaction.list", {
		CK: null,
		Ot: objectType,
		Oid: objectId,
	});
	if (resposne.code == 0)
		replaceReactionsList(objectType, objectId, resposne.reactions);
}

function replaceReactionsList(objectType, objectId, reactions) {
	const list = $(`#reactions_${objectType}_${objectId}`);

	if (!list.length)
		return;

	list.find('.js-reaction').remove();

	const insertionPlace = list.find('.js-reactions_buttons');
	if (insertionPlace.length > 0) {
		insertionPlace.after(reactions.join(''));
	} else {
		list.append(reactions.join(''));
	}

	const newReactions = list.find('.js-reaction[data-is-new]');
	if (newReactions.length > 0) {
		list.data('unread', true);
		observer.observe(list[0]);
	}

	let count = 0;
	for (const reaction of list.find('.js-reaction'))
		count += +reaction.dataset.count

	updateReactionsCount(objectType, objectId, count);
}

function handleReactionsRead(reactionsWidget) {
	Spaces.asyncApi("uobj.reaction.view", {
		CK: null,
		Ot: reactionsWidget.data('objectType'),
		Oid: reactionsWidget.data('objectId'),
	});
	reactionsWidget.data('unread', false);

	for (const reaction of reactionsWidget.find('.js-reaction[data-is-new]').toArray()) {
		delete reaction.dataset.isNew;
		confetti(reaction, { emoji: reaction.querySelector('img').alt });
	}

	observer.unobserve(reactionsWidget[0]);
}

export function getVisibleUnreadReactionsCount() {
	let visibleUnreadReactionsCount = 0;
	for (const reactionsWidget of document.querySelectorAll('.js-reactions_list')) {
		if (reactionsWidget.dataset.unread && isVisibleOnScreen(reactionsWidget))
			visibleUnreadReactionsCount++;
	}
	return visibleUnreadReactionsCount;
}

async function getAvailableReactions(objectType) {
	if (!reactionsCache[objectType]) {
		reactionsCache[objectType] = (async () => {
			const response = await Spaces.asyncApi("uobj.reaction.available", { Ot: objectType });
			if (response.code !== 0) {
				delete reactionsCache[objectType];
				throw new Error(Spaces.apiError(response));
			}
			return response.reactions;
		})();
	}
	return reactionsCache[objectType];
}
