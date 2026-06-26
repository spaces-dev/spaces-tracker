import $ from '../jquery';
import { debounce, L } from '../utils';
import { getCurrentTheme, getEffectiveTheme, switchTheme, onThemeChange } from '../core/theme';
import { Spaces } from '../spacesLib';
import './swiper';

const THEME2TITLE = {system: L('Системная'), light: L('Светлая'), dark: L('Тёмная')};
const searchSidebarCategories = debounce(function () {
	updateSidebarCategoriesList(this);
}, 150);

let steps_to_system = 1;

onThemeChange(() => syncCurrentTheme());

$('#page_sidebar').on('click', '.js-site-theme', function (e) {
	e.preventDefault();
	
	if (getCurrentTheme() == 'system')
		steps_to_system = 2;
	
	let new_theme;
	if (steps_to_system === 0) {
		new_theme = 'system';
	} else {
		new_theme = (getEffectiveTheme() == 'dark' ? 'light' : 'dark');
	}
	
	steps_to_system--;
	
	Spaces.api("settings.theme", {theme: new_theme, CK: null, Ti: Spaces.tabId()});
	switchTheme(new_theme);
	syncCurrentTheme();
	this.title = L("Тема: {0}", THEME2TITLE[getCurrentTheme()]);
});

$(document).on('input clearSearchForm', '#main_content .js-sidebar-categories-search .js-search__input', function () {
	searchSidebarCategories.call(this);
});

function syncCurrentTheme() {
	const currentTheme = getCurrentTheme();
	for (const block of document.querySelectorAll('#page_sidebar .js-site-theme-title'))
		block.textContent = THEME2TITLE[currentTheme];
	for (const block of document.querySelectorAll('#page_sidebar .js-site-theme-state'))
		block.classList.toggle('hide', block.dataset.theme !== currentTheme);
}

function updateSidebarCategoriesList(input) {
	const categoriesList = document.querySelector('#main .js-sidebar-categories-list');

	if (!categoriesList)
		return;

	const searchQueryRegExp = getSearchQueryRegExp(input.value);
	const items = categoriesList.querySelectorAll('.js-sidebar-categories-item');
	let found = 0;

	for (const item of items) {
		const isVisible = !searchQueryRegExp || searchQueryRegExp.test(item.textContent);
		item.classList.toggle('hide', !isVisible);
		if (isVisible)
			found++;
	}

	const notFoundBlock = categoriesList.querySelector('.js-sidebar-categories-not-found');
	notFoundBlock.classList.toggle('hide', !searchQueryRegExp || found > 0);
}

function getSearchQueryRegExp(query) {
	const normalizedQuery = query.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').toLowerCase();
	if (!normalizedQuery.length)
		return undefined;
	return new RegExp("([\\s,._()-]|^)" + normalizedQuery.replace(/[^\wа-яёЁ]+/gi, '|').replace(/^\||\|$/, ''), 'i');
}
