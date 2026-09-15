import module from 'module';
import * as pushstream from '../../core/lp';
import { plural } from '../../core/l10n';

export const CASH_RENDER_MODE = {
	DEFAULT: 0,
	INLINE: 1,
};

const tpl = {
	money(amount) {
		const text = plural(amount, {
			one: '# монета',
			few: '# монеты',
			other: '# монет'
		});
		return `<span class="${amount > 0 ? 'green' : 'red'}">${text}</span>`;
	},
	bonus(amount) {
		const text = plural(amount, {
			one: '# бонусная',
			other: '# бонусных'
		});
		return `<span class="darkblue">${text}</span>`;
	}
};

function init() {
	pushstream.on('message', 'cash_widget', (message) => {
		if (message.act == pushstream.TYPES.USER_BALANCE_CHANGE) {
			if (message.money != null)
				$('#cash_widget_money').html(tpl.money(message.money));
			if (message.bonus != null)
				$('#cash_widget_bonus').html(tpl.bonus(message.bonus)).toggleClass('hide', !message.bonus);
		}
	});
}

function destroy() {
	pushstream.off('message', 'cash_widget');
}

module.on("componentpage", init);
module.on("componentpagedone", destroy);
