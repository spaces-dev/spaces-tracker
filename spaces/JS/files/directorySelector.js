import module from 'module';
import { closeAllPoppers, getPopperById } from '../widgets/popper';
import { FILE_TYPE_TO_DIR_TYPE, Spaces, Url } from '../spacesLib';
import $ from '../jquery';
import { L } from '../utils';
import { simplePagination } from '../widgets/fragments/simplePagination';

const PER_PAGE = 5;

const tpl = {
	list({ location, subDirs, isRoot, canCreateDir, pagination, fileMoveError, isCollection, canMoveHere, isFileAlreadyInDir }) {
		const curDir = location[location.length - 1];
		const prevDir = location.length > 1 ? location[location.length - 2] : 0;

		const emptyMessage = () => {
			if (isCollection) {
				return canCreateDir ?
					L('Список пуст. Вы можете выбрать текущую коллекцию или создать новую.') :
					L('Список пуст. Вы можете выбрать текущую коллекцию.');
			} else {
				return canCreateDir ?
					L('Список пуст. Вы можете выбрать текущую папку или создать новую.') :
					L('Список пуст. Вы можете выбрать текущую папку.');
			}
		};

		return `
			<div class="dir-selector dropdown-list">
				<div class="dropdown-list__item">
					<div class="dir-selector__location">
						<button
							class="
								js-action_link dir-selector__location-button use-icon-state
								${isRoot ? 'dir-selector__location-button--is-disabled' : ''}
							"
							data-action="dir_selector_back"
							data-dir-id="${prevDir.nid}"
							title="${L('Перейти назад')}"
						>
							<span class="js-ico ico-alone ico ico_arr_left"></span>
						</button>
						<div class="dir-selector__location-title">
							<span class="ico_files ico_files_dir"></span>
							${curDir.name}
						</div>
						<button
							class="
								js-action_link dir-selector__location-button use-icon-state
								${canCreateDir ? '' : 'dir-selector__location-button--is-disabled'}
							"
							data-action="dir_selector_create_dir_form"
							title="${isCollection ? L('Создать коллекцию') : L('Создать папку')}"
						>
							<span class="js-ico ico-alone ico ${canCreateDir ? 'ico_dir_create_blue' : 'ico_dir_create'}"></span>
						</button>
					</div>
					${subDirs.length ? `
						<div class="dir-selector__list">
							${subDirs.join("")}
						</div>
						${pagination}
					` : `
						<div class="dir-selector__empty">
							${emptyMessage()}
						</div>
					`}
				</div>

				<div class="dropdown-list__item ${fileMoveError ? '' : 'hide'}">
					<div class="stnd-block grey t_center">
						<span class="ico ico_block"></span>
						${fileMoveError ?? ''}
					</div>
				</div>

				<div class="dropdown-list__item ${isFileAlreadyInDir ? '' : 'hide'}">
					<div class="stnd-block grey t_center">
						${isCollection ? L('Файл уже находится в текущей коллекции.') : L('Файл уже находится в текущей папке.')}
					</div>
				</div>

				<div class="dropdown-list__item ${isFileAlreadyInDir || fileMoveError || !canMoveHere ? 'hide' : ''}">
					<div
						class="js-action_link list-link list-link-blue list-link--short list-link_last t_center"
						data-action="dir_selector_select"
					>
						<span class="ico ico_ok_blue js-ico"></span>
						${isCollection ? L('Выбрать текущую коллекцию') : L('Выбрать текущую папку')}
					</div>
				</div>
			</div>
		`;
	},
	loader() {
		return `
			<div class="dir-selector">
				<div class="dir-selector__empty">
					<span class="ico ico_spinner"></span>
					${L('Загрузка....')}
				</div>
			</div>
		`;
	},
	error(errMsg) {
		return `
			<div class="content-item3 content-bl__sep red">
				${errMsg}
			</div>
			<div class="js-popper_close list-link list-link-grey list-link--short list-link_last t_center">
				<span class="ico ico_remove"></span>
				${L('Закрыть')}
			</div>
		`;
	}
};

function initDirSelector(selectorWidget) {
	let currentDir;
	const popper = getPopperById(selectorWidget.find('.js-dir_selector_popper').prop("id"));
	const selectorPopperContent = $(popper.content());
	const type = selectorWidget.data('type');
	const mode = selectorWidget.data('mode');
	let currentPage = 1;
	let totalPages = 0;
	let directoryListing;

	const showError = (error) => {
		selectorPopperContent.html(tpl.error(error));
	};

	const getSelectedDir = () => {
		if (mode == 'form-field') {
			return +selectorWidget.find('.js-dir_selector_value').val();
		} else if (mode == 'move') {
			return selectorWidget.data('value');
		}
	};

	const setSelectedDir = async (dirId, dirWidget) => {
		if (mode == 'form-field') {
			selectorWidget.find('.js-dir_selector_value').val(dirId);
			$(popper.opener()).html(dirWidget);
			Spaces.view.setInputError(selectorWidget, false);
		} else if (mode == 'move') {
			const params = selectorWidget.data('params');
			const response = await Spaces.asyncApi("files.dir.select", {
				...params,
				Dir: dirId,
				CK: null,
			});
			if (response.code != 0) {
				showError(Spaces.apiError(response));
				return false;
			}

			selectorWidget.data('value', dirId);
			$(selectorWidget.data('currentDirView')).html(dirWidget);
		}
		return true;
	};

	const renderDirectoryListing = () => {
		const offset = (currentPage - 1) * PER_PAGE;
		selectorPopperContent.html(tpl.list({
			location: directoryListing.location,
			subDirs: directoryListing.subDirs.slice(offset, offset + PER_PAGE),
			isRoot: directoryListing.isRoot,
			canCreateDir: directoryListing.canCreateDir,
			fileMoveError: directoryListing.fileMoveError,
			isCollection: directoryListing.isCollection,
			canMoveHere: directoryListing.canMoveHere,
			pagination: simplePagination({ current: currentPage, total: totalPages }),
			isFileAlreadyInDir: mode == 'move' && getSelectedDir() === currentDir.id,
		}));
	};

	const openDir = async (dirId) => {
		const params = selectorWidget.data('params');
		const response = await Spaces.asyncApi("files.dir.select", { ...params, Dir: dirId });
		if (response.code != 0) {
			showError(Spaces.apiError(response));
			return;
		}

		currentDir = {
			id: dirId,
			widget: response.dir
		};

		totalPages = Math.ceil(response.subDirs.length / PER_PAGE);
		currentPage = 1;
		directoryListing = response;

		renderDirectoryListing();
	};

	popper.on("beforeOpen", async () => {
		selectorPopperContent.html(tpl.loader());
		await openDir(getSelectedDir());
	});

	selectorPopperContent.on('click', '.js-dir', function (e) {
		e.preventDefault();
		openDir(+this.dataset.nid);
	});
	selectorPopperContent.action('create_dir_cancel', async function (e) {
		e.preventDefault();
		renderDirectoryListing();
	});
	selectorPopperContent.action('create_dir', async function (e) {
		e.preventDefault();
		const form = selectorWidget.find('form');

		const link = $(this);
		const toggleLoading = (flag) => {
			link.find('.js-ico').toggleClass('ico_spinner', flag);
			link.toggleClass("list-link--is-disabled", flag);
		};

		const apiData = $.extend(Url.serializeForm(form), {
			D: currentDir.id,
			Type: FILE_TYPE_TO_DIR_TYPE[type],
			a: 'cd',
			cfms: 1,
			Link_id: Spaces.params.link_id
		});

		if (directoryListing.isCollection)
			apiData.Col = 1;

		toggleLoading(true);
		const response = await Spaces.asyncApi("files.createDir", apiData);
		if (response.code != 0) {
			showError(Spaces.apiError(response));
			return;
		}
		toggleLoading(false);

		if (response.dirId) {
			await openDir(response.dirId);
		} else {
			selectorPopperContent.html(response.widget);
		}
	});
	selectorPopperContent.action('dir_selector_create_dir_form', async function (e) {
		e.preventDefault();

		const apiData = {
			D: currentDir.id,
			Type: FILE_TYPE_TO_DIR_TYPE[type],
			a: 'cd',
			CK: null,
			Link_id: Spaces.params.link_id
		};

		if (directoryListing.isCollection)
			apiData.Col = 1;

		const response = await Spaces.asyncApi("files.createDir", apiData);
		if (response.code != 0) {
			showError(Spaces.apiError(response));
			return;
		}
		selectorPopperContent.html(response.widget);
	});
	selectorPopperContent.action('dir_selector_select', async function (e) {
		e.preventDefault();

		const link = $(this);
		const toggleLoading = (flag) => {
			link.find('.js-ico').toggleClass('ico_spinner', flag);
			link.toggleClass("list-link--is-disabled", flag);
		};

		toggleLoading(true);
		if (await setSelectedDir(currentDir.id, currentDir.widget))
			closeAllPoppers();
		toggleLoading(false);
	});
	selectorPopperContent.action('dir_selector_back', function (e) {
		e.preventDefault();
		openDir(+this.dataset.dirId);
	});
	selectorPopperContent.on('click', '.js-simple_pagination', async function (e) {
		e.preventDefault();
		const link = $(this);
		const direction = link.data('dir');
		if (direction == 'prev')
			currentPage--;
		if (direction == 'next')
			currentPage++;
		renderDirectoryListing();
	});

	selectorWidget.data('inited', true);
}

module.on('component', () => {
	for (const selectorWidget of document.querySelectorAll('.js-dir_selector:not([data-inited])'))
		initDirSelector($(selectorWidget));
});
