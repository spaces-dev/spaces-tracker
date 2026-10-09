import videojs from 'video.js';

videojs.registerPlugin('resizeMonitor', function VideoJsResizeMonitor() {
	const element = this.el();
	const handleResize = () => {
		const rect = element.getBoundingClientRect();
		element.style.setProperty('--vjs-width', rect.width + 'px');
		element.style.setProperty('--vjs-height', rect.height + 'px');
	};

	this.on('playerresize', handleResize);

	const resizeObserver = new ResizeObserver(handleResize);
	resizeObserver.observe(element);

	this.on('dispose', () => {
		resizeObserver.disconnect();
	});
});
