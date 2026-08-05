import module from "module";
import pageLoader from '../../../ajaxify';
import { getDialogById } from '../../../widgets/dialog';
import { useIframePort } from "./iframePort";
import { snakeToCamelCase } from "../../../utils/string";
import { useMiniGamesPayment } from "./payment";

let miniGamesDialog;
let dialogCloseTimer;
let allowCloseDialog;
let paymentForm;

module.on("componentpage", async () => {
	if (miniGamesDialog) {
		if (hasInviteCode()) {
			await miniGamesDialog.expand();
			handleInviteCode();
		}
	} else {
		initMiniGames();
	}

	$('#main').action('mini_game_open', function (e) {
		e.preventDefault();
		if (miniGamesDialog) {
			port.send({
				type: 'GAME_INVITE',
				context: 'spaces',
				...JSON.parse(this.dataset.miniGamesInvite),
			});
			miniGamesDialog.expand();
		} else {
			const dialog = getDialogById("mini_games_dialog");
			dialog.open({}, this);
		}
	});
});

const port = useIframePort((payload) => {
	switch (payload.type) {
		case "REQUEST_AUTH_TOKEN": {
			port.send({
				type: 'AUTH_TOKEN',
				token: miniGamesDialog.element().dataset.token,
				context: 'spaces',
				lang: Spaces.params.lang,
			});
			handleInviteCode();
			break;
		}

		case "NAVIGATE_TO_URL": {
			miniGamesDialog.collapse();
			if (!pageLoader.loadPage({ url: payload.url }))
				window.open(payload.url, '_blank', 'noopener,noreferrer');
			break;
		}

		case "IFRAME_CLOSE_RECEIVED": {
			if (dialogCloseTimer) {
				clearTimeout(dialogCloseTimer);
				dialogCloseTimer = undefined;
			}
			break;
		}

		case "IFRAME_CLOSE_CONFIRMED": {
			allowCloseDialog = true;
			miniGamesDialog.close();
			break;
		}

		case "IFRAME_CLOSE_CANCELLED": {
			allowCloseDialog = false;
			miniGamesDialog.expand();
			break;
		}

		case "PAYMENT_REQUEST": {
			paymentForm.request(payload);
			break;
		}

		case "WEBVIEW_GAME_PREVIEW": {
			// Что-то для android
			break;
		}

		case "LOCK_COLLAPSE":
			miniGamesDialog.setCollapsible(!payload.shouldLock);
			if (payload.shouldLock && miniGamesDialog.isCollapsed())
				miniGamesDialog.expand();
			break;

		default: {
			console.error("[mini-games] unknown message:", payload);
			break;
		}
	}
});

function initMiniGames() {
	allowCloseDialog = false;

	const dialogElement = document.querySelector('#mini_games_dialog_template');
	dialogElement.id = 'mini_games_dialog';
	dialogElement.addEventListener('dialog:beforeOpen', handleDialogBeforeOpen);
	dialogElement.addEventListener('dialog:expanded', () => {
		port.send({ type: 'WINDOW_COLLAPSED', collapsed: false });
	});
	dialogElement.addEventListener('dialog:collapsed', () => {
		port.send({ type: 'WINDOW_COLLAPSED', collapsed: true });
	});
	dialogElement.addEventListener('dialog:beforeClose', handleDialogBeforeClose);
	dialogElement.addEventListener('dialog:afterClose', handleDialogClose);

	if (hasInviteCode()) {
		const dialog = getDialogById(dialogElement.id);
		dialog.open({}, document.createElement('div'));
	}
}

function handleDialogBeforeOpen(e) {
	miniGamesDialog = e.detail.dialog;
	paymentForm = useMiniGamesPayment(port, miniGamesDialog.$content());

	const iframe = document.createElement('iframe');
	iframe.src = miniGamesDialog.element().dataset.url;
	iframe.width = '100%';
	iframe.height = '100%';
	iframe.allow = "clipboard-write; clipboard-read; camera; microphone; geolocation; accelerometer; gyroscope; magnetometer; device-orientation; autoplay;"
	iframe.setAttribute('allowfullscreen', '');

	miniGamesDialog.content().appendChild(iframe);
	port.bind(iframe);
}

function handleDialogBeforeClose(e) {
	if (allowCloseDialog)
		return;
	e.preventDefault();

	paymentForm.cancel();

	dialogCloseTimer = setTimeout(() => {
		console.warn(`[mini-games] IFRAME_CLOSE timeout`);
		dialogCloseTimer = undefined;
		allowCloseDialog = true;
		miniGamesDialog.close();
	}, 200);
	port.send({ type: 'IFRAME_CLOSE' });
}

function handleDialogClose() {
	port.unbind();
	$(miniGamesDialog.content()).html('');
	miniGamesDialog.setCollapsible(true);
	miniGamesDialog = undefined;
	paymentForm = undefined;
	allowCloseDialog = false;
}

function hasInviteCode() {
	const currentURL = new URL(location.href);
	return currentURL.searchParams.has("mini_game");
}

function handleInviteCode() {
	// Инвайт из кнопки
	if (miniGamesDialog.opener().dataset.miniGamesInvite) {
		const inviteData = JSON.parse(miniGamesDialog.opener().dataset.miniGamesInvite);
		port.send({
			type: 'GAME_INVITE',
			context: 'spaces',
			...inviteData,
		});
	}

	// Инвайт из URL
	const currentURL = new URL(location.href);
	if (currentURL.searchParams.has("mini_game")) {
		const payload = {
			type: 'GAME_INVITE',
			gameName: currentURL.searchParams.get("mini_game"),
			context: 'spaces',
		};
		for (const [key, value] of currentURL.searchParams) {
			if (!key.startsWith('mini_game_'))
				continue;
			payload[snakeToCamelCase(key.replace(/^mini_game_/, ''))] = value;
			currentURL.searchParams.delete(key);
		}
		currentURL.searchParams.delete("mini_game");

		port.send(payload);
		history.replaceState(history.state, document.title, currentURL.toString());
		return;
	}
}
