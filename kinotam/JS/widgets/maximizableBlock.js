import module from 'module';
import $ from '../jquery';

const tpl = {
	iconExpand() {
		return `
			<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
				<path d="M280-280h120q17 0 28.5 11.5T440-240q0 17-11.5 28.5T400-200H240q-17 0-28.5-11.5T200-240v-160q0-17 11.5-28.5T240-440q17 0 28.5 11.5T280-400v120Zm400-400H560q-17 0-28.5-11.5T520-720q0-17 11.5-28.5T560-760h160q17 0 28.5 11.5T760-720v160q0 17-11.5 28.5T720-520q-17 0-28.5-11.5T680-560v-120Z"/>
			</svg>
		`;
	},
	iconCollapse() {
		return `
			<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
				<path d="M360-360H240q-17 0-28.5-11.5T200-400q0-17 11.5-28.5T240-440h160q17 0 28.5 11.5T440-400v160q0 17-11.5 28.5T400-200q-17 0-28.5-11.5T360-240v-120Zm240-240h120q17 0 28.5 11.5T760-560q0 17-11.5 28.5T720-520H560q-17 0-28.5-11.5T520-560v-160q0-17 11.5-28.5T560-760q17 0 28.5 11.5T600-720v120Z"/>
			</svg>
		`;
	}
};

module.on('componentpage', () => {
	let currentMaximizedBlock;

	const handleKeyDown = (e) => {
		if (e.key == 'Escape' && currentMaximizedBlock)
			setFullscreen(currentMaximizedBlock, false);
	};

	const setFullscreen = (block, flag) => {
		block.classList.toggle('maximizable-block--fullscreen', flag);
		document.body.classList.toggle('root--no-scroll', flag);
		block.dataset.maximized = flag ? "true" : "false";

		const toggleButton = block.querySelector('.js-action_link[data-action="maximizable_block_toggle"]');
		toggleButton.innerHTML = flag ? tpl.iconCollapse() : tpl.iconExpand();

		if (flag) {
			currentMaximizedBlock = block;
			window.addEventListener('keydown', handleKeyDown);
		} else {
			currentMaximizedBlock = undefined;
			window.removeEventListener('keydown', handleKeyDown);
		}
	};

	$('#main').action('maximizable_block_toggle', function (e) {
		e.preventDefault();
		const block = this.closest('.js-maximizable_block');
		setFullscreen(block, block.dataset.maximized !== "true");
	});

	return () => {
		if (currentMaximizedBlock)
			setFullscreen(false);
	};
});
