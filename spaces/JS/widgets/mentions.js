import module from 'module';
import Spaces from '../spacesLib';
import { isVisibleOnScreen } from '../utils/dom';

module.on('componentpage', () => {
	let observer;

	const handleMentionRead = (beacon) => {
		const objectId = beacon.dataset.objectId;
		const objectType = beacon.dataset.objectType;
		Spaces.asyncApi("user.mention.view", {
			CK: null,
			Ot: objectType,
			Oid: objectId,
		});
		observer.unobserve(beacon);
		beacon.remove();
	};

	observer = new IntersectionObserver((items) => {
		for (const item of items) {
			if (item.isIntersecting)
				handleMentionRead(item.target);
		}
	});

	module.on('component', () => {
		for (const beacon of document.querySelectorAll('.js-mention_beacon:not([data-inited])')) {
			observer.observe(beacon);
			beacon.dataset.inited = "true";
		}
	});

	return () => {
		observer.disconnect();
		observer = undefined;
		module.on('component', undefined);
	};
});

export function getVisibleUnreadMentionsCount() {
	let count = 0;
	for (const beacon of document.querySelectorAll('.js-mention_beacon')) {
		if (isVisibleOnScreen(beacon))
			count++;
	}
	return count;
}

export function isMentionsVisible(objectType, objectId) {
	const beacon = document.getElementById(`mention_${objectType}_${objectId}`);
	return beacon && isVisibleOnScreen(beacon);
}
