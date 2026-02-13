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
	const postfix = parent.data('postfix') ?? "";

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

	const uploadFile = parent.parents('.js-upload_file');
	if (uploadFile.length > 0) {
		uploadFile.on('fileUploaded', (e, data) => {
			parent.data('fileId', data.nid);
			parent.data('fileType', data.type);
		});
		uploadFile.on('uploadError', (e) => {
			if (e.detail.name == 'CaT' || e.detail.name == 'Forient') {
				e.preventDefault();
				setError(e.detail.error);
			}
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

	parent.on('change', `input[name="Forient${postfix}"]`, function (e) {
		if (parent.data('isNew'))
			removeConflicts();

		setError(undefined);

		if (!checkForConflicts()) {
			e.preventDefault();
			const orientationName = this.parentNode.textContent.trim();
			setError(L(`Одна или несколько категорий не соответствуют категории "{0}"`, orientationName));
			return;
		}

		parent.removeClass("categories-selector--is-collapsed");

		setTimeout(() => {
			resetErrors();
			updateCategoriesList();
			saveCategories();
		}, 0);
	});

	parent.on('change', '.js-checkbox', function (e) {
		const checkbox = $(this);
		const isChecked = !checkbox.hasClass('form-checkbox_checked');
		const minCategoriesCount = parent.data('minCats');
		const maxCategoriesCount = parent.data('maxCats');
		const searchInput = parent.find('.js-search__input');

		setError(undefined);

		const error = validateCheckbox(this.querySelector('.form-checkbox__el'));
		if (isChecked && error) {
			Spaces.view.setInputError(checkbox, error);
			e.preventDefault();
			return;
		}

		const selectedCount = parent.find('.js-xxx_cat_item[data-checked]').length + (isChecked ? 1 : -1);
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
		resetErrors();
		checkForConflicts();

		// Сбрасываем поиск после выбора категории
		if (searchInput.val().length > 0) {
			searchInput.val('').trigger('change');
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
	});

	parent.action('add_file_cat', async function (e) {
		e.preventDefault();
		const link = $(this);
		const categoryCheckbox = parent.find(`.js-checkbox:has(input[name="CaT${postfix}"][value="${link.data('category')}"])`);
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
			const categoryCheckbox = parent.find(`.js-checkbox:has(input[name="CaT${postfix}"][value="${link.data('category')}"])`);
			if (!categoryCheckbox.hasClass('form-checkbox_checked'))
				categoryCheckbox.click();
		}

		if (response.code == 0) {
			link.parents('.s-property').remove();
			$(`#xxx_orient_${fileType}_${fileId}`).html(response.orient);
			$(`#xxx_cats_${fileType}_${fileId}`).html(response.cats?.join(', ') || '');
			updateEditLink();

			const expandButton = parent.find('.js-xxx_cats_spoiler');
			if (expandButton.data('expanded')) {
				expandButton.click();
			} else {
				updateCategoriesList();
			}
		} else {
			setError(Spaces.apiError(response));
		}
	});

	function setError(error) {
		const errorBlock = parent.find('.js-xxx_cats_error');
		errorBlock.html(error).toggleClass('hide', !error);

		if (error) {
			scrollIntoViewIfNotVisible(errorBlock[0], { start: "nearest", end: "nearest" });
		}
	}

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

	async function saveCategories() {
		const fileId = parent.data('fileId');
		const fileType = parent.data('fileType');

		if (!fileId)
			return;

		setError(undefined);

		const apiData = $.extend({
			pp: postfix,
			File_id: fileId,
			FiLe_id: parent.data('filesIds'),
			Ftype: fileType,
			CK: null,
		}, Url.serializeForm(parent));

		const toggleLoading = (flag) => {
			parent.find('.js-spinner').toggleClass('hide', !flag).trigger('xxx_cats:saving', { saved: !flag });
		};

		toggleLoading(true);
		const response = await Spaces.asyncApi(parent.data('method'), apiData);
		toggleLoading(false);

		if (response.code == 0) {
			$(`#xxx_orient_${fileType}_${fileId}`).html(response.orient);
			$(`#xxx_cats_${fileType}_${fileId}`).html(response.cats?.join(', ') || '');
			updateEditLink();
		} else {
			setError(Spaces.apiError(response));
		}
	}

	function validateCheckbox(checkbox) {
		const [selectedOrientation, selectedOrientationName] = getCurrentOrientation();
		let error = false;
		if (checkbox.dataset.orientsHide) {
			const disallowedOrientations = JSON.parse(checkbox.dataset.orientsHide);
			if (disallowedOrientations.includes(selectedOrientation))
				error = L(`Недоступна для ориентации "{0}"`, selectedOrientationName);
		}
		return error;
	}

	function resetErrors() {
		parent.find('.error__item .js-checkbox').each(function () {
			Spaces.view.setInputError($(this), false);
		});
	}

	function removeConflicts() {
		const checkboxes = parent[0].querySelectorAll('.js-xxx_cat_item .form-checkbox__el');
		for (const checkbox of checkboxes) {
			if (!checkbox.checked)
				continue;
			const error = validateCheckbox(checkbox);
			if (error)
				checkbox.closest('.js-checkbox').click();
		}
	}

	function checkForConflicts() {
		const checkboxes = parent[0].querySelectorAll('.js-xxx_cat_item .form-checkbox__el');
		let conflicts = 0;
		for (const checkbox of checkboxes) {
			if (!checkbox.checked)
				continue;
			const error = validateCheckbox(checkbox);
			Spaces.view.setInputError($(checkbox), error);
			if (error)
				conflicts++;
		}
		return conflicts == 0;
	}

	function updateCategoriesList() {
		const query = parent.find('.js-search__input').val();
		const searchQueryRegExp = getSearchQueryRegExp(query);
		const isSearch = searchQueryRegExp != null;
		const showAll = !!parent.find('.js-xxx_cats_spoiler').data('expanded');

		let found = 0;
		const [selectedOrientation] = getCurrentOrientation();
		const container = parent.find('.js-xxx_cats_all')[0];
		const items = container.querySelectorAll('.js-xxx_cat_item');
		const checkboxes = container.querySelectorAll('.js-xxx_cat_item .form-checkbox__el');

		if (isSearch) {
			for (let i = 0, l = items.length; i < l; i++) {
				const item = items[i];
				const checkbox = checkboxes[i];
				if (item.dataset.stub)
					continue;
				let isAllowed = true;
				if (checkbox.dataset.orientsHide) {
					const disallowedOrientations = JSON.parse(checkbox.dataset.orientsHide);
					isAllowed = !disallowedOrientations.includes(selectedOrientation);
				}
				const isVisible = searchQueryRegExp.test(item.textContent) && isAllowed;
				item.classList.toggle('hide', !isVisible);
				if (isVisible)
					found++;
			}
		} else {
			for (let i = 0, l = items.length; i < l; i++) {
				const item = items[i];
				const checkbox = checkboxes[i];
				if (item.dataset.stub)
					continue;
				let isAllowed = true;
				if (checkbox.dataset.orientsHide) {
					const disallowedOrientations = JSON.parse(checkbox.dataset.orientsHide);
					isAllowed = !disallowedOrientations.includes(selectedOrientation);
				}
				const isVisible = (showAll && isAllowed) || item.dataset.checked;
				item.classList.toggle('hide', !isVisible);
				if (isVisible)
					found++;
			}
		}

		const stub = container.querySelector('.js-xxx_cat_item[data-stub]');
		stub.classList.toggle('hide', (found % 2) === 0);

		container.classList.toggle('hide', found == 0);
		parent.find('.js-xxx_cats_spoiler_top').toggleClass('hide', isSearch || !showAll);
		parent.find('.js-xxx_cats_spoiler').toggleClass('hide', isSearch);
		parent.find('.js-xxx_cats_not_found').toggleClass('hide', !isSearch || found > 0);

		setTimeout(() => checkForConflicts());
	}

	function getCurrentOrientation() {
		const selectedOrientation = parent.find(`input[name="Forient${postfix}"]:checked`);
		return [+selectedOrientation.val(), selectedOrientation.parent().text().trim()];
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
