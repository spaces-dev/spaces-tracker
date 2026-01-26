import require from 'require';
import module from 'module';
import {Spaces, Url} from '../spacesLib';
import {L} from '../utils';
import $ from "../jquery";

let tpl = {
	ok() {
		return `<span class="ico ico_ok_green"></span>`;
	}
};

module.on('component', () => {
	$('#main').on("click", ".js-change-screenshot-btn", function (e) {
		e.preventDefault();
		const wrap = $(this).parents('.js-moder-item');
		$(this).parent().remove();
		wrap.find('.js-moder-screenshot_selector').removeClass("hide");
	})

	$('#main').action('moderation_list_item', function (e) {
		e.preventDefault();

		let wrap = $(this).parents('.js-moder-item');

		if (wrap.data('busy'))
			return;

		let expanded = wrap[0].dataset.expanded === "true";
		if (!expanded) {
			let previousExpandedItem = $('.js-moder-item[data-expanded="true"]');
			if (previousExpandedItem.length > 0) {
				if (previousExpandedItem.offset().top <= wrap.offset().top) {
					let prevHeight = previousExpandedItem.outerHeight();
					toggleExpand(previousExpandedItem, false);
					let deltaHeight = prevHeight - previousExpandedItem.outerHeight();
					$('html, body').scrollTop($(window).scrollTop() - deltaHeight);
				}
				syncItemState(previousExpandedItem, true, () => toggleExpand(previousExpandedItem, false));
			}
		}

		syncItemState(wrap, expanded, () => toggleExpand(wrap, !expanded));
	});

	$('#main').on('ajax-form-validate', 'form', function () {
		let statuses = $(this).find('.js-radio-Status input');
		let selected_status = 0;
		for (let i = 0; i < statuses.length; i++) {
			if (statuses[i].checked)
				selected_status++;
		}
		if (statuses.length > 0 && !selected_status)
			return false;
	});

	$('#main').on('ajax-form-saved', '.js-moder-item', function () {
		let wrap = $(this);
		toggleExpand(wrap, false);
		$('html, body').scrollTo(wrap, {position: 'visible'});
		syncItemState(wrap, true);
	});
});

function toggleLoading(wrap, flag) {
	let button = wrap.find('[data-action="moderation_list_item"]');
	button.find('.js-ico').toggleClass('ico_spinner', flag);
	wrap.data('busy', flag);
}

function toggleExpand(wrap, flag) {
	let button = wrap.find('[data-action="moderation_list_item"]');

	button.find('.bordered').toggleClass('red', flag).toggleClass('blue', !flag);
	button.find('.js-ico')
		.removeClass('ico_arr_down_red')
		.toggleClass('ico_arr_up_red', flag)
		.toggleClass('ico_arr_down_blue', !flag);
	button.find('.js-text').html(flag ? L('Обновить') : L('Подробнее'));

	wrap[0].dataset.expanded = flag;

	wrap.find('.js-moder-additional').toggleClass('hide', !flag);

	if (!flag) {
		wrap.find('.js-moder-player').empty();
		wrap.find('.js-moder-preview').empty();
		wrap.find('.js-moder-screenshot_selector').empty();
		wrap.find('.js-moder-categories').empty();
		wrap.find('.js-moder-form').empty();

		require.loaded(import.meta.id("../widgets/video"), ({VideoPlayer}) => VideoPlayer.destroyDetached());
	}
}

function syncItemState(wrap, done, callback) {
	let api_data = {Id: wrap.data('id'), Type: wrap.data('type')};
	if (!done)
		api_data.Info = 1;

	wrap[0].dataset.done = done;

	toggleLoading(wrap, true);

	Spaces.api('xxx.moderation_list_item', api_data, (res) => {
		toggleLoading(wrap, false);

		if (res.label)
			wrap.find('.js-moder-expand').html(res.label);

		if (res.code != 0) {
			console.error(`[moderation_list_item] ${Spaces.apiError(res)}`);
			return;
		}

		if (done) {
			wrap.find('.js-moder-status').html(res.status_text || '???');
		} else {
			wrap.find('.js-moder-status').html(res.status_text || '???');
			wrap.find('.js-moder-player').html(res.player || '');
			wrap.find('.js-moder-preview').html(res.preview || '');
			wrap.find('.js-moder-screenshot_selector').html(res.screenshot_selector || '');
			wrap.find('.js-moder-categories').html(res.cats_edit_form || '');
			wrap.find('.js-moder-form').html(res.decision_form || '');
		}

		callback && callback();
	}, {
		onError(err) {
			toggleLoading(wrap, false);
			console.error(`[moderation_list_item] ${err}`);
		}
	});
}
