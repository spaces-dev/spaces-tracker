import module from 'module';
import { tick, updateUrlScheme } from '../../utils';
import { L, plural } from '../../core/l10n';
import * as pushstream from '../../core/lp';
import $ from '../../jquery';

const tpl = {
	image(src, srcset) {
		return `
			<span>
				<img
					width="128" height="128"
					style="max-width:100%; height: auto"
					src="${src}"
					srcset="${srcset || src}"
					class="preview"
					alt=""
				/>
			</span>
		`;
	}
};

let pendingSticker;
let genId;
let attemptNum;
let totalAttemptsCount;

function init() {
	$('#main').on("change", ".js-horiz_mode-type input", (e) => {
		tick(() => {
			const type = $('.js-horiz_mode-type input:checked').val();
			for (const tab of document.querySelectorAll('.js-sticker_gen_tab')) {
				if (tab.dataset.type == type) {
					tab.classList.remove('hide');
				} else {
					tab.classList.add('hide');
				}
			}
		});
	});

	pendingSticker = document.querySelector('.js-sticker_gen_attempt[data-is-processing]');
	if (pendingSticker) {
		genId = +pendingSticker.dataset.genId;
		attemptNum = +pendingSticker.dataset.attemptNum;
		totalAttemptsCount = +pendingSticker.dataset.attemptsCount;

		pushstream.on('message', 'sticker_gen', (message) => {
			if (message.act == pushstream.TYPES.AI_STICKER_GEN) {
				if (message.genId != genId)
					return;
				console.log("[sticker_gen]", message);
				if (message.fileId) {
					onGeneratedSticker(message);
				} else if (message.status != null) {
					setStatus(L("Ошибка создания стикера:"));
					onGenerationDone(false);
					if (message.error)
						$(pendingSticker).find('.js-sticker_gen_error').html(message.error);
				}
			}
		});
	}
}

function onGeneratedSticker(message) {
	const stickerItem = document.querySelector(`#sticker_task_${message.taskId}`);
	const src = updateUrlScheme(message.previewURL);
	const srcset = message.previewURL_2x ? `${src}, ${updateUrlScheme(message.previewURL_2x)} 1.5x` : ``;
	stickerItem.innerHTML = tpl.image(src, srcset);
	delete stickerItem.dataset.isProcessing;
	updateStatus();
}

function updateStatus() {
	let completedAttempts = 0;
	for (const item of pendingSticker.querySelectorAll('.js-sticker_gen_item')) {
		if (!item.dataset.isProcessing)
			completedAttempts++;
	}
	let statusText;
	if (completedAttempts >= totalAttemptsCount) {
		statusText = plural(totalAttemptsCount, {
			'=1': 'Готово! Мы создали стикер по вашему запросу:',
			other: 'Готово! Мы создали стикеры по вашему запросу:'
		});
		onGenerationDone(true);
	} else {
		statusText = L('{total, plural, =1 {Создаём стикер по вашему запросу...} ' +
			'other {Создаём стикеры по вашему запросу, выполнено: {completed} из #}}', {
			completed: completedAttempts,
			total: totalAttemptsCount
		});
	}
	setStatus(statusText);
}

function onGenerationDone(status) {
	$('[data-action="retry"]').removeAttr("onclick").removeClass("stnd-link_disabled");

	if (status) {
		$(pendingSticker).find(".js-sticker_gen_select_link").removeClass("hide");
	} else {
		$(pendingSticker).find(".js-sticker_gen_tasks").addClass("hide");
		$(pendingSticker).find(".js-sticker_gen_error").removeClass("hide");
	}
}

function setStatus(title) {
	const statusBlock = document.querySelector('.js-sticker_gen_status');
	statusBlock.textContent = `#${attemptNum}. ${title}`;
}

function destroy() {
	pendingSticker = undefined;
	pushstream.off('*', 'sticker_gen');
}

module.on("componentpage", init);
module.on("componentpagedone", destroy);
