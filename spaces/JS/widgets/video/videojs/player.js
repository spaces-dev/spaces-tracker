import 'Files/VideoJs.css';
import cookie from '../../../cookie';
import videojs from 'video.js';
import videojs_ru from 'video.js/dist/lang/ru.json';

import { findSelectedSource } from './plugins/utils';
import { videojsEnableSyncSetSource } from './plugins/patchSyncSetSource';
import { videojsPatchSeekBar } from './plugins/patchSeekBar';
import './plugins/controlBarSpacer';
import './plugins/qualitySelector';
import './plugins/heatmap';
import './plugins/resizeMonitor';
import './plugins/smartAltTab';
import './plugins/seekingStatus';
import "./plugins/dummyDuration";
import './plugins/betterAutoplay';
import './plugins/hideOnBlur';
import './plugins/fullscreenOnRotate';
import './plugins/tapToRewind';
import './plugins/storyboard';
import './plugins/videoTitle';
import './plugins/fastShowOnHover';
import './plugins/bigPlayingStatus';
import './plugins/adsOnPause';

// Патчим videojs
videojsEnableSyncSetSource(videojs);
videojsPatchSeekBar(videojs);

// Хук для выбора источника по-умолчанию
videojs.hook('beforesetup', (video, options) => {
	console.log("[videojs] ready!", Date.now() - SPACES_LOAD_START);

	if (options.altSources) {
		const getLastVideoServer = () => {
			for (const server of options.altProxyDomains) {
				if (cookie.get(server.id))
					return server.domain;
			}
			return undefined;
		};

		const isValidProxyServer = (domain) => {
			return !!options.altProxyDomains.find((server) => server.domain === domain);
		};

		const lastVideoServer = getLastVideoServer();
		if (lastVideoServer) {
			console.log("[fp] last proxy domain:", lastVideoServer);
			options.altSources = options.altSources.map((source) => {
				const sourceUrl = new URL(source.src);
				if (isValidProxyServer(sourceUrl.hostname)) {
					sourceUrl.hostname = lastVideoServer;
					source.src = sourceUrl.toString();
				}
				return source;
			});
		}
		options.sources = [findSelectedSource(options.altSources)];
	}
	return options;
});

// Добавляем русскую локализацию
videojs.addLanguage('ru', videojs_ru);

export default videojs;
