import "Common/Toaster.css";
import { waitTransitionEnd } from "../utils/dom";

const queue = [];
let closeTimerId;

const tpl = {
	toast({ title, text, severity }) {
		return `
			<div class="toast toast--severity-${severity}" id="toast">
				<div class="toast__body">
					${title ? `<div class="toast__title">${title}</div>` : ``}
					${text ? `<div class="toast__text">${text}</div>` : ``}
				</div>
				<div class="js-toast_close toast__close">
					<span class="ico ico_remove ico-alone"></span>
				</div>
			</div>
		`;
	}
};

export function showToast(toast) {
	const id = Date.now();
	const severity = toast.severity ?? "info";
	queue.push({
		id,
		title: undefined,
		text: "",
		severity,
 		timeout: severity == "info" ? 5000 : 10000,
		...toast
	});
	setTimeout(() => processToasts(), 0);
	return id;
}

function processToasts() {
	if (!queue.length)
		return;
	if (document.getElementById('toast'))
		return;
	renderToast(queue.shift());
}

function renderToast(toast) {
	document.body.insertAdjacentHTML('beforeend', tpl.toast({
		title: toast.title,
		text: toast.text,
		severity: toast.severity,
	}));

	const toastElement = document.getElementById('toast');
	setTimeout(() => toastElement.classList.add('toast--visible'), 10);

	toastElement.querySelector('.js-toast_close').addEventListener('click', (e) => {
		e.preventDefault();
		closeToast();
	});

	toastElement.addEventListener('click', (e) => {
		if (!e.defaultPrevented)
			closeToast();
	});

	if (toast.timeout > 0) {
		closeTimerId = setTimeout(() => {
			closeTimerId = undefined;
			closeToast();
		}, toast.timeout);
	}
}

async function closeToast() {
	const toastElement = document.getElementById('toast');
	toastElement.classList.remove('toast--visible');
	await waitTransitionEnd(toastElement);
	toastElement.remove();
	if (closeTimerId) {
		clearTimeout(closeTimerId);
		closeTimerId = undefined;
	}
	processToasts();
}
