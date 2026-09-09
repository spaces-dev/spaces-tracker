import $ from '../jquery';
import { L } from '../core/l10n';
import { getCurrentTheme, getEffectiveTheme, switchTheme, onThemeChange } from '../core/theme';
import { Spaces } from '../spacesLib';
import './swiper';

// l10n-set context="color-theme"
const THEME2TITLE = {system: L('Системная'), light: L('Светлая'), dark: L('Тёмная')};
// l10n-reset
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
	// l10n context="color-theme"
	this.title = L('Тема: {theme}', { theme: THEME2TITLE[getCurrentTheme()] });
});

function syncCurrentTheme() {
	const currentTheme = getCurrentTheme();
	for (const block of document.querySelectorAll('#page_sidebar .js-site-theme-title'))
		block.textContent = THEME2TITLE[currentTheme];
	for (const block of document.querySelectorAll('#page_sidebar .js-site-theme-state'))
		block.classList.toggle('hide', block.dataset.theme !== currentTheme);
}
