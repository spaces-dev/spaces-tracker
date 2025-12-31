import {loadScript} from 'loader';
import {base_domain, tick, windowReady} from './utils';

var GOOGLE_ANALYTICS		= SPACES_PARAMS.GA;
var YANDEX_METRIC_ID		= SPACES_PARAMS.YM;
var LIVEINTERNET_ENABLED	= SPACES_PARAMS.LI;

var ga_replace_domains_re = false;

if (GOOGLE_ANALYTICS) {
	// Google Analytics
	if (GOOGLE_ANALYTICS.id) {
		window.ga = window.ga || function () {
			(window.ga.q = window.ga.q || []).push(arguments);
			window.ga.l = Date.now();
		};
		
		ga('create', GOOGLE_ANALYTICS.id, {
			
		});
		
		windowReady(() => loadScript("//www.google-analytics.com/analytics.js"));
	}
	
	// Google Analytics 6
	if (GOOGLE_ANALYTICS.tag) {
		window.dataLayer = window.dataLayer || [];
		window.gtag = window.gtag || function () {
			dataLayer.push(arguments);
		};
		
		windowReady(() => loadScript('https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_ANALYTICS.tag));
		
		gtag('js', new Date());
		gtag('config', GOOGLE_ANALYTICS.tag, {send_page_view: false});
	}
}

// Загружаем Yandex метрику
if (YANDEX_METRIC_ID) {
	window.ym = window.ym || function () {
		(window.ym.a = window.ym.a || []).push(arguments);
		window.ym.l = Date.now();
	};
	
	ym(YANDEX_METRIC_ID, "init", {
		clickmap:				true,
		trackLinks:				true,
		accurateTrackBounce:	true,
		defer:					true,
		webvisor:				!!SPACES_PARAMS.YM_WV,
		params:					SPACES_PARAMS.VP || {}
	});
	
	windowReady(() => loadScript("https://cdn.jsdelivr.net/npm/yandex-metrica-watch/tag.js"));
}

trackHit(document.location.href, document.title, document.referrer);

// Единая функция отправки метрики
function trackHit(url, title, referer, firstInit) {
	tick(() => {
		// Google Analytics
		if (GOOGLE_ANALYTICS && GOOGLE_ANALYTICS.id) {
			ga('set', 'referrer', referer);
			ga('send', 'pageview', {
				'page': url.replace(/^https?:\/\/([^#?\/]+)/i, ''),
				'title': title
			});
		}
		
		// Google Analytics 6
		if (GOOGLE_ANALYTICS && GOOGLE_ANALYTICS.tag) {
			gtag('event', 'page_view', {
				page_title:		title,
				page_location:	url,
				page_path:		url.replace(/^https?:\/\/([^#?\/]+)/i, ''),
				page_referrer:	referer,
				send_to:		GOOGLE_ANALYTICS.tag
			});
		}
		
		// Yandex
		if (YANDEX_METRIC_ID) {
			ym(YANDEX_METRIC_ID, 'hit', url, {
				title:		title,
				referer:	referer
			});
		}
		
		// Liveinternet
		if (LIVEINTERNET_ENABLED) {
			let img = document.createElement('img');
			img.src = "//counter.yadro.ru/hit?t41.6;r" + 
				escape(referer) + 
				("undefined" == typeof screen ? "" : ";s" + screen.width + "*" + screen.height + "*" + (screen.colorDepth ? screen.colorDepth : screen.pixelDepth)) + 
				";u" + escape(url) + ";" + Math.random();
			
			img.setAttribute('width', '1');
			img.setAttribute('height', '1');
			img.setAttribute('alt', 'liveinternet');
			
			img.onload = function () {
				if (img.parentNode)
					img.parentNode.removeChild(img);
				img.onload = null;
			};
			
			document.getElementById('LI').appendChild(img);
		}
	});
}
