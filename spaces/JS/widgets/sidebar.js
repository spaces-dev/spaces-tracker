import $ from '../jquery';
import { L } from '../utils';
import { getCurrentTheme, getEffectiveTheme, switchTheme, onThemeChange } from '../core/theme';
import { Spaces } from '../spacesLib';
import './swiper';

const THEME2TITLE = {system: L('Системная'), light: L('Светлая'), dark: L('Тёмная')};

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

function syncCurrentTheme() {
	const currentTheme = getCurrentTheme();
	for (const block of document.querySelectorAll('#page_sidebar .js-site-theme-title'))
		block.textContent = THEME2TITLE[currentTheme];
	for (const block of document.querySelectorAll('#page_sidebar .js-site-theme-state'))
		block.classList.toggle('hide', block.dataset.theme !== currentTheme);
}
