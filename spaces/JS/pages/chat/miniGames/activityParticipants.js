import module from 'module';
import { L } from '../../../core/l10n';
import { html_wrap } from '../../../utils';

const PRELOAD_OFFSET = 72;

const tpl = {
	compactNumber(value) {
		if (value === null)
			return '0';
		const abs = Math.abs(value);
		if (abs < 1000)
			return String(value);
		let divisor;
		let suffix;
		if (abs >= 999950000000) {
			divisor = 1000000000000;
			suffix = 'T';
		} else if (abs >= 999950000) {
			divisor = 1000000000;
			suffix = 'B';
		} else if (abs >= 999950) {
			divisor = 1000000;
			suffix = 'M';
		} else {
			divisor = 1000;
			suffix = 'K';
		}
		return (value / divisor).toFixed(1).replace(/\.0$/, '') + suffix;
	},
	// l10n-set context="game-activity-presence"
	presenceLabel(row) {
		const labels = {
			online: L('В сети в этой игре'),
			offline: L('Не в сети в этой игре'),
			participated: L('Участвовал в игре'),
			pending: L('Ожидает участия'),
		};
		const label = labels[row.presence];
		return row.isWinner ? L('Победитель, {presence}', { presence: label }) : label;
	},
	// l10n-reset
	crownIcon() {
		return `
			<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
				<path d="M232.63,70a19.82,19.82,0,0,0-23.55,4.71l-29.52,31.82L146.22,31.76l-.06-.14a20,20,0,0,0-36.32,0l-.06.14L76.44,106.52,46.92,74.7a20,20,0,0,0-34.6,16.81c0,.16.06.31.09.47L35.07,195.76A20,20,0,0,0,54.71,212H201.29a20,20,0,0,0,19.64-16.24L243.59,92c0-.16.07-.31.09-.47A19.82,19.82,0,0,0,232.63,70ZM198.06,188H57.94L39.06,101.51,71.2,136.16A12,12,0,0,0,91,132.89l37-83.07,37,83.07a12,12,0,0,0,19.76,3.27l32.14-34.65Z"></path>
			</svg>
		`;
	},
	player(row) {
		const name = row.name.startsWith('@') ? row.name : `@${row.name}`;
		const initial = Array.from(name.slice(1))[0] || '?';
		const profileData = JSON.stringify({
			type: 'NAVIGATE_ROUTE',
			route: 'profile',
			userId: row.userId,
		});
		const avatarClass = [
			'game-activity-player__avatar',
			row.presence === 'online' ? 'game-activity-player__avatar--online' : '',
			row.isWinner ? 'game-activity-player__avatar--winner' : '',
		].filter(Boolean).join(' ');
		const image = row.avatarUrl ?
			`<img src="${html_wrap(row.avatarUrl)}" loading="lazy" alt="" />` :
			`<span>${html_wrap(initial)}</span>`;
		const percent = row.percent === null ? 0 : row.percent;
		return `
			<div class="game-activity-player js-game-activity-player">
				<a
					href="#"
					class="game-activity-player__info js-action_link"
					data-action="mini_games_profile_open"
					data-game-payload="${html_wrap(profileData)}"
					aria-label="${html_wrap(`${name}, ${tpl.presenceLabel(row)}`)}"
				>
					<span class="game-activity-player__elo">${tpl.compactNumber(row.elo)}</span>
					<span class="game-activity-player__profile">
						<span class="${avatarClass}" aria-hidden="true">
							${image}
							${tpl.crownIcon()}
						</span>
						<span class="game-activity-player__name" title="${html_wrap(name)}">${html_wrap(name)}</span>
					</span>
					<span class="game-activity-progress" style="--progress-percent: ${percent}%;"></span>
					<span class="game-activity-player__metric">${tpl.compactNumber(row.value)}</span>
				</a>
			</div>
		`;
	},
};

class ActivityParticipants {
	constructor(card, paging) {
		this.card = card;
		this.paging = paging;
		this.isBrowsing = false;
		this.abortController = undefined;
		this.setList(card.querySelector('.js-game-activity-players'));
		this.updateSentinel();
		this.loadMore();
	}

	setList(list) {
		this.list = list;
		this.sentinel = list.querySelector('.js-game-activity-sentinel');
		list.addEventListener('scroll', () => this.loadMoreIfNeeded());
	}

	updateSentinel() {
		this.sentinel.hidden = this.paging.nextOffset === null;
	}

	destroy() {
		if (this.abortController)
			this.abortController.abort();
		this.abortController = undefined;
	}

	loadMoreIfNeeded() {
		if (this.list.scrollTop + this.list.clientHeight >= this.list.scrollHeight - PRELOAD_OFFSET)
			this.loadMore();
	}

	updateLoadingState() {
		this.list.toggleAttribute('aria-busy', Boolean(this.abortController));
	}

	replaceCard(card, paging) {
		const list = card.querySelector('.js-game-activity-players');
		this.card = card;
		if (this.isBrowsing) {
			list.replaceWith(this.list);
			card.querySelector('.js-game-activity-total').textContent = String(this.paging.total);
			return;
		}
		this.paging = paging;
		this.setList(list);
		this.updateSentinel();
		this.loadMoreIfNeeded();
	}

	async loadAvatars(rows) {
		const userIds = rows
			.filter(row => row.avatarUrl === null && row.originalUserId !== null)
			.map(row => row.originalUserId);
		if (!userIds.length)
			return {};
		const response = await Spaces.asyncApi('users.getAvatars', {
			UsErs: userIds,
			Size: Spaces.PREVIEW.SIZE_41_40,
		});
		return response.code === 0 ? response.avatars : {};
	}

	applyPage(page, avatars) {
		const template = document.createElement('template');
		template.innerHTML = page.rows.map(row => {
			const avatarUrl = row.avatarUrl || avatars[row.originalUserId];
			return tpl.player(avatarUrl ? { ...row, avatarUrl } : row);
		}).join('');
		const elements = Array.from(template.content.children);
		if (page.revision !== this.paging.revision) {
			this.list.textContent = '';
			this.list.append(...elements, this.sentinel);
			this.list.scrollTop = 0;
			this.paging.revision = page.revision;
			this.paging.total = page.total;
			this.card.querySelector('.js-game-activity-total').textContent = String(page.total);
		} else {
			this.sentinel.before(...elements);
		}
		this.paging.nextOffset = page.nextOffset;
		this.updateSentinel();
	}

	async loadMore() {
		if (this.abortController || this.paging.nextOffset === null)
			return;
		const abortController = new AbortController();
		const wasBrowsing = this.isBrowsing;
		let loaded = false;
		this.isBrowsing = true;
		this.abortController = abortController;
		this.updateLoadingState();
		try {
			const url = new URL(this.paging.url);
			url.searchParams.set('offset', String(this.paging.nextOffset));
			url.searchParams.set('revision', this.paging.revision);
			const response = await fetch(url, {
				credentials: 'omit',
				referrerPolicy: 'no-referrer',
				signal: abortController.signal,
			});
			if (!response.ok)
				throw new Error('Activity participants request failed');
			const page = await response.json();
			if (this.abortController !== abortController)
				return;
			const avatars = await this.loadAvatars(page.rows);
			if (this.abortController !== abortController)
				return;
			this.applyPage(page, avatars);
			loaded = true;
		} catch (error) {
			if (error.name === 'AbortError')
				return;
			Spaces.showMsg(L('Не удалось загрузить список игроков.'));
			if (!wasBrowsing)
				this.isBrowsing = false;
		} finally {
			if (this.abortController === abortController) {
				this.abortController = undefined;
				this.updateLoadingState();
				if (loaded)
					this.loadMoreIfNeeded();
			}
		}
	}
}

module.on('componentpage', () => {
	const main = document.getElementById('main');
	const participantsByMessage = new Map();

	const destroyParticipants = (messageId, participants) => {
		participants.destroy();
		participantsByMessage.delete(messageId);
	};

	module.on('component', () => {
		for (const card of main.querySelectorAll('.js-game-activity-card')) {
			const messageId = card.closest('.js-message').dataset.id;
			const paging = JSON.parse(card.dataset.activityParticipants);
			const participants = participantsByMessage.get(messageId);
			if (!paging) {
				if (participants)
					destroyParticipants(messageId, participants);
				continue;
			}
			if (!participants) {
				participantsByMessage.set(messageId, new ActivityParticipants(card, paging));
				continue;
			}
			if (participants.card !== card)
				participants.replaceCard(card, paging);
		}
		for (const [messageId, participants] of participantsByMessage) {
			if (!participants.card.isConnected)
				destroyParticipants(messageId, participants);
		}
	});

	return () => {
		module.on('component', undefined);
		for (const [messageId, participants] of participantsByMessage)
			destroyParticipants(messageId, participants);
	};
});
