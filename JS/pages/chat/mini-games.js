import module from "module";
import pageLoader from '../../ajaxify';
import { getDialogById } from '../../widgets/dialog';

let miniGamesDialog;
let dialogCloseTimer;
let allowCloseDialog;

module.on("componentpage", async () => {
	if (miniGamesDialog) {
		if (hasInviteCode()) {
			await getDialogById(miniGamesDialog.id).expand();
			handleInviteCode();
		}
	} else {
		initMiniGames();
	}
});

function initMiniGames() {
	allowCloseDialog = false;

	const dialog = document.querySelector('#mini_games_dialog_template');
	dialog.id = 'mini_games_dialog';
	dialog.addEventListener('dialog:beforeOpen', handleDialogBeforeOpen);
	dialog.addEventListener('dialog:expanded', () => {
		sendMessage({ type: 'WINDOW_COLLAPSED', collapsed: false });
	});
	dialog.addEventListener('dialog:collapsed', () => {
		sendMessage({ type: 'WINDOW_COLLAPSED', collapsed: true });
	});
	dialog.addEventListener('dialog:beforeClose', handleDialogBeforeClose);
	dialog.addEventListener('dialog:afterClose', handleDialogClose);

	if (hasInviteCode())
		getDialogById(dialog.id).open();
}

function handleDialogBeforeOpen(e) {
	miniGamesDialog = e.currentTarget;

	const iframe = document.createElement('iframe');
	iframe.src = miniGamesDialog.dataset.url;
	iframe.onload = () => {
		sendMessage({
			type: 'AUTH_TOKEN',
			token: miniGamesDialog.dataset.token,
			context: 'spaces',
			lang: Spaces.params.lang,
		});
		handleInviteCode();
	};
	iframe.width = '100%';
	iframe.height = '100%';
	iframe.allow = "clipboard-write; clipboard-read; camera; microphone; geolocation; accelerometer; gyroscope; magnetometer; device-orientation;"
	iframe.setAttribute('allowfullscreen', '');

	miniGamesDialog.querySelector('.js-dialog_content').appendChild(iframe);
	window.addEventListener('message', handleMessage);
}

function handleDialogBeforeClose(e) {
	if (allowCloseDialog)
		return;
	e.preventDefault();
	dialogCloseTimer = setTimeout(() => {
		console.warn(`[mini-games] IFRAME_CLOSE timeout`);
		dialogCloseTimer = undefined;
		allowCloseDialog = true;
		getDialogById(miniGamesDialog.id).close();
	}, 200);
	sendMessage({ type: 'IFRAME_CLOSE' });
}

function handleDialogClose() {
	window.removeEventListener('message', handleMessage);
	miniGamesDialog.querySelector('.js-dialog_content').innerHTML = '';
	miniGamesDialog = undefined;
}

function handleMessage(e) {
	if (e.origin !== new URL(miniGamesDialog.dataset.url).origin) {
		console.warn('Received message from untrusted origin:', e.origin);
		return
	}

	// console.log(e.data);

	if (e.data.type == 'NAVIGATE_TO_URL') {
		getDialogById(miniGamesDialog.id).collapse();
		if (!pageLoader.loadPage({ url: e.data.url }))
			window.open(e.data.url, '_blank', 'noopener,noreferrer');
	} else if (e.data.type == 'IFRAME_CLOSE_RECEIVED') {
		if (dialogCloseTimer) {
			clearTimeout(dialogCloseTimer);
			dialogCloseTimer = undefined;
		}
	} else if (e.data.type == 'IFRAME_CLOSE_CONFIRMED') {
		allowCloseDialog = true;
		getDialogById(miniGamesDialog.id).close();
	} else if (e.data.type == 'IFRAME_CLOSE_CANCELLED') {
		allowCloseDialog = false;
		getDialogById(miniGamesDialog.id).expand();
	} else {
		console.error("[mini-games] unknown message:", e.data);
	}
}

function hasInviteCode() {
	const currentURL = new URL(location.href);
	return currentURL.searchParams.has("mini_game");
}

function handleInviteCode() {
	const currentURL = new URL(location.href);
	if (!currentURL.searchParams.has("mini_game"))
		return;
	sendMessage({
		type: 'GAME_INVITE',
		gameName: currentURL.searchParams.get("mini_game"),
		inviteCode: currentURL.searchParams.get("mini_game_invite_code"),
		context: 'spaces',
	});
	currentURL.searchParams.delete("mini_game");
	currentURL.searchParams.delete("mini_game_invite_code");
	history.replaceState(history.state, document.title, currentURL.toString());
}

function sendMessage(message) {
	const iframe = miniGamesDialog.querySelector('iframe');
	iframe.contentWindow.postMessage(message, miniGamesDialog.dataset.url);
	// console.log(message);
}
