import module from 'module';
import {Spaces, Url} from '../spacesLib';
import $ from '../jquery';
import {debounce, L, numeral, tick} from '../utils';
import '../select_item';
import { createDataSelector, scrollIntoViewIfNotVisible } from '../utils/dom';

const tpl = {
	editLinkLabel({ selectedCatsCount, offersCount }) {
		return `
			${selectedCatsCount > 0 ? L('Изменить') : L('Добавить')}
			${offersCount > 0 ? `(<span class="red b">${offersCount}</span>)` : ``}
		`;
	}
};

function initModule(parent) {
	parent.itemsSelector({
		selector:		'.categories-selector-grid__item:not(.hide):not([data-stub])',
		activeSelector:	'.categories-selector-grid__item--is-active',
		clickSelector:	'.js-checkbox',
		activeClass:	'categories-selector-grid__item--is-active',
		external:		true,
		keydownArea:	parent.find('.js-search__input'),
		autoScroll:		true,
		hoverSelect:	false
	});

	let uploadFile = parent.parents('.js-upload_file');
	if (uploadFile.length > 0) {
		uploadFile.on('fileUploaded', (e, data) => {
			parent.data('fileId', data.nid);
			parent.data('fileType', data.type);
		});
	}

	const searchCategoriesByWord = debounce(updateCategoriesList, 150);

	parent.on('click', '.js-xxx_cats_spoiler, .js-xxx_cats_spoiler_top', function (e) {
		e.preventDefault();

		const topExpandButton = parent.find('.js-xxx_cats_spoiler_top');
		const bottomExpandButton = parent.find('.js-xxx_cats_spoiler');
		bottomExpandButton.data('expanded', !bottomExpandButton.data('expanded'));
		const isExpanded = bottomExpandButton.data('expanded');

		bottomExpandButton
			.find('.js-text')
			.text(isExpanded ? L('Скрыть категории') : L('Показать все категории'));

		bottomExpandButton
			.find('.js-ico')
			.toggleClass('ico_arr_down', !isExpanded)
			.toggleClass('ico_arr_up', isExpanded);

		topExpandButton.toggleClass('hide', !isExpanded);

		updateCategoriesList();

		if (!isExpanded)
			scrollIntoViewIfNotVisible(parent[0], { start: "nearest", end: "nearest" });
	});

	parent.on('click', '.js-search__submit', function (e) {
		e.preventDefault();
	});

	parent.on('input clearSearchForm', '.js-search__input', () => searchCategoriesByWord());

	parent.on('change', '.js-checkbox', function (e) {
		const checkbox = $(this);
		const isChecked = !checkbox.hasClass('form-checkbox_checked');
		const minCategoriesCount = parent.data('minCats');
		const maxCategoriesCount = parent.data('maxCats');
		const searchInput = parent.find('.js-search__input');

		Spaces.view.setInputError(searchInput, false);

		const [oldOrientation, oldOrientationCategory] = getCurrentOrient();
		const newOrientation = checkbox.find('input[type="checkbox"]').data('orient')

		const selectedCount = parent.find('.js-xxx_cat_item[data-checked]').length + (isChecked ? 1 : -1);
		if (isChecked && oldOrientation > 0 && newOrientation > 0 && newOrientation != oldOrientation) {
			Spaces.view.setInputError(checkbox, L('Нельзя выбрать вместе с {0}', `&laquo;${oldOrientationCategory}&raquo;`));
			e.preventDefault();
			return;
		}

		if (isChecked && selectedCount > maxCategoriesCount) {
			Spaces.view.setInputError(checkbox, L('Нельзя выбрать более {0}',
				numeral(maxCategoriesCount, [L('$n категории'), L('$n категорий'), L('$n категорий')])));
			e.preventDefault();
			return;
		}

		if (isChecked && parent.data('fileId') && selectedCount < minCategoriesCount) {
			Spaces.view.setInputError(checkbox, L('Нельзя выбрать менее {0}',
				numeral(minCategoriesCount, [L('$n категории'), L('$n категорий'), L('$n категорий')])));
			e.preventDefault();
			return;
		}

		// Синхронизируем статус
		const categoryItem = this.closest('.js-xxx_cat_item');
		if (isChecked) {
			categoryItem.dataset.checked = "1";
		} else {
			delete categoryItem.dataset.checked;
		}

		// Сбрасываем все прошлые ошибки
		parent.find('.error__item .js-checkbox').each(function () {
			Spaces.view.setInputError($(this), false);
		});

		// Сбрасываем поиск после выбора категории
		if (searchInput.val().length > 0) {
			searchInput.val('');
			updateCategoriesList();
		}
	});

	parent.on('changed', '.js-checkbox', function () {
		const checkbox = $(this);
		const input = checkbox.find('input')[0];

		// Костыли
		if (input.checked) {
			const offeredCategories = parent.find('.js-cats_offers');
			const acceptOfferedCategory = offeredCategories.find(createDataSelector({ category: input.value }));
			acceptOfferedCategory.parents('.s-property').remove();
			updateEditLink();
			updateCategoriesList();
		}

		saveCategories();
		updateSexOrientsAvailability();
	});

	parent.action('add_file_cat', async function (e) {
		e.preventDefault();
		const link = $(this);
		const categoryCheckbox = parent.find(`.js-checkbox:has(input[name="caT"][value="${link.data('category')}"])`);
		if (!categoryCheckbox.hasClass('form-checkbox_checked'))
			categoryCheckbox.click();
	});

	parent.action('moder_tag_offer', async function (e) {
		e.preventDefault();
		const link = $(this);
		const toggleLoading = (flag) => link.find('.js-ico').toggleClass('ico_spinner', flag);

		toggleLoading(true);
		const response = await Spaces.asyncApi('xxx.moderation.tagOffer', {
			CK: null,
			File_id: link.data('fileId'),
			Ftype: link.data('fileType'),
			Category: link.data('category'),
			Accept: link.data('accept'),
		});
		toggleLoading(false);

		if (link.data('accept')) {
			const categoryCheckbox = parent.find(`.js-checkbox:has(input[name="caT"][value="${link.data('category')}"])`);
			if (!categoryCheckbox.hasClass('form-checkbox_checked'))
				categoryCheckbox.click();
		}

		if (response.code == 0) {
			link.parents('.s-property').remove();
			updateEditLink();

			const expandButton = parent.find('.js-xxx_cats_spoiler');
			if (expandButton.data('expanded')) {
				expandButton.click();
			} else {
				updateCategoriesList();
			}
		}
	});

	function updateEditLink() {
		const fileId = parent.data('fileId');
		const fileType = parent.data('fileType');
		const offeredCategories = parent.find('.js-cats_offers');
		const selectedCatsCount = parent.find('.js-checkbox.form-checkbox_checked').length;
		const offersCount = offeredCategories.find('.s-property').length;
		$(`#xxx_cats_edit_link_${fileType}_${fileId}`).html(tpl.editLinkLabel({
			offersCount,
			selectedCatsCount
		}));
		offeredCategories.toggleClass('hide', offersCount == 0);
	}

	function saveCategories() {
		const fileId = parent.data('fileId');
		const fileType = parent.data('fileType');

		if (!fileId)
			return;

		const apiData = $.extend({
			File_id: fileId,
			FiLe_id: parent.data('filesIds'),
			Ftype: fileType,
			CK: null
		}, Url.serializeForm(parent));

		const toggleLoading = (flag) => {
			parent.find('.js-spinner').toggleClass('hide', !flag).trigger('xxx_cats:saving', { saved: !flag });
		};

		toggleLoading(true);
		Spaces.api(parent.data('method'), apiData, function (res) {
			toggleLoading(false);

			if (!res.cats)
				res.cats = [];

			$(`#xxx_cats_${fileType}_${fileId}`).html(res.cats.join(', '));
			updateEditLink();

			if (res.code != 0)
				Spaces.showApiError(res);
		}, {
			onError: (err) => {
				toggleLoading(false);
				Spaces.showError(err);
			}
		});
	}

	function getCurrentOrient() {
		let selected_cats = parent.find('.js-checkbox.form-checkbox_checked');
		for (let i = 0, l = selected_cats.length; i < l; ++i) {
			let chb_wrap = $(selected_cats[i]);
			let chb = chb_wrap.find('input[type="checkbox"]');
			let orient = chb.data('orient');
			if (orient > 0)
				return [orient, chb.data('title')];
		}
		return [false, false];
	}

	function updateSexOrientsAvailability() {
		let [current_orient] = getCurrentOrient();
		let all_checkboxes = parent.find('.js-checkbox_wrap');
		for (let i = 0; i < all_checkboxes.length; i++) {
			let chb_wrap = $(all_checkboxes[i]);
			let chb = chb_wrap.find('input[type="checkbox"]');
			if (+chb.data('popular')) {
				if (current_orient > 0 && chb.data('orient') > 0 && current_orient != chb.data('orient')) {
					chb_wrap.find('.t').removeClass('purple');
				} else {
					chb_wrap.find('.t').addClass('purple');
				}
			}
		}
	}

	function updateCategoriesList() {
		const query = parent.find('.js-search__input').val();
		const searchQueryRegExp = getSearchQueryRegExp(query);
		const isSearch = searchQueryRegExp != null;

		let found = 0;
		const container = parent.find('.js-xxx_cats_all')[0];
		if (isSearch) {
			for (const item of container.children) {
				if (item.dataset.stub)
					continue;
				const isVisible = searchQueryRegExp.test(item.textContent);
				item.classList.toggle('hide', !isVisible);
				if (isVisible)
					found++;
			}
		} else {
			const showAll = !!parent.find('.js-xxx_cats_spoiler').data('expanded');
			for (const item of container.children) {
				if (item.dataset.stub)
					continue;
				const isVisible = showAll || item.dataset.checked;
				item.classList.toggle('hide', !isVisible);
				if (isVisible)
					found++;
			}
		}

		const stub = container.querySelector('.js-xxx_cat_item[data-stub]');
		stub.classList.toggle('hide', (found % 2) === 0);

		container.classList.toggle('hide', found == 0);
		parent.find('.js-xxx_cats_spoiler').toggleClass('hide', isSearch);
		parent.find('.js-xxx_cats_not_found').toggleClass('hide', !isSearch || found > 0);
	}
}

module.on('component', () => {
	$('.js-file_cats').each(function () {
		let el = $(this);
		if (!el.data('initted')) {
			el.data('initted', true);
			initModule(el);
		}
	});
});

function getSearchQueryRegExp(query) {
	const normalizedQuery = query.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').toLowerCase();
	if (!normalizedQuery.length)
		return undefined;
	return new RegExp("([\\s,._()-]|^)" + normalizedQuery.replace(/[^\wа-яёЁ]+/gi, '|').replace(/^\||\|$/, ''), 'i');
}
