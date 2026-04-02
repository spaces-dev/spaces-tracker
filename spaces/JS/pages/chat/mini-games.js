import module from "module";
import pageLoader from '../../ajaxify';
import { getDialogById } from '../../widgets/dialog';
import { L } from "../../utils";
import { Url } from "../../spacesLib";
import cookie from "../../cookie";

let miniGamesDialog;
let dialogCloseTimer;
let allowCloseDialog;
let paymentSession;

const tpl = {
	paymentForm({ cashWidget, form }) {
		return `
			<div class="dialog__shadow js-mini_games_payment_form">
				<div class="dialog-inner-popup">
					<div class="dialog-inner-popup__header">
						<div class="dialog-inner-popup__header-actions js-action_link" data-action="payment_cancel">
							<div class="dialog-inner-popup__button">
								<svg viewBox="0 0 1024 1026.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor">
									<path d="M738 226q12-13 30-13t30 13q13 12 13 30t-13 30L572 512l226 226q13 12 13 30t-13 30q-12 13-30 13t-30-13L512 572 286 798q-12 13-30 13t-30-13q-13-12-13-30t13-30l226-226-226-226q-13-12-13-30t13-30q12-13 30-13t30 13l226 226 226-226z"/>
								</svg>
							</div>
						</div>

						<div class="dialog-inner-popup__header-title">
							${L("Подтвердите покупку")}
						</div>

						<div class="dialog-inner-popup__header-spacer"></div>
					</div>
					${cashWidget}
					<div class="content-bl__sep"></div>
					${form}
				</div>
			</div>
		`;
	}
};

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

	if (paymentSession)
		handlePaymentDone(false);

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

	if (cookie.get('mini_games_debug'))
		console.log("[mini-games] handleMessage", e.data);

	if (e.data.type == 'REQUEST_AUTH_TOKEN') {
		sendMessage({
			type: 'AUTH_TOKEN',
			token: miniGamesDialog.dataset.token,
			context: 'spaces',
			lang: Spaces.params.lang,
		});
		handleInviteCode();
	} else if (e.data.type == 'NAVIGATE_TO_URL') {
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
	} else if (e.data.type == 'PAYMENT_REQUEST') {
		handlePayment(e.data);
	} else if (e.data.type == 'WEBVIEW_GAME_PREVIEW') {
		// Что-то для android
	} else {
		console.error("[mini-games] unknown message:", e.data);
	}
}

function handlePaymentDone(success) {
	if (!paymentSession)
		return;
	if (success) {
		sendMessage({ type: 'PAYMENT_SUCCESS', ...paymentSession });
	} else {
		sendMessage({ type: 'PAYMENT_CANCELLED', ...paymentSession });
	}
	paymentSession = undefined;
}

async function handlePayment({ provider, paymentSessionId, billingParams }) {
	paymentSession = { provider, paymentSessionId };

	sendMessage({ type: 'PAYMENT_REQUEST_ACK', ...paymentSession });

	const response = await Spaces.asyncApi("app.billing.transaction", { Form: 1, ...billingParams });
	if (response.code != 0) {
		handlePaymentDone(false);
		return;
	}

	const dialogContent = $(miniGamesDialog.querySelector('.js-dialog_content'));
	dialogContent.append(tpl.paymentForm({
		form: response.form,
		cashWidget: response.cashWidget,
	}));

	const setFormError = (error) => {
		paymentForm.find('.js-payment_form_error').toggleClass('hide', !error).html(error);
	};

	const setLoading = (flag) => {
		const submitButton = paymentForm.find('button[name="cfms"]');
		submitButton.prop("disabled", flag);
		submitButton.find('.js-ico').toggleClass('ico_spinner', flag);
	};

	const paymentForm = dialogContent.find('.js-mini_games_payment_form');
	paymentForm.action('payment_cancel', function (e) {
		e.preventDefault();
		paymentForm.remove();
		handlePaymentDone(false);
	});
	paymentForm.on('submit', async function (e) {
		e.preventDefault();

		setFormError(undefined);
		setLoading(true);

		const formParams = Url.serializeForm(this);
		const response = await Spaces.asyncApi("app.billing.transaction", { ...formParams });

		setLoading(false);

		if (response.code == 0) {
			console.log("[mini-games] payment successful!");
			paymentForm.remove();
			handlePaymentDone(true);
			return;
		}

		setFormError(Spaces.apiError(response));
	});
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

	if (cookie.get('mini_games_debug'))
		console.log("[mini-games] sendMessage", message);
}
