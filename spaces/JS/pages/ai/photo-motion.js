import module from 'module';
import $ from '../../jquery';
import * as pushstream from '../../core/lp';
import Spaces, { Url } from '../../spacesLib';
import { debounce, L } from '../../utils';

let pushstreamListeners = {};

function init() {
	pushstream.on('message', 'ai_photo_motion', (message) => {
		if (message.act == pushstream.TYPES.AI_PHOTO_MOTION) {
			console.log("[ai_photo_motion]", message);
			const handler = pushstreamListeners[message.id];
			handler && handler(message);
		}
	});

	for (const pendingTask of document.querySelectorAll('.js-photo_style_task[data-status="new"]'))
		initPendingTask(pendingTask);
	initForm();
}

function initPendingTask(pendingTask) {
	const genId = +pendingTask.dataset.genId;

	const setStatus = (status, statusText) => {
		for (const block of pendingTask.querySelectorAll('.js-photo_style_status')) {
			block.classList.toggle("hide", block.dataset.status !== status);
			if (statusText && block.dataset.status == status)
				block.querySelector(`.js-photo_style_status_text`).innerHTML = statusText;
		}
		pendingTask.dataset.status = status;
	};

	const onGeneratedVideo = (res) => {
		$(pendingTask).find(".js-photo_style_picture").html(res.file);
		const pictureURL = pendingTask.querySelector('.js-photo_style_pic_url');
		if (pictureURL)
			pictureURL.href = res.fileURL;
		setStatus("done");
	};

	const unlockNewRequest = () => {
		$('[data-action="retry"]').removeAttr("onclick").removeClass("stnd-link_disabled");
	};

	pushstreamListeners[genId] = (message) => {
		if (message.status == 'DONE') {
			Spaces.api("services.ai.photoMotion.result", { Id: genId }, (res) => {
				if (res.code == 0) {
					onGeneratedVideo(res);
					unlockNewRequest();
				}
			}, { retry: 3 });
		} else if (message.status == 'ERROR') {
			console.log("[ai_photo_motion] error=" + message.error);
			$(pendingTask).find('.js-photo_style_picture .skeleton-shimmer').removeClass('skeleton-shimmer');
			setStatus("error");
			unlockNewRequest();
		} else if (message.status == 'CONVERTING') {
			setStatus("new", L("Видео конвертируется.."));
			unlockNewRequest();
		} else {
			setStatus("new", message.progress);
		}
	};
}

function initForm() {
	const form = $('#ai_request_form');
	if (!form.length)
		return;

	const updateCost = debounce(() => {
		Spaces.api("services.ai.photoMotion.getCost", {
			CK: null,
			...Url.serializeForm(form),
			requestId: "photoMotionGetCost"
		}, (response) => {
			if (response.code == 0) {
				const buttonLabel = form.find('button[name="cfms"] .js-btn_val');
				buttonLabel.text(response.caption);
			}
		});
	}, 250);

	form.on('change input', 'input, textarea, select', () => updateCost());
}

function destroy() {
	pushstreamListeners = {};
	pushstream.off('message', 'ai_photo_motion');
}

module.on("componentpage", init);
module.on("componentpagedone", destroy);
