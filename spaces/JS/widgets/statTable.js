import module from 'module';
import $ from '../jquery';

module.on('componentpage', () => {
	let fullscreen = false;
	const toggleFullscreen = (flag) => {
		if (flag == fullscreen)
			return;
		$('#stat_table_container').toggleClass('stat_table_container--fullscreen', flag);
		$('body').toggleClass('root--no-scroll', flag);
		fullscreen = flag;
	};
	$('#main').action('stat_table_fullcreen', function (e) {
		e.preventDefault();
		toggleFullscreen(!fullscreen);
	});
	$('body').on('keydown', function (e) {
		if (e.key == 'Escape')
			toggleFullscreen(false);
	});
	return () => toggleFullscreen(false);
});
