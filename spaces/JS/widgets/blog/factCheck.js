import module from 'module';
import $ from '../../jquery';
import { getNearestPopper, getPopperById } from '../popper';
import { L } from '../../utils';
import * as pushstream from '../../core/lp';
import { simplePagination } from '../fragments/simplePagination';
import { WALLET_RENDER_MODE } from '../../pages/ai/wallet';

let instances = {};

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
	history({ topicId, pagination, details, checked }) {
		return `
			<div class="dropdown-content">
				<div class="content-item3 wbg">
					<div class="sub-title">${L('История проверок')}</div>
					${details}
				</div>
				${pagination}
			</div>

			<div class="dropdown-content ${!checked ? 'hide' : ''}">
				<div
					class="js-popper_open list-link list-link-grey list-link--short list-link_last t_center"
					data-popper-id="factcheck_result_dropdown_${topicId}"
				>
					<span class="ico ico_history"></span>
					${L("Показать текущую проверку")}
				</div>
			</div>
		`;
	},
	message({ message, isError }) {
		return `
			<div class="dropdown-content">
				<div class="content-item3 wbg ${isError ? 'red' : 'grey'} content-bl__sep">
					${message}
				</div>
				<div class="js-popper_close list-link list-link-grey list-link--short list-link_last t_center">
					<span class="ico ico_remove"></span>
					${L("Закрыть")}
				</div>
			</div>
		`;
	},
	errorInline(err) {
		return `
			Достоверность:
			<span class="red">${err}</span>
			<a href="#" class="js-action_link" data-action="blog_check_for_truth">(повторить)</a>
		`;
	}
};

function initFactCheck(topicId) {
	let params;
	let resultPopper, historyPopper, requestPopper;

	let currentPage = 0;
	let totalPages = 0;

	const getWallet = async () => {
		const response = await Spaces.asyncApi("services.ai.wallet.get", { Mode: WALLET_RENDER_MODE.INLINE });
		if (response.code != 0)
			throw new Error(Spaces.apiError(response));
		return response.widget;
	};

	const showError = (error) => {
		requestPopper.$content()
			.find('.js-error')
			.toggleClass('hide', !error)
			.html(error ?? '');
	};

	const showInlineError = (error) => {
		$(`#factcheck_${topicId}`).html(tpl.errorInline(error));
	};

	const renderHistory = () => {
		const offset = (currentPage - 1);
		historyPopper.$content().html(tpl.history({
			topicId,
			details: params.history[offset],
			pagination: simplePagination({ current: currentPage, total: totalPages }),
			checked: params.checked,
		}));
	};

	const replaceWidget = (widget) => {
		instances[topicId].destroy();
		$(`#factcheck_${topicId}`).replaceWith(widget);
		init();
	};

	const collapseStatements = () => {
		const factCheckWidget = $(`#factcheck_${topicId}`);
		factCheckWidget.find('.js-action_link[data-action="factcheck_show_all"]').removeClass('hide');
		factCheckWidget.find('.js-factcheck_statement[data-is-top="false"]').addClass('hide');
	};

	const init = () => {
		const factCheckWidget = $(`#factcheck_${topicId}`);
		params = factCheckWidget.data();

		resultPopper = getPopperById(`factcheck_result_dropdown_${topicId}`);
		historyPopper = getPopperById(`factcheck_history_dropdown_${topicId}`);
		requestPopper = getPopperById(`factcheck_dropdown_${topicId}`);

		currentPage = 0;
		totalPages = 0;

		instances[topicId] = {
			handleMessage: async (message) => {
				if (message.status == "SUCCESS") {
					const response = await Spaces.asyncApi("diary.topic.factCheck", { Id: topicId, Info: 1, CK: null });
					if (response.code == 0) {
						replaceWidget(response.widget);
					} else {
						showInlineError(Spaces.apiError(response));
					}
				} else {
					showInlineError(L("При проверке текста произошла ошибка"));
				}
			},
			destroy: () => {
				requestPopper.destroy();
				resultPopper.destroy();
				historyPopper.destroy();
				delete instances[topicId];
				requestPopper = resultPopper = historyPopper = undefined;
			}
		};

		historyPopper.on('beforeOpen', () => {
			totalPages = params.history.length;
			currentPage = 1;
			renderHistory();
		});

		historyPopper.on('afterClose', () => {
			collapseStatements();
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
			if (!Spaces.params.nid) {
				requestPopper.$content().html(tpl.message({
					message: [
						L("Проверка достоверности доступна только авторизированным пользователям."),
						`<a href="/registration/loginform/">${L("Войти")}</a> или <a href="/registration/new/">${L("зарегистрироваться")}</a>.`,
					].join('<br />')
				}));
				return;
			}

			requestPopper.$content().html(tpl.loader());
			try {
				const wallet = await getWallet();
				requestPopper.$content().html(tpl.checkForm({
					cost: params.cost,
					wallet
				}));
			} catch (e) {
				requestPopper.$content().html(tpl.message({
					message: e.message,
					isError: e
				}));
			}
		});

		requestPopper.on('afterClose', () => {
			collapseStatements();
		});

		$(`#factcheck_${topicId}`).action("blog_check_for_truth", async function (e) {
			e.preventDefault();

			showError(undefined);

			const link = $(this);
			const toggleLoading = (flag) => {
				if (link.hasClass('list-link')) {
					link.find('.js-ico').toggleClass('ico_spinner', flag);
					link.toggleClass("list-link--is-disabled", flag);
				}
			};

			toggleLoading(true);
			const response = await Spaces.asyncApi("diary.topic.factCheck", { Id: topicId, CK: null });
			toggleLoading(false);

			if (response.code != 0) {
				showError(Spaces.apiError(response));
				return;
			}

			replaceWidget(response.widget);
		});

		factCheckWidget.action("factcheck_show_all", function (e) {
			e.preventDefault();
			const content = getNearestPopper(this).$content();
			content.find('.js-factcheck_statement').removeClass('hide');
			$(this).addClass('hide');
		});

		factCheckWidget.data('inited', true);
	};

	init();
}

module.on('componentpage', () => {
	pushstream.on('message', 'diary_fact_check', async (message) => {
		if (message.act == pushstream.TYPES.DIARY_TOPIC_FACT_CHECK) {
			if (instances[message.topic_id])
				instances[message.topic_id].handleMessage(message);
		}
	});
});

module.on('component', () => {
	for (const factcheckWidget of document.querySelectorAll('.js-factcheck:not([data-inited])'))
		initFactCheck(factcheckWidget.dataset.topicId);
});

module.on('componentpagedone', () => {
	pushstream.off('message', 'diary_fact_check');
	for (const instance of Object.values(instances))
		instance.destroy();
});
