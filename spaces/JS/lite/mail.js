import {ce, L} from './utils';
import {Events} from './events'
import {node_data} from './core';

update_links();

function update_links() {
	Events.glob('click', {
		'.js-action_link': selection
	});
}

function selection(e) {
	let el = this;
	let data = node_data(el);
	
	if (data.action == 'select_all') {
		let flag = !el.getAttribute('data-selecetd');
		
		let inputs = document.getElementsByTagName('input');
		for (let i = 0; i < inputs.length; i++) {
			if (inputs[i].type == 'checkbox' && inputs[i].name == 'CoNtact')
				inputs[i].checked = flag;
		}
		
		if (flag) {
			el.innerHTML = L('Снять все');
			el.setAttribute('data-selecetd', '1');
		} else {
			el.innerHTML = L('Выбрать все');
			el.removeAttribute('data-selecetd');
		}
		
		return false;
	}
}


