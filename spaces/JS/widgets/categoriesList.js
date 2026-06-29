import module from 'module';
import $ from '../jquery';
import { debounce } from '../utils';

module.on('componentpage', () => {
	const searchSidebarCategories = debounce(function () {
		updateSidebarCategoriesList(this);
	}, 150);

	const categoriesList = document.querySelector('.js-categories_list');
	const updateSidebarCategoriesList = (input) => {
		const searchQueryRegExp = getSearchQueryRegExp(input.value);
		const items = categoriesList.querySelectorAll('.js-categories_list_item');
		let found = 0;

		for (const item of items) {
			const isVisible = !searchQueryRegExp || searchQueryRegExp.test(item.textContent);
			item.classList.toggle('hide', !isVisible);
			if (isVisible)
				found++;
		}

		const notFoundBlock = categoriesList.querySelector('.js-categories_list_not_found');
		notFoundBlock.classList.toggle('hide', !searchQueryRegExp || found > 0);
	};

	const getSearchQueryRegExp = (query) => {
		const normalizedQuery = query.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').toLowerCase();
		if (!normalizedQuery.length)
			return undefined;
		return new RegExp("([\\s,._()-]|^)" + normalizedQuery.replace(/[^\wа-яёЁ]+/gi, '|').replace(/^\||\|$/, ''), 'i');
	};

	$(categoriesList).on('input clearSearchForm', '.js-search__input', function () {
		searchSidebarCategories.call(this);
	});
});
