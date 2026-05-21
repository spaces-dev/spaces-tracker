import module from 'module';

module.on('componentpage', () => {
	$('#main').on('click', '.js-dir_checkbox_trigger', function (e) {
		if (e.target.closest('.js-checkbox'))
			return;
		this.querySelector('.js-checkbox')?.click();
	});
	$('#main').on('change', '.js-dir input[type="checkbox"]', function (e) {
		this.closest('.js-dir').classList.toggle('directory--is-selected', e.checked);
	});
});
