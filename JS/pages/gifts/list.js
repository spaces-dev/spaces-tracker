import module from 'module';
import $ from '../../jquery';
import Spaces from '../../spacesLib';
import DdMenu from '../../dd_menu';
import {L, debounce} from '../../utils';

var tpl = {
	deleting(id) {
		return `
			<div class="block-item block-item_single top-round oh grey" id="gift_delete_${id}">
				<span class="ico ico_spinner"></span> ${L("Удаляем подарок...")}
			</div>
		`;
	},
	deleted(text) {
		return `<div class="block-item block-item_single top-round oh grey">${text}</div>`;
	}
};

module.on("componentpage", function () {
	let updatePreview = debounce(() => {
		let preview = $('#gift_preview');
		if (!preview.length)
			return;
		
		let text = encodeURIComponent($('textarea[name="message"]').val());
		let src_1x = preview.data('src_1x').replace(/%3A%3Atext%3A%3A/i, text).replace(/%3A%3Arand%3A%3A/i, Date.now());
		let src_2x = preview.data('src_2x').replace(/%3A%3Atext%3A%3A/i, text).replace(/%3A%3Arand%3A%3A/i, Date.now());
		
		preview.prop("srcset", `${src_1x}, ${src_2x} 1.5x`);
		preview.prop("src", src_1x);
	}, 300);
	
	updatePreview();
	
	$('#main').on('input change', 'textarea[name="message"]', function (e) {
		updatePreview();
	});
	
	$('#main').action('gift_delete', function (e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		
		var $this = $(this),
			gift_id = $this.parents('.js-dd_menu_item').data('gift_id'),
			cnt = $('.cnt_tabs').first(),
			gift = $('#gift' + gift_id),
			deleted = $('#gift_delete_' + gift_id);
		
		if (!deleted.length) {
			gift.before(tpl.deleting(gift_id));
			deleted = $('#gift_delete_' + gift_id)
		}
		
		var toggle_state = function (flag) {
			gift.toggleClass('hide', flag);
			deleted.toggleClass('hide', !flag);
			cnt.text(parseInt(cnt.text()) + (flag ? -1 : 1));
		};
		
		DdMenu.close();
		
		toggle_state(true);
		Spaces.api("gifts.delete", {Gift: gift_id, CK: null}, function (res) {
			if (res.code != 0) {
				Spaces.showApiError(res);
				toggle_state(false);
			} else {
				deleted.after(tpl.deleted(res.notification));
				gift.remove();
				deleted.remove();
			}
		}, {
			onError: function (err) {
				toggle_state(false);
				Spaces.showError(err);
			}
		});
	});
});
