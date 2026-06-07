import module from 'module';
import $ from '../../jquery';
import { getPopperById } from '../popper';
import { L } from '../../utils';
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
						${result.text || L("Запись содержит достоверную информацию (проверено через искуственный интеллект).")}
					</div>
				</div>
				${pagination}
			</div>
		`;
	},
	error(errMsg) {
		return `
			<div class="dropdown-content">
				<div class="content-item3 content-bl__sep red">
					${errMsg}
				</div>
				<div class="js-popper_close list-link list-link-grey list-link--short list-link_last t_center">
					<span class="ico ico_remove"></span>
					${L('Закрыть')}
				</div>
			</div>
		`;
	}
};

function initFactCheck() {
	const { cost, topicId, checkHistory } = $('#factcheck').data();

	const resultPopper = getPopperById('factcheck_result_dropdown');
	const historyPopper = getPopperById('factcheck_history_dropdown');
	const requestPopper = getPopperById('factcheck_dropdown');

	let currentPage = 0;
	let totalPages = 0;

	const getWallet = async () => {
		const response = await Spaces.asyncApi("services.ai.wallet.get", { Mode: WALLET_RENDER_MODE.INLINE });
		return response.widget;
	};

	const showError = (error) => {
		requestPopper.$content().html(tpl.error(error));
	};

	const renderHistory = () => {
		const offset = (currentPage - 1);
		historyPopper.$content().html(tpl.history({
			result: checkHistory[offset],
			pagination: simplePagination({ current: currentPage, total: totalPages }),
		}));
	};

	historyPopper.on('beforeOpen', () => {
		totalPages = checkHistory.length;
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
			cost,
			wallet
		}));
	});

	requestPopper.$content().action("blog_check_for_truth", async function (e) {
		e.preventDefault();

		const link = $(this);
		const toggleLoading = (flag) => {
			link.find('.js-ico').toggleClass('ico_spinner', flag);
			link.toggleClass("list-link--is-disabled", flag);
		};

		toggleLoading(true);
		const response = await Spaces.asyncApi("diary.topic.factCheck", { Id: topicId, CK: null });
		toggleLoading(false);

		if (response.code != 0) {
			showError(Spaces.apiError(response));
			return;
		}

		$('#factcheck').replaceWith(response.widget);
		requestPopper.destroy();
		resultPopper.destroy();
		historyPopper.destroy();
		setTimeout(() => initFactCheck());
	});
}

module.on('componentpage', initFactCheck);
