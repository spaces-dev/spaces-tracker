import module from 'module';
import $ from '../jquery';
import Spaces from '../spacesLib';
import Datepicker from 'vanillajs-datepicker/Datepicker';
import DatepickerES from 'vanillajs-datepicker/locales/es';
import DatepickerRU from 'vanillajs-datepicker/locales/ru';
import { L } from '../utils';
import dayjs from 'dayjs';
import { closeAllPoppers } from '../widgets/popper';

const MONTHS_LABELS = [
	L('января'), L('февраля'), L('марта'),
	L('апреля'), L('мая'), L('июня'),
	L('июля'), L('августа'), L('сентября'),
	L('октября'), L('ноября'), L('декабря')
];

const tpl = {
	prevArrowIcon: () => `
		<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
			<path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/>
		</svg>
	`,
	nextArrowIcon: () => `
		<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
			<path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/>
		</svg>
	`,
	datepicker({ optional }) {
		return `
			<div class="js-date_picker_element"></div>
			<div class="datepicker-buttons">
				${optional ? `
					<button class="btn-main js-date_picker_clear">
						${L("Сбросить")}
					</button>
				` : ``}
				<button class="btn-main js-date_picker_cancel">
					${L("Отменить")}
				</button>
			</div>
		`;
	},
};

Object.assign(Datepicker.locales, DatepickerES, DatepickerRU);

module.on('componentpage', () => {
	let onCleanup;

	$('#main').on('popper:beforeOpen', '.js-date_picker', function () {
		const widget = this.closest('.js-date_selector');
		const yearInput = widget.querySelector('.js-date_year');
		const monthInput = widget.querySelector('.js-date_month');
		const dayInput = widget.querySelector('.js-date_day');
		const dateLabel = widget.querySelector('.js-date_label');
		const minDate = this.dataset.min ? dayjs(this.dataset.min).startOf('day').toDate() : undefined;
		const maxDate = this.dataset.max ? dayjs(this.dataset.max).endOf('day').toDate() : undefined;

		const getSelectedDate = () => {
			if (!+yearInput.value && !+monthInput.value && !+dayInput.value)
				return undefined;
			return dayjs()
				.year(+yearInput.value)
				.month(+monthInput.value - 1)
				.date(+dayInput.value)
				.startOf('day');
		};

		const setSelectedDate = (date) => {
			yearInput.value = date ? date.year() : '';
			monthInput.value = date ? date.month() + 1 : '';
			dayInput.value = date ? date.date() : '';
			dateLabel.textContent = date ? `${date.date()} ${MONTHS_LABELS[date.month()]} ${date.year()}` : L("Укажите дату");
			Spaces.view.setInputError($(yearInput), false);
		};

		widget.querySelector('.select_custom').classList.remove('select_custom_noactive');

		this.innerHTML = tpl.datepicker({
			optional: widget.dataset.optional === "true"
		});
		const datepickerElement = this.querySelector('.js-date_picker_element');

		const clearButton = this.querySelector('.js-date_picker_clear');
		if (clearButton) {
			clearButton.addEventListener('click', (e) => {
				e.preventDefault();
				setSelectedDate(undefined);
				closeAllPoppers();
			});
		}

		const cancelButton = this.querySelector('.js-date_picker_cancel');
		if (cancelButton) {
			cancelButton.addEventListener('click', (e) => {
				e.preventDefault();
				closeAllPoppers();
			});
		}

		let datepicker = new Datepicker(datepickerElement, {
			container: document.body,
			todayHighlight: true,
			weekStart: 1,
			language: Spaces.params.lang,
			format: 'yyyy-mm-dd',
			prevArrow: tpl.prevArrowIcon(),
			nextArrow: tpl.nextArrowIcon(),
			minDate,
			maxDate,
		});

		const selectedDate = getSelectedDate();
		if (selectedDate)
			datepicker.setDate(selectedDate.toDate());

		datepickerElement.addEventListener('changeDate', () => {
			setSelectedDate(dayjs(datepicker.getDate()));
			closeAllPoppers();
		});

		// Приходится проксировать события, иначе не работает клавиатура
		const handleGlobalKeydown = (e) => {
			const newEvent = new Event('keydown', { cancelable: true });
			newEvent.key = e.key;
			datepicker.pickerElement.parentNode.dispatchEvent(newEvent);
			if (newEvent.defaultPrevented) {
				if (e.key.indexOf('Arrow') === 0)
					datepicker.pickerElement.classList.add('datepicker-keyboard-focus');
				e.preventDefault();
			}
		};

		document.body.addEventListener('keydown', handleGlobalKeydown, false);

		onCleanup = () => {
			const date = getSelectedDate();
			widget.querySelector('.select_custom').classList.toggle('select_custom_noactive', !date);

			datepicker.destroy();
			datepicker = undefined;
			datepickerElement.remove();
			document.body.removeEventListener('keydown', handleGlobalKeydown, false);
		};
	}).on('popper:afterClose', '.js-date_picker', function () {
		onCleanup && onCleanup();
		onCleanup = undefined;
	});
});
