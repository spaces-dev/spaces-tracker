import module from "module";
import * as pushstream from '../core/lp';
import { Spaces, Codes } from "../spacesLib";
import { throttleRaf } from "../utils";
import { waitTransitionEnd } from '../utils/dom';
import pageLoader from '../ajaxify';
import { getVisibleUnreadReactionsCount, isReactionsVisible } from '../widgets/reactions';
import { scrollIntoViewIfNotVisible } from "../utils/scroll";
import { getVisibleUnreadMentionsCount, isMentionsVisible } from "./mentions";

const EVENT_TYPES = {
	reactions: {
		method: "uobj.reaction.findNew",
		getInitialCount(button) {
			const totalUnreadCount = +button.dataset.count;
			const visibleUnreadCount = getVisibleUnreadReactionsCount();
			if (visibleUnreadCount > 0)
				return Math.max(0, totalUnreadCount - visibleUnreadCount);
			return totalUnreadCount;
		},
		handleMessage(message, updateCounter, { objectType, parentId }) {
			const ownMessageTypes = [
				pushstream.TYPES.USER_OBJECT_REACTION_ADD,
				pushstream.TYPES.USER_OBJECT_REACTION_DELETE,
				pushstream.TYPES.USER_OBJECT_REACTION_VIEW,
			];
			if (!ownMessageTypes.includes(message.act))
				return;
			if (message.parentId != parentId)
				return;
			if (message.objectType != objectType)
				return;

			let count = message.newReactionsCnt; // FIXME: А так бывает?
			if (count == null)
				return;

			if (message.act == pushstream.TYPES.USER_OBJECT_REACTION_ADD && message.userId != Spaces.params.nid) {
				if (isReactionsVisible(message.objectType, message.objectId))
					count = Math.max(0, count - 1);
			}

			updateCounter(count);
		}
	},
	mentions: {
		method: "user.mention.findNew",
		getInitialCount(button) {
			const totalUnreadCount = +button.dataset.count;
			const visibleUnreadCount = getVisibleUnreadMentionsCount();
			if (visibleUnreadCount > 0)
				return Math.max(0, totalUnreadCount - visibleUnreadCount);
			return totalUnreadCount;
		},
		handleMessage(message, updateCounter, { objectType, parentId }) {
			const ownMessageTypes = [
				pushstream.TYPES.USER_MENTION_ADD,
				pushstream.TYPES.USER_MENTION_DELETE,
				pushstream.TYPES.USER_MENTION_VIEW,
			];
			if (!ownMessageTypes.includes(message.act))
				return;
			if (message.parentId != parentId)
				return;
			if (message.objectType != objectType)
				return;

			let count = message.newMentionsCnt;
			if (message.act == pushstream.TYPES.USER_MENTION_ADD && message.userId != Spaces.params.nid) {
				if (isMentionsVisible(message.objectType, message.objectId))
					count = Math.max(0, count - 1);
			}

			updateCounter(count);
		}
	}
};

module.on("componentpage", () => {
	const container = document.querySelector('.js-new_events');
	const floating = useFloating(container, {
		topAnchor: document.querySelector('.js-unread_reactions_top_anchor'),
		bottomAnchor: document.querySelector('.js-unread_reactions_bottom_anchor'),
		stickyClass: 'new-events--is-sticky',
		stickyMargin: 14,
	});

	const getEventButton = (eventType) => {
		return container.querySelector(`.js-new_events_button[data-event-type="${eventType}"]`);
	};

	const getEventsCount = () => {
		let count = 0;
		for (const button of container.querySelectorAll('.js-new_events_button'))
			count += +button.dataset.count;
		return count;
	};

	const handleCounterChange = () => {
		const totalCount = getEventsCount();
		container.classList.toggle('new-events--is-hidden', !totalCount);
		if (totalCount > 0) {
			floating.start();
		} else {
			floating.stop();
		}
	};

	const updateCounter = (eventType, newCount) => {
		const button = getEventButton(eventType);
		const oldCount = +button.dataset.count;
		button.dataset.count = newCount;
		button.querySelector('.js-cnt').textContent = newCount;
		if (oldCount > 0 && !newCount) {
			waitTransitionEnd(button).then(() => {
				button.classList.add('new-events-button--is-hidden');
			});
		} else {
			button.classList.toggle('new-events-button--is-hidden', !newCount);
		}
		handleCounterChange();
	};

	const handleButtonClick = async (e) => {
		e.preventDefault();

		const count = +e.currentTarget.dataset.count;
		const eventType = e.currentTarget.dataset.eventType;
		const eventConfig = EVENT_TYPES[eventType];
		const response = await Spaces.asyncApi(eventConfig.method, {
			Ot: e.currentTarget.dataset.type,
			Pid: e.currentTarget.dataset.parentId,
		});
		if (response.code == Codes.COMMON.ERR_OBJECT_NOT_FOUND) {
			updateCounter(eventType, 0);
			return;
		}

		if (response.code != 0)
			return;

		const messageElement = (
			document.getElementById(`msg${response.object.id}`) ??
			document.getElementById(`m${response.object.id}`) ??
			document.getElementById(`c${response.object.id}`)
		);
		if (messageElement) {
			if (count > 0)
				updateCounter(eventType, count - 1);
			scrollIntoViewIfNotVisible(messageElement, { start: "center", end: "center" });
			messageElement.dispatchEvent(new CustomEvent('message:focus', { bubbles: true }));
		} else {
			pageLoader.loadPage({ url: response.object.url });
		}
	};

	pushstream.on("message", "new_events", (message) => {
		for (const [eventType, eventConfig] of Object.entries(EVENT_TYPES)) {
			const button = getEventButton(eventType);
			if (!button)
				continue;
			const objectType = +button.dataset.type;
			const parentId = +button.dataset.parentId;
			eventConfig.handleMessage(message, (count) => updateCounter(eventType, count), { objectType, parentId });
		}
	});

	for (const [eventType, eventConfig] of Object.entries(EVENT_TYPES)) {
		const button = getEventButton(eventType);
		if (!button)
			continue;
		if (eventConfig.getInitialCount)
			updateCounter(eventType, eventConfig.getInitialCount(button));
		button.addEventListener('click', handleButtonClick);
	}

	handleCounterChange();

	return () => {
		pushstream.off("message", "new_events");
		floating.stop();
	};
});

function useFloating(container, { topAnchor, bottomAnchor, stickyClass, stickyMargin }) {
	const handleScroll = throttleRaf(() => {
		const buttonRect = container.getBoundingClientRect();
		const topAnchorRect = topAnchor.getBoundingClientRect();
		const bottomAnchorRect = bottomAnchor.getBoundingClientRect();
		const buttonHeight = buttonRect.height;
		const alignOffset = buttonHeight / 2;

		let position = "sticky";
		if (topAnchorRect.top >= alignOffset + stickyMargin) {
			position = "top";
		} else if (bottomAnchorRect.bottom <= alignOffset + stickyMargin) {
			position = "bottom";
		}

		container.classList.toggle(stickyClass, position == "sticky");

		if (position == "sticky") {
			const siteContentRect = document.getElementById('siteContent').getBoundingClientRect();
			const offset = Math.round(siteContentRect.left + siteContentRect.width / 2);
			container.style.left = `${offset}px`;
		} else {
			const parentRect = container.offsetParent.getBoundingClientRect();
			const offset = position == "top" ?
				topAnchorRect.top - alignOffset - parentRect.top :
				bottomAnchorRect.bottom - alignOffset - parentRect.top;
			container.style.setProperty('--new-events-button-y', `${Math.round(offset)}px`);
			container.style.left = '50%';
		}
	});

	let initialized = false;
	return {
		start() {
			if (initialized)
				return;
			window.addEventListener('scroll', handleScroll, { passive: true });
			window.addEventListener('resize', handleScroll);
			handleScroll();
			initialized = true;
		},
		stop() {
			if (!initialized)
				return;
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleScroll);
			initialized = false;
		},
		update() {
			if (!initialized)
				return;
			handleScroll();
		}
	};
}
