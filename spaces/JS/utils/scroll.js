export function preventScrollShifting(fn) {
	const doc = document.documentElement;
	const prevHeight = doc.scrollHeight;
	const prevY = window.scrollY;

	fn();

	const delta = doc.scrollHeight - prevHeight;
	if (delta)
		window.scrollTo(0, prevY + delta);
}

export function getPageHeaderOffset() {
	return parseFloat(document.documentElement.style.getPropertyValue('--page-header-offset') || '0');
}

export function scrollIntoViewIfNotVisible(target, options = {}) {
	options = {
		start: "start",
		end: "end",
		behavior: "smooth",
		...options,
	};
	const rect = target.getBoundingClientRect();
	const headerOffset = getPageHeaderOffset();
	if (rect.bottom > window.innerHeight) {
		target.scrollIntoView({ block: options.end, inline: "nearest", behavior: options.behavior });
	} else if (rect.top < headerOffset) {
		target.scrollIntoView({ block: options.start, inline: "nearest", behavior: options.behavior });
	}
}
