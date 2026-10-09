import module from "module";
import { L } from "../../../core/l10n";

module.on("componentpage", () => {
	$('#main').on('popper:beforeOpen', '.js-chat_message_menu', function () {
		const ratingElement = this.querySelector('[data-action="mini_games_profile_open"]');
		if (ratingElement)
			loadMiniGamesRating(ratingElement);
	});
});

async function loadMiniGamesRating(ratingElement) {
	if (ratingElement.dataset.busy)
		return;
	ratingElement.dataset.busy = true;
	const ratingText = ratingElement.querySelector('.js-text');

	const miniGamesWidget = document.getElementById('mini_games_dialog');
	const url = ratingElement.dataset.ratingUrl + ratingElement.dataset.userId;
	let rating;
	try {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${miniGamesWidget.dataset.token}`,
			},
		});
		if (response.status === 404) {
			rating = 0;
		} else {
			if (!response.ok)
				throw new Error(`Mini Games rating request failed: ${response.status}`);
			rating = (await response.json()).rating;
		}
	} catch (e) {
		rating = '?';
	} finally {
		delete ratingElement.dataset.busy;
	}

	ratingText.textContent = L('Рейтинг в Мини-играх: {rating}', { rating });
	ratingText.classList.remove('skeleton', 'skeleton--bordered');
}
