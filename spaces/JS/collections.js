import module from 'module';
import $ from './jquery';
import cookie from './cookie';
import { Spaces, Url, FILE_TYPE_TO_DIR_TYPE } from './spacesLib';
import pageLoader from './ajaxify';
import { html_wrap } from './utils';
import { L } from './core/l10n';
import { getPopperById } from './widgets/popper';
import { simplePagination } from './widgets/fragments/simplePagination';
import { showToast, hideToast } from './widgets/toaster';
import 'Files/DirectorySelector.css';

const PER_PAGE = 5;

const tpl = {
	saveNotif(data) {
		return L('Файл сохранён в вашу коллекцию {collection}.', {
			collection: `<a href="${data.url}">${html_wrap(data.name)}</a>`
		});
	},
	saveMusicNotif(data) {
		if (data.exists) {
			return L('Файл был добавлен ранее: {file}', {
				file: `<a href="${data.url}">${data.name}</a>`
			});
		}
		return L('Файл сохранён в вашу <link>музыку</link>.', {
			link: (content) => `<a href="${data.url}">${content}</a>`
		});
	},
	list(listing, currentPage) {
		const offset = (currentPage - 1) * PER_PAGE;
		return `
			<div class="dropdown-content">
				<div class="js-collection_add list-link list-link-blue list-link--short list-link_last t_center">
					<span class="ico ico_plus_blue js-ico"></span>
					${L('Создать коллекцию')}
				</div>
			</div>
			<div class="dropdown-content">
				<div class="js-collections_dirs">
					${listing.collections.length ? listing.collections.slice(offset, offset + PER_PAGE).join('') : `
						<div class="dir-selector__empty">${L('У вас пока нет коллекций.')}</div>
					`}
				</div>
				${simplePagination({ current: currentPage, total: Math.ceil(listing.collections.length / PER_PAGE) })}
			</div>
		`;
	},
	loader() {
		return `
			<div class="dropdown-content">
				<div class="dir-selector__empty">
					<span class="ico ico_spinner"></span>
					${L('Загрузка коллекций')}
				</div>
			</div>
		`;
	},
	form(widget) {
		return `
			<div class="dropdown-content">
				${widget}
			</div>
		`;
	},
	error(error) {
		return `
			<div class="dropdown-content">
				<div class="content-item3 content-bl__sep red t_center">${error}</div>
				<div class="js-popper_close list-link list-link-grey list-link--short list-link_last t_center">
					<span class="ico ico_remove"></span>
					${L('Закрыть')}
				</div>
			</div>
		`;
	}
};

function showSaveToast(type, nid, text) {
	$(`#collections_motivator_${type}_${nid}`).remove();
	showToast({
		id: 'collections',
		severity: 'info',
		text
	});
}

function initMusicCollections(link) {
	const nid = link.data('nid');
	const type = Spaces.TYPES.MUSIC;
	const fileType = link.data('type');

	link.on('click.collections', async (e) => {
		if (!Spaces.params.nid)
			return;
		e.preventDefault();

		const toggleLoading = (loading) => {
			link.data('busy', loading);
			link.find('.js-ico').toggleClass('ico_spinner', loading);
		};

		if (link.data('busy'))
			return;

		toggleLoading(true);
		const response = await Spaces.asyncApi('files.copy2me', {
			...new Url(link.prop('href')).query,
			CK: null,
			Ft: fileType,
			Type: type
		});
		toggleLoading(false);

		if (response.code == 0 || response.exists) {
			showSaveToast(type, nid, tpl.saveMusicNotif({
				name: response.fileName,
				exists: response.exists,
				url: response.url
			}));
		} else {
			showToast({
				id: 'collections',
				severity: 'error',
				text: Spaces.apiError(response)
			});
		}
	});
	return {
		destroy() {
			link.off('.collections').removeData('__collections__');
		}
	};
}

function initCollections(link) {
	const nid = link.data('nid');
	const type = link.data('extType') || link.data('type');
	const fileType = link.data('type');
	const popper = getPopperById(link.data('popperId'));
	let listing;
	let mode = 'listing';
	let currentPage = 1;
	const busyDirs = new Set();

	const toggleLoading = (button, loading) => {
		link.data('busy', loading);
		button.find('.js-ico').toggleClass('ico_spinner', loading);
	};

	const render = (html) => {
		popper.$content().html(html);
		popper.update();
	};

	const showError = (response) => {
		render(tpl.error(Spaces.apiError(response)))
	};

	const updateDirLoading = () => {
		for (const dir of popper.$content().find('.js-collections_dirs .js-dir').toArray()) {
			const loading = busyDirs.has(+dir.dataset.nid);
			$(dir).find('input[type="checkbox"]').prop('disabled', loading);
			$(dir).find('.js-checkbox').toggleClass('form-checkbox--is-disabled', loading);
		}
	};

	const renderList = () => {
		mode = 'listing';
		render(tpl.list(listing, currentPage));
		updateDirLoading();
	};

	const getApiParams = () => {
		return {
			D: -Spaces.params.nid,
			Type: FILE_TYPE_TO_DIR_TYPE[type],
			Col: 1,
			a: 'cd',
			CK: null,
			Link_id: Spaces.params.link_id
		};
	};

	const setCollectionSelected = async (dir, selected) => {
		const dirId = dir.data('nid');
		if (selected) {
			const response = await Spaces.asyncApi('files.copy2me', {
				File_id: nid,
				Ft: fileType,
				Type: type,
				Dir: dirId,
				Link_id: Spaces.params.link_id,
				Force: 1,
				CK: null
			});

			if (response.code != 0) {
				showToast({ id: 'collections', severity: 'error', text: Spaces.apiError(response) });
				return;
			}

			listing.savedFileIds[dirId] = response.fileId;

			showSaveToast(type, nid, tpl.saveNotif({
				name: dir.find('.js-dir_name').text().trim(),
				url: dir.data('url')
			}));
		} else {
			const response = await Spaces.asyncApi('files.delete', {
				File_id: listing.savedFileIds[dirId],
				Type: type,
				Link_id: Spaces.params.link_id,
				CK: null
			});

			if (response.code != 0) {
				showToast({ id: 'collections', severity: 'error', text: Spaces.apiError(response) });
				return;
			}

			delete listing.savedFileIds[dirId];
			showToast({ id: 'collections', severity: 'info', text: L('Файл удалён из коллекции.') });
		}
	};

	const changeCollection = async (dir, selected) => {
		const dirId = dir.data('nid');
		busyDirs.add(dirId);
		updateDirLoading();
		try {
			await setCollectionSelected(dir, selected);
			await loadCollections(undefined, true);
		} finally {
			busyDirs.delete(dirId);
			updateDirLoading();
		}
	};

	const loadCollections = async (dirId, refresh = false) => {
		if (refresh && !popper.isOpen())
			return;

		const response = await Spaces.asyncApi('files.getCollections', {
			Fid: nid,
			Ft: fileType,
			Type: FILE_TYPE_TO_DIR_TYPE[type],
			Uid: Spaces.params.nid,
			Checkbox: 1,
			Link_id: Spaces.params.link_id
		}, { requestId: 'collections_list' });

		if (!response)
			return;

		if (response.code != 0) {
			if (refresh) {
				showToast({ id: 'collections', severity: 'error', text: Spaces.apiError(response) });
			} else {
				showError(response);
			}
			return;
		}

		// После авторегистрации обновляем виджеты и отключаем следующий AJAX-переход.
		if (!Spaces.params.nid) {
			pageLoader.refreshWidgets(
				Spaces.WIDGETS.FOOTER | Spaces.WIDGETS.HEADER | Spaces.WIDGETS.SIDEBAR | Spaces.WIDGETS.CSS,
				() => {
					Spaces.params.nid = cookie.get('user_id');
				}
			);
			pageLoader.disable(true);
		}

		listing = {
			collections: response.collections,
			savedFileIds: response.savedFileIds
		};

		if (refresh) {
			currentPage = Math.min(currentPage, Math.max(1, Math.ceil(listing.collections.length / PER_PAGE)));
		} else {
			const index = dirId ? listing.collections.findIndex((html) => $(html).data('nid') == dirId) : 0;
			currentPage = Math.floor(Math.max(0, index) / PER_PAGE) + 1;
		}

		if (!refresh || mode == 'listing')
			renderList();

		return true;
	};

	link.addClass('js-popper_open');

	popper.on('beforeOpen', () => {
		render(tpl.loader());
		return loadCollections();
	});

	if (popper.getType() == 'gallery') {
		const galleryButton = $('#g_sharelink_inner');
		popper.on('afterOpen', () => galleryButton.addClass('js-clicked'));
		popper.on('afterClose', () => galleryButton.removeClass('js-clicked'));
	}

	popper.$content().on('click', '.js-simple_pagination', (e) => {
		e.preventDefault();
		const direction = ($(e.currentTarget).data('dir') == 'next' ? 1 : -1);
		currentPage = currentPage + direction;
		renderList();
	});

	popper.$content().on('click', '.js-collection_add', async (e) => {
		e.preventDefault();
		if (link.data('busy'))
			return;
		const button = $(e.currentTarget);
		toggleLoading(button, true);
		const response = await Spaces.asyncApi('files.createDir', getApiParams());
		toggleLoading(button, false);
		if (response.code == 0) {
			mode = 'createDir';
			render(tpl.form(response.widget));
		} else {
			showError(response);
		}
	});

	popper.$content().on('click', '.js-collections_dirs .js-dir', (e) => {
		if (e.target.closest('.js-checkbox'))
			return;
		e.stopPropagation();
		e.preventDefault();
		$(e.currentTarget).find('.js-checkbox').trigger('click');
	});

	popper.$content().on('change', '.js-collections_dirs input[type="checkbox"]', (e) => {
		e.stopPropagation();
		const dir = $(e.currentTarget).closest('.js-dir');
		changeCollection(dir, e.currentTarget.checked);
	});

	popper.$content().on('click', '.js-collections_list', (e) => {
		e.stopPropagation();
		e.preventDefault();
		renderList();
	});

	popper.$content().on('click', 'button[name="cfms"]', async (e) => {
		e.stopPropagation();
		e.preventDefault();
		if (link.data('busy'))
			return;

		const button = $(e.currentTarget);
		const form = button.closest('form');

		toggleLoading(button, true);

		const response = await Spaces.asyncApi('files.createDir', {
			...Url.serializeForm(form),
			...getApiParams(),
			cfms: 1
		});

		if (response.code != 0) {
			Spaces.view.setInputError(form.find('input[name="n"]'), Spaces.apiError(response));
		} else if (response.dirId) {
			if (await loadCollections(undefined, true)) {
				const dir = $(listing.collections.find((html) => $(html).data('nid') == response.dirId));
				await setCollectionSelected(dir, true);
				await loadCollections(response.dirId);
			}
		} else {
			mode = 'createDir';
			render(tpl.form(response.widget));
		}

		toggleLoading(button, false);
	});


	return {
		destroy() {
			Spaces.cancelApi('collections_list');
			popper.destroy();
			link.removeData('__collections__').removeData('busy');
		}
	};
}

export const FileCollections = {
	init(link) {
		if (!link.data('__collections__'))
			link.data('__collections__', initCollections(link));
		return link.data('__collections__');
	},
	freeInstance(link) {
		link.data('__collections__')?.destroy();
	}
};

module.on('componentpage', () => {
	const instances = [];
	module.on('component', () => {
		for (const el of document.querySelectorAll('.js-collection_copy')) {
			el.classList.remove('js-collection_copy');
			const link = $(el);
			const type = link.data('extType') || link.data('type');
			instances.push(type == Spaces.TYPES.MUSIC ? initMusicCollections(link) : FileCollections.init(link));
		}
	});


	return () => {
		for (const instance of instances)
			instance.destroy();
		hideToast('collections');
	};
});
