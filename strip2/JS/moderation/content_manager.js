import require from 'require';
import module from 'module';
import {Spaces, Url} from '../spacesLib';
import {L} from '../utils';

let tpl = {
	ok() {
		return `<span class="ico ico_ok_green"></span>`;
	}
};

module.on('component', () => {
	$('#main').on('ajax-form-saved', (e, result) => {
		let wrap = $(e.target).parents('.js-moder-content-item');
		if (!wrap.data('busy'))
			syncItemState(wrap, true);
	});
	
	$('#main').action('content_manager_item', function (e) {
		e.preventDefault();
		
		let wrap = $(this).parents('.js-moder-content-item');
		if (wrap.data('busy'))
			return;
		
		let expanded = wrap.data('expanded');
		if (expanded) {
			let initialState = wrap.data('initialState');
			let currentState = getFormState(wrap);
			if (JSON.stringify(initialState) != JSON.stringify(currentState)) {
				toggleLoading(wrap, true);
				wrap.find('[name="cfms"]').click();
				wrap.one('ajax-form-saved ajax-form-error', (e, result) => {
					toggleLoading(wrap, false);
					if (e.type == 'ajax-form-saved') {
						syncItemState(wrap, expanded, () => toggleExpand(wrap, !expanded));
					}
				});
			} else {
				syncItemState(wrap, expanded, () => toggleExpand(wrap, !expanded));
			}
		} else {
			syncItemState(wrap, expanded, () => toggleExpand(wrap, !expanded));
		}
	});
});

function toggleLoading(wrap, flag) {
	let button = wrap.find('[data-action="content_manager_item"]');
	button.find('.js-ico').toggleClass('ico_spinner', flag);
	wrap.data('busy', flag);
}

function toggleExpand(wrap, flag) {
	let button = wrap.find('[data-action="content_manager_item"]');
	
	button.find('.bordered').toggleClass('red', flag).toggleClass('blue', !flag);
	button.find('.js-ico')
		.removeClass('ico_arr_down_red')
		.toggleClass('ico_arr_up_red', flag)
		.toggleClass('ico_arr_down_blue', !flag);
	button.find('.js-text').html(flag ? L('Обновить') : L('Подробнее'));
	
	wrap.data('expanded', flag);
	
	wrap.find('.js-moder-additional').toggleClass('hide', !flag);
	
	if (!flag) {
		wrap.find('.js-moder-player').empty();
		wrap.find('.js-moder-screenshot_selector').empty();
		wrap.find('.js-moder-form').empty();
		wrap.find('.js-moder-categories').empty();
		
		require.loaded(import.meta.id("../widgets/video"), ({VideoPlayer}) => VideoPlayer.destroyDetached());
	}
}

function syncItemState(wrap, done, callback) {
	let api_data = {Id: wrap.data('id'), Type: wrap.data('type')};
	if (done) {
		api_data.Reason = 1;
	} else {
		api_data.Info = 1;
	}
	
	toggleLoading(wrap, true);
	
	Spaces.api('xxx.content_manager_item', api_data, (res) => {
		toggleLoading(wrap, false);
		
		if (res.label)
			wrap.find('.js-moder-expand').html(res.label);
		
		if (res.code != 0) {
			console.error(`[content_manager_item] ${Spaces.apiError(res)}`);
			return;
		}
		
		if (done) {
			wrap.find('.js-moder-reason').html(res.reason_text || tpl.ok());
		} else {
			wrap.find('.js-moder-player').html(res.player || '');
			wrap.find('.js-moder-screenshot_selector').html(res.screenshot_selector || '');
			wrap.find('.js-moder-form').html(res.text_work_form || '');
			wrap.find('.js-moder-categories').html(res.cats_edit_form || '');
			wrap.data('initialState', getFormState(wrap));
		}
		
		callback && callback();
	}, {
		onError(err) {
			toggleLoading(wrap, false);
			console.error(`[content_manager_item] ${err}`);
		}
	});
}

function getFormState(wrap) {
	return Url.serializeForm(wrap.find('.js-ajax_form'));
}
