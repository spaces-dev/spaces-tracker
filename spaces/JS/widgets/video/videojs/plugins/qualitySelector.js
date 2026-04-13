import videojs from 'video.js';
import { L } from '../../../../utils';
import { findSelectedSource, silentPromise } from './utils';
import cookie from '../../../../cookie';

const MenuItem = videojs.getComponent('MenuItem');
const MenuButton = videojs.getComponent('MenuButton');

class QualitySelectorItem extends MenuItem {
	constructor(player, options) {
		super(player, options);
		this.source = options.source;
		this.updateState();
	}

	updateState() {
		let player = this.player();
		let current = player.currentSource();
		let is_selected = current.src == this.source.src;

		this.selected(is_selected);
		if (!this.source.enabled && !is_selected) {
			this.hide();
		} else {
			this.show();
		}
	}

	handleClick(event) {
		super.handleClick(event);
		this.player().trigger('user-select-quality', this.source.resolution);
	}
}

class VideoJsQualitySelector extends MenuButton {
	keepAliveTimer;

	constructor(player, options) {
		super(player, options);

		let first_played = false;

		let remove_waiting = () => {
			player.removeClass('vjs-changing-quality');
		};

		this.menuButton_.addClass('vjs-control');

		player.on('canplaythrough', remove_waiting);
		player.on('canplay', remove_waiting);
		player.on('playing', remove_waiting);
		player.on('userinactive', () => {
			this.unpressButton();
		});

		player.on('firstplay', () => {
			first_played = true;
		});

		player.on('user-select-quality', (event, resolution) => {
			const oldSource = player.currentSource();
			this.selectSource(resolution);
			const newSource = findSelectedSource(this.sources());
			if (oldSource.src != newSource.src) {
				this.setSource(newSource);
				player.trigger('quality-changed', newSource.resolution);
			}
		});

		player.on('quality-enable', (event, [resolution, enabled]) => {
			this.sources().forEach((source) => {
				if (source.resolution == resolution) {
					source.enabled = enabled;
					if (!first_played) {
						// Если после включения качества изменилось качество по умолчанию
						// Установим его в плеера
						// Выполняем это только если никто ещё не нажимал кнопку PLAY
						let new_source = findSelectedSource(this.sources())
						if (player.currentSrc() != new_source.src)
							player.src([new_source]);
					}
					this.updateItems();
				}
			});
		});

		this.controlText(L('Качество видео'));
		this.initHealthCheck(this.player().options_.altProxyDomains);
	}

	initHealthCheck(availableServers) {
		const getVideoServer = () => {
			return (new URL(player.currentSource().src)).hostname;
		};

		const setVideoServer = (domain) => {
			this.player().options_.altSources.forEach((source) => {
				const sourceUrl = (new URL(source.src));
				sourceUrl.hostname = domain;
				source.src = sourceUrl.toString();
			});
		};

		const getServerId = (domain) => {
			return availableServers.find((proxy) => proxy.domain === domain)?.id;
		};

		const isValidServer = (domain) => {
			return !!availableServers.find((proxy) => proxy.domain === domain);
		};

		const startHealthMonitor = () => {
			stopHealthMonitor();
			healthCheckTimer = setTimeout(() => {
				console.log("[fp] video timeout");
				healthCheckTimer = undefined;
				player.error(L("Ошибка загрузки видео (timeout)"));
			}, 10000);
		};

		const stopHealthMonitor = () => {
			if (healthCheckTimer) {
				clearTimeout(healthCheckTimer);
				healthCheckTimer = undefined;
			}
		};

		const player = this.player();
		const usedProxyServers = [];
		const initialServer = getVideoServer();
		let healthCheckTimer;
		let videoIsPlayable = false;

		if (!isValidServer(getVideoServer()))
			return;

		player.on("play", () => {
			if (!videoIsPlayable && usedProxyServers.length < availableServers.length)
				startHealthMonitor();
		});
		player.on("canplay", () => {
			videoIsPlayable = true;
			stopHealthMonitor();

			// Сохряем только при успехе
			const currentServerId = getServerId(getVideoServer());
			for (const server of availableServers)
				cookie.remove(server.id);
			cookie.set(currentServerId, 1, { expires: 3600 });
		});
		player.on("dispose", () => {
			stopHealthMonitor();
		});
		player.on('error', (e) => {
			stopHealthMonitor();

			const currentServer = getVideoServer();
			usedProxyServers.push(currentServer);
			console.error(`[fp] server failed: ${currentServer}`);

			let nextServer = availableServers.find((proxy) => !usedProxyServers.includes(proxy.domain))?.domain;
			if (!nextServer) {
				if (currentServer != initialServer) {
					console.log(`[fp] reset to initial server ${initialServer}`);
					nextServer = initialServer;
				}
			}

			if (nextServer) {
				e.stopPropagation();
				e.stopImmediatePropagation();

				console.log(`[fp] trying next server: ${nextServer}`);
				setVideoServer(nextServer);
				player.trigger({ type: 'change-source-on-error' });
				this.setSource(findSelectedSource(this.sources()));
				silentPromise("[fp] server change", player.play());
			} else {
				console.log(`[fp] no more servers!`);
			}
		});
	}

	setSource(source) {
		const player = this.player();
		const currentTime = player.currentTime();
		const currentRate = player.playbackRate();
		const duration = player.duration();

		if (currentTime >= duration)
			currentTime = 0;

		player.src([source]);
		player.playbackRate(currentRate);

		this.deferSeek(currentTime);
		this.updateItems();
	}

	pressButton() {
		super.pressButton();
		this.startKeepaliveTimer();
	}

	unpressButton() {
		super.unpressButton();
		this.stopKeepaliveTimer();
	}

	startKeepaliveTimer() {
		const started = Date.now();
		this.keepAliveTimer = this.setInterval(() => {
			if (Date.now() - started > 15000) {
				this.stopKeepaliveTimer();
			} else {
				this.player().reportUserActivity();
			}
		}, 1000);
	}

	stopKeepaliveTimer() {
		if (this.keepAliveTimer) {
			this.clearInterval(this.keepAliveTimer);
			this.keepAliveTimer = undefined;
		}
	}

	buildCSSClass() {
		return `vjs-quality-selector ${super.buildCSSClass()}`;
	}

	buildWrapperCSSClass() {
		return `vjs-quality-selector ${super.buildWrapperCSSClass()}`;
	}

	sources() {
		return this.player().options_.altSources;
	}

	selectSource(resolution) {
		let changed = 0;
		this.sources().forEach((source) => {
			let new_state = (source.resolution == resolution);
			if (source.selected != new_state) {
				source.selected = new_state;
				changed++;
			}
		});
		return changed > 0;
	}

	createItems() {
		let player = this.player();

		let items = [];
		this.sources().forEach((source) => {
			items.push(new QualitySelectorItem(player, {
				label:				source.label,
				selectable:			true,
				multiSelectable:	false,
				source:				source
			}));
		});

		return items;
	}

	updateItems() {
		for (let i = 0, l = this.items.length; i < l; i++)
			this.items[i].updateState();
	}

	deferSeek(current_time) {
		const player = this.player();
		const is_paused = player.paused();
		if (!this.defer_seek) {
			if (current_time > 1) {
				this.defer_seek = {
					time:		current_time,
					callback:	() => this.resolveDeferSeek()
				};

				player.on('loadedmetadata', this.defer_seek.callback);
				player.on('canplay', this.defer_seek.callback);
				player.addClass('vjs-changing-quality');
			}

			player.load();

			if (!is_paused)
				silentPromise("play before loadedmetadata", player.play())
		}
	}

	resolveDeferSeek() {
		if (this.defer_seek) {
			let player = this.player();
			player.off('loadedmetadata', this.defer_seek.callback);
			player.off('canplay', this.defer_seek.callback);

			player.currentTime(this.defer_seek.time);
			this.defer_seek = false;

			if (player.paused())
				silentPromise("play after loadedmetadata", player.play())
		}
	}

	dispose() {
		super.dispose();
		this.stopKeepaliveTimer();
	}
}

videojs.registerComponent('QualitySelector', VideoJsQualitySelector);
