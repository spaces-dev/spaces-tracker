import module from "module";
import { Popper } from "./popper";
import { L } from "../core/l10n";

let stickerPopper;

function getStickerPopper() {
	if (stickerPopper)
		return stickerPopper;

	const popperElement = document.createElement("div");
	popperElement.className = "popper-popover t_center";
	document.body.appendChild(popperElement);
	stickerPopper = new Popper(popperElement);
	return stickerPopper;
}

function destroyStickerPopper() {
	if (!stickerPopper)
		return;

	const popperElement = stickerPopper.element();
	stickerPopper.destroy();
	popperElement.remove();
	stickerPopper = undefined;
}

function initStickerPopover(el) {
	el.addEventListener("click", (e) => {
		e.preventDefault();
		e.stopPropagation();

		const popper = getStickerPopper();
		if (popper.opener() === el) {
			popper.close();
			return;
		}

		popper.element().innerHTML = `
			<div class="text-list">
				<div class="text-list__item">
					<span class="ico_xlarge ico_xlarge_magic"></span>
				</div>
				<div class="text-list__item">
					${L('Этот стикер создал {name}!', { name: el.dataset.userName })}
				</div>
				<div class="text-list__item">
					${L("Хочешь такой же?")}
				</div>
				<div class="text-list__item">
					<a href="${el.dataset.genUrl}" class="link-blue">
						${L("Сгенерируй свой прямо сейчас!")}
					</a>
				</div>
			</div>
		`;

		popper.open({}, el);
	});
}

module.on("component", () => {
	const elements = document.querySelectorAll(".js-sticker_info");
	for (const el of elements) {
		el.classList.remove("js-sticker_info");
		initStickerPopover(el);
	}
});

module.on("componentpagedone", () => {
	destroyStickerPopper();
});
