import module from "module";
import { getPopperById } from "../../../widgets/popper";
import { useIframePort } from "./iframePort";
import { useMiniGamesPayment } from "./payment";

const DEFAULT_MENU_HEIGHT = 360;
const CHAT_HINT_STORAGE_KEY = `mini-games-chat-hint:${Spaces.params.nid}`;

module.on("componentpage", () => {
	const gameSelector = getPopperById("mini_games_selector");
	const hint = getPopperById("mini_games_chat_hint");
	const gameButton = document.querySelector('[data-popper-id="mini_games_selector"]');
	const port = useIframePort((payload) => {
		switch (payload.type) {
			case "REQUEST_AUTH_TOKEN": {
				port.send({
					type: 'AUTH_TOKEN',
					token: gameSelector.element().dataset.token,
					context: 'spaces',
					lang: Spaces.params.lang,
				});
				break;
			}

			case "MINI_GAMES_WIDGET_READY": {
				gameSelector.element().classList.remove('mini-games-selector--is-loading');
				break;
			}

			case "MINI_GAMES_SELECTED": {
				gameSelector.close();
				break;
			}

			case "MINI_GAMES_WIDGET_CLOSE": {
				gameSelector.close();
				break;
			}

			case "PAYMENT_REQUEST": {
				paymentForm.request(payload);
				break;
			}

			case "MG_ERROR": {
				console.error('[mini-games-selector] error:', payload.code, payload.message)
				break;
			}

			default: {
				console.error("[mini-games-selector] unknown message:", payload);
				break;
			}
		}
	}, "MINI_GAMES_WIDGET");

	const paymentForm = useMiniGamesPayment(port, gameSelector.$content());
	if (!localStorage.getItem(CHAT_HINT_STORAGE_KEY)) {
		gameButton.addEventListener('click', () => hint.close());
		hint.element().addEventListener('click', () => gameSelector.open({}, gameButton));
		gameSelector.on('afterOpen', () => localStorage.setItem(CHAT_HINT_STORAGE_KEY, '1'));
		hint.open({}, gameButton);
	}

	const updateMenuHeight = () => {
		const iframe = gameSelector.content().querySelector('iframe');
		const iframeHeight = Math.min(DEFAULT_MENU_HEIGHT, window.innerHeight - 50);
		iframe.height = `${iframeHeight}px`;
	};

	gameSelector.on('beforeOpen', () => {
		const excludeGames = JSON.parse(gameSelector.opener().dataset.excludeGames ?? `[]`);
		const includeGames = JSON.parse(gameSelector.opener().dataset.includeGames ?? `[]`);
		const hideOffline = JSON.parse(gameSelector.opener().dataset.hideOffline ?? `[]`);

		const iframeUrl = new URL(`${gameSelector.element().dataset.url}/activity-starter-widget.html`);
		iframeUrl.searchParams.set("lang", Spaces.params.lang);

		for (const game of excludeGames)
			iframeUrl.searchParams.append("excludeGames", game);
		for (const game of includeGames)
			iframeUrl.searchParams.append("includeGames", game);
		for (const game of hideOffline)
			iframeUrl.searchParams.append("hideOffline", game);

		gameSelector.element().classList.add('mini-games-selector--is-loading');
		const iframe = document.createElement('iframe');
		iframe.src = iframeUrl.toString();
		iframe.width = '100%';
		iframe.height = Math.round(window.innerHeight / 2) + "px";
		iframe.allow = "clipboard-write; clipboard-read; camera; microphone; geolocation; accelerometer; gyroscope; magnetometer; device-orientation; autoplay;"
		iframe.setAttribute('allowfullscreen', '');
		port.bind(iframe);
		gameSelector.content().appendChild(iframe);
		updateMenuHeight();
		window.addEventListener('resize', updateMenuHeight);
	});
	gameSelector.on("afterClose", () => {
		paymentForm.cancel();
		port.unbind();
		gameSelector.content().innerHTML = '';
		window.removeEventListener('resize', updateMenuHeight);
	});
});
