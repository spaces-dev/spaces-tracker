export function resizeLimit(w, h, limitW, limitH) {
	const aspectRatio = w / h;
	if (h > limitH) {
		w = limitH * aspectRatio;
		h = limitH;
	}
	if (w > limitW) {
		w = limitW;
		h = limitW / aspectRatio;
	}
	return [Math.round(w), Math.round(h)];
}

export function resizeContain(w, h, containerW, containerH) {
	const aspectRatio = w / h;
	const containerAspectRatio = containerW / containerH;
	if (aspectRatio > containerAspectRatio) {
		return [Math.round(containerW), Math.round(containerW / aspectRatio)];
	} else {
		return [Math.round(containerH * aspectRatio), Math.round(containerH)];
	}
}
