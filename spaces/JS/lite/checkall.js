import {L, ge} from './utils';

let global_trigger = true;

function checkAll(e) {
	let el = this,
		parent = ge('#' + el.getAttribute('data-parent')) || document.body;
	let inputs = parent.getElementsByTagName('input');
	for (let i = 0; i < inputs.length; ++i) {
		if (inputs[i].type == 'checkbox')
			inputs[i].checked = global_trigger;
	}

	el.innerHTML = global_trigger ? L('Снять все') : L('Отметить все');

	global_trigger = !global_trigger;
	return false;
}

let check_all = ge('.js-checkall');
for (let i = 0; i < check_all.length; ++i)
	check_all[i].onclick = checkAll;
