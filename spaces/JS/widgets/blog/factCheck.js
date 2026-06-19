import module from 'module';
import $ from '../../jquery';
import { getPopperById } from '../popper';
import { L } from '../../utils';
import * as pushstream from '../../core/lp';
import { simplePagination } from '../fragments/simplePagination';
import { WALLET_RENDER_MODE } from '../../pages/ai/wallet';

const tpl = {
	checkForm({ cost, wallet }) {
		return `
			<div class="dropdown-content">
				${wallet}
			</div>

			<div class="dropdown-content">
				<div class="content-item3 wbg content-bl__sep grey">
					${L('ИИ проверит достоверность информации в публикации и подготовит краткое обоснование вывода.')}
					${L('Результат проверки будет отображаться в публикации и доступен всем пользователям.')}
					<div class="js-error system-message system-message_alert no-shadow hide mt"></div>
				</div>

				<div
					class="js-action_link list-link list-link-blue list-link--short list-link_last t_center"
					data-action="blog_check_for_truth"
				>
					<span class="ico ico_ok_blue js-ico"></span>
					${L("Проверить достоверность ({0})", cost)}
				</div>
			</div>
		`;
	},
	loader() {
		return `
			<div class="dropdown-content">
				<div class="content-item3 wbg grey">
					<span class="ico ico_spinner"></span>
					${L('Загрузка....')}
				</div>
			</div>
		`;
	},
	history({ pagination, result }) {
		return `
			<div class="dropdown-content">
				<div class="content-item3 wbg">
					<div class="sub-title">${L('История проверок')}</div>
					<span class="grey">Дата проверки:</span> ${result.date}
					<div class="pad_t_a">
						${result.list ? tpl.detailsWithFacts({ result }) : tpl.details({ result })}

					</div>
				</div>
				${pagination}
			</div>
		`;
	},
	detailsWithFacts({ result }) {
		return `
			<ol>
				${result.list.map((item) => `
					<li>
						<span class="${item.true ? 'green' : 'red'}">
							${item.statement}
							(${L("достоверность:")}${item.truth <= 10 ? L("низкая") : `${item.truth}%`})
						</span><br />
						${item.explain}
					</li>
				`)}
			</ol>
		`;
	},
	details({ result }) {
		if (result.true) {
			return L("Запись содержит достоверную информацию (проверено через искуственный интеллект).");
		} else {
			return result.text;
		}
	},
	errorInline(err) {
		return `
			<span class="red">${err}</span>
		`;
	}
};

function initFactCheck() {
	let params;
	let resultPopper, historyPopper, requestPopper;

	let currentPage = 0;
	let totalPages = 0;

	const getWallet = async () => {
		const response = await Spaces.asyncApi("services.ai.wallet.get", { Mode: WALLET_RENDER_MODE.INLINE });
		return response.widget;
	};

	const showError = (error) => {
		requestPopper.$content()
			.find('.js-error')
			.toggleClass('hide', !error)
			.html(error ?? '');
	};

	const renderHistory = () => {
		const offset = (currentPage - 1);
		historyPopper.$content().html(tpl.history({
			result: params.history[offset],
			pagination: simplePagination({ current: currentPage, total: totalPages }),
		}));
	};

	const replaceWidget = (widget) => {
		module.finalize(import.meta.id('./factCheck'));
		$('#factcheck').replaceWith(widget);
	};

	const init = () => {
		params = $('#factcheck').data();

		resultPopper = getPopperById('factcheck_result_dropdown');
		historyPopper = getPopperById('factcheck_history_dropdown');
		requestPopper = getPopperById('factcheck_dropdown');

		currentPage = 0;
		totalPages = 0;

		pushstream.on('message', 'diary_fact_check', async (message) => {
			if (message.act == pushstream.TYPES.DIARY_TOPIC_FACT_CHECK && message.topic_id == params.topicId) {
				const response = await Spaces.asyncApi("diary.topic.factCheck", { Id: params.topicId, Info: 1, CK: null });
				if (response.code == 0) {
					replaceWidget(response.widget);
				} else {
					replaceWidget(tpl.errorInline(Spaces.apiError(response)));
				}
			}
		});

		historyPopper.on('beforeOpen', () => {
			totalPages = params.history.length;
			currentPage = 1;
			renderHistory();
		});

		historyPopper.$content().on('click', '.js-simple_pagination', async function (e) {
			e.preventDefault();
			const link = $(this);
			const direction = link.data('dir');
			if (direction == 'prev')
				currentPage--;
			if (direction == 'next')
				currentPage++;
			renderHistory();
		});

		requestPopper.on('beforeOpen', async () => {
			requestPopper.$content().html(tpl.loader());

			const wallet = await getWallet();

			requestPopper.$content().html(tpl.checkForm({
				cost: params.cost,
				wallet
			}));
		});

		requestPopper.$content().action("blog_check_for_truth", async function (e) {
			e.preventDefault();

			showError(undefined);

			const link = $(this);
			const toggleLoading = (flag) => {
				link.find('.js-ico').toggleClass('ico_spinner', flag);
				link.toggleClass("list-link--is-disabled", flag);
			};

			toggleLoading(true);
			const response = await Spaces.asyncApi("diary.topic.factCheck", { Id: params.topicId, CK: null });
			toggleLoading(false);

			if (response.code != 0) {
				showError(Spaces.apiError(response));
				return;
			}

			replaceWidget(response.widget);
		});
	};

	const destroy = () => {
		requestPopper.destroy();
		resultPopper.destroy();
		historyPopper.destroy();
		pushstream.off('message', 'diary_fact_check');
	};

	init();

	return () => destroy();
}

module.on('componentpage', initFactCheck);
