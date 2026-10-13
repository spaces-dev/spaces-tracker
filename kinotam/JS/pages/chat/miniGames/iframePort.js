export function useIframePort(handlePortMessage, channelName = undefined) {
	const DEBUG = !!cookie.get('mini_games_debug');
	let currentIframe;

	const handleMessage = (e) => {
		if (!currentIframe)
			return;
		if (e.origin !== new URL(currentIframe.src).origin)
			return;
		if (e.data.messageName && e.data.messageName !== channelName)
			return;

		const payload = channelName ? e.data.payload : e.data;
		if (DEBUG)
			console.log(`[iframe-port]${channelName ? ` [${channelName}]` : ``} recv`, payload);
		handlePortMessage(payload);
	};

	return {
		send(payload) {
			if (!currentIframe)
				throw new Error(`Port not binded to iframe!!!`);
			if (DEBUG)
				console.log(`[iframe-port]${channelName ? ` [${channelName}]` : ``} send`, payload);
			const message = channelName ? { messageName: channelName, payload } : payload;
			currentIframe.contentWindow.postMessage(message, currentIframe.src);
		},
		bind(iframe) {
			currentIframe = iframe;
			window.addEventListener('message', handleMessage);
		},
		unbind() {
			window.removeEventListener('message', handleMessage);
		}
	};
}
