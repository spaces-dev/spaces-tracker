import cookie from "../../../cookie";
import { reachGoal } from "../../../metrics/track";
import { L } from "../../../core/l10n";

export function setupAds(player, adBreaks) {
	reachGoal("player_has_ads");

	player.on("vast.error", (_e, { message }) => {
		console.error("[vast] error:", message);
		reachGoal("player_ads_error");
	});
	player.on("vast.playAttempt", (_e, { adBreakType }) => {
		reachGoal("player_ads_play");
		reachGoal(`player_ads_play_${adBreakType}`);
	});
	player.on("vast.playSuccess", (_e, { adBreakType }) => {
		reachGoal("player_ads_play_success");
		reachGoal(`player_ads_play_success_${adBreakType}`);
	});
	player.on("vast.click", (_e, { adBreakType }) => {
		reachGoal("player_ads_click");
		reachGoal(`player_ads_click_${adBreakType}`);
	});

	const vmap = createVmap(adBreaks);
	player.vast({
		vmapUrl: 'data:application/xml;charset=utf-8,' + encodeURIComponent(vmap),
		// l10n-set context="video-ad"
		translation: {
			skipButtonText: L("Пропустить"),
			adsSingleLabel: L("Реклама: {timeLeft}"),
			adsMultiLabel: L("Реклама {current} из {total}: {timeLeft}")
		},
		// l10n-reset
		debug: !!cookie.get('vast_debug'),
	});
}

function createVmap(adBreaks) {
	let xml = `<?xml version="1.0" encoding="UTF-8"?><vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0">`;
	let i = 0;
	for (const ad of adBreaks) {
		xml += `
			<vmap:AdBreak timeOffset="${ad.offset}" breakType="${ad.type}" breakId="${ad.id}">
				<vmap:AdSource id="ad-${ad.id}-${ad.type}-${i++}" allowMultipleAds="false" followRedirects="true">
					<vmap:AdTagURI templateType="vast3"><![CDATA[${ad.tag}]]></vmap:AdTagURI>
				</vmap:AdSource>
			</vmap:AdBreak>
		`;
	}
	xml += `</vmap:VMAP>`;
	return xml;
}
