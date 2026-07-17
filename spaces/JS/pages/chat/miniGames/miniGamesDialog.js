import module from "module";
import pageLoader from '../../../ajaxify';
import { getDialogById } from '../../../widgets/dialog';
import { L } from "../../../utils";
import { Url } from "../../../spacesLib";
import { useIframePort } from "./iframePort";
import { snakeToCamelCase } from "../../../utils/string";

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
						<div class="dialog-inner-popup__header-spacer"></div>

						<div class="dialog-inner-popup__header-title">
							${L("Подтвердите покупку")}
						</div>

						<div class="dialog-inner-popup__header-actions js-action_link" data-action="payment_cancel">
							<div class="dialog-inner-popup__button">
								<svg viewBox="0 0 1024 1026.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor">
									<path d="M738 226q12-13 30-13t30 13q13 12 13 30t-13 30L572 512l226 226q13 12 13 30t-13 30q-12 13-30 13t-30-13L512 572 286 798q-12 13-30 13t-30-13q-13-12-13-30t13-30l226-226-226-226q-13-12-13-30t13-30q12-13 30-13t30 13l226 226 226-226z"/>
								</svg>
							</div>
						</div>
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
			handlePayment(payload);
			break;
		}

		case "WEBVIEW_GAME_PREVIEW": {
			// Что-то для android
			break;
		}

		case "LOCK_COLLAPSE":
			miniGamesDialog.setCollapsible(!payload.shouldLock);
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

	if (paymentSession)
		handlePaymentDone(false);

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
	miniGamesDialog.setCollapsible(false);
	miniGamesDialog = undefined;
	allowCloseDialog = false;
}

function handlePaymentDone(success) {
	if (!paymentSession)
		return;
	if (success) {
		port.send({ type: 'PAYMENT_SUCCESS', ...paymentSession });
	} else {
		port.send({ type: 'PAYMENT_CANCELLED', ...paymentSession });
	}
	paymentSession = undefined;
}

async function handlePayment({ provider, paymentSessionId, billingParams }) {
	paymentSession = { provider, paymentSessionId };

	port.send({ type: 'PAYMENT_REQUEST_ACK', ...paymentSession });

	const response = await Spaces.asyncApi("app.billing.transaction", { Form: 1, ...billingParams });
	if (response.code != 0) {
		handlePaymentDone(false);
		return;
	}

	const dialogContent = $(miniGamesDialog.content());
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
