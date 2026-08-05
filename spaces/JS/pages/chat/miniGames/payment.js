import { L } from "../../../utils";
import { Url } from "../../../spacesLib";

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

export function useMiniGamesPayment(port, content) {
	let paymentSession;

	const handlePaymentDone = (success) => {
		if (!paymentSession)
			return;
		if (success) {
			port.send({ type: 'PAYMENT_SUCCESS', ...paymentSession });
		} else {
			port.send({ type: 'PAYMENT_CANCELLED', ...paymentSession });
		}
		paymentSession = undefined;
	};

	const cancel = () => {
		handlePaymentDone(false);
	};

	const request = async ({ provider, paymentSessionId, billingParams }) => {
		const currentPaymentSession = { provider, paymentSessionId };
		paymentSession = currentPaymentSession;

		port.send({ type: 'PAYMENT_REQUEST_ACK', ...paymentSession });

		const response = await Spaces.asyncApi("app.billing.transaction", { Form: 1, ...billingParams });
		if (paymentSession !== currentPaymentSession)
			return;
		if (response.code != 0) {
			handlePaymentDone(false);
			return;
		}

		content.append(tpl.paymentForm({
			form: response.form,
			cashWidget: response.cashWidget,
		}));

		const paymentForm = content.find('.js-mini_games_payment_form');
		const setFormError = (error) => {
			paymentForm.find('.js-payment_form_error').toggleClass('hide', !error).html(error);
		};

		const setLoading = (flag) => {
			const submitButton = paymentForm.find('button[name="cfms"]');
			submitButton.prop("disabled", flag);
			submitButton.find('.js-ico').toggleClass('ico_spinner', flag);
		};

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
	};

	return { cancel, request };
}
