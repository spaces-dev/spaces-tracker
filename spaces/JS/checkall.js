import module from 'module';
import $ from './jquery';
import { L } from './utils';

module.on("componentpage", () => {
	let checkAllList = document.querySelectorAll('.js-checkall');
	for (let el of checkAllList) {
		let parent = document.getElementById(el.getAttribute('data-parent')) || document.body;
		let inputs = parent.querySelectorAll(el.dataset.js ? '.js-checkbox input[type="checkbox"]' : 'input[type="checkbox"]');
		let checkedCnt = 0;
		let uncheckedCnt = 0;
		for (let input of inputs) {
			if (input.checked) {
				checkedCnt++;
			} else {
				uncheckedCnt++;
			}
		}
		el.dataset.trigger = checkedCnt == 0 || uncheckedCnt != 0;
		el.innerHTML = el.dataset.trigger == "false" ? L('Снять все') : L('Отметить все');
	}

	$('#main').on('click', '.js-checkall', function (e) {
		let el = this;
		let parent = document.getElementById(el.getAttribute('data-parent')) || document.body;

		let trigger = el.dataset.trigger != "false";
		if (el.dataset.js) {
			for (let chb of parent.querySelectorAll(`.js-checkbox`)) {
				if (chb.classList.contains('form-checkbox_checked') != trigger)
					chb.click();
			}
		} else {
			let inputs = parent.querySelectorAll('input[type="checkbox"]');
			for (let input of inputs)
				input.checked = trigger;
		}

		el.innerHTML = trigger ? L('Снять все') : L('Отметить все');
		el.dataset.trigger = !trigger;

		return false;
	});
});
