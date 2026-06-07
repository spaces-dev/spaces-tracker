import module from 'module';
import { closeAllPoppers, getPopperById } from '../widgets/popper';
import { Spaces } from '../spacesLib';
import $ from '../jquery';
import { L } from '../utils';
import { simplePagination } from '../widgets/fragments/simplePagination';
import { showToast } from '../widgets/toaster';

const PER_PAGE = 5;

const tpl = {
	list({ parentDirs, dirs, pagination }) {
		const curDir = parentDirs[parentDirs.length - 1];
		const prevDir = parentDirs.length > 1 ? parentDirs[parentDirs.length - 2] : 0;
		const isRoot = curDir.shared_dir === 0;

		return `
			<div class="dir-selector dropdown-content">
				<div class="dir-selector__location">
					<button
						class="
							js-action_link dir-selector__location-button use-icon-state
							${isRoot ? 'dir-selector__location-button--is-disabled' : ''}
						"
						data-action="sz_dir_selector_back"
						data-dir-id="${prevDir.shared_dir}"
						title="${L('Перейти назад')}"
					>
						<span class="js-ico ico-alone ico ico_arr_left"></span>
					</button>
					<div class="dir-selector__location-title">
						<span class="ico_files ico_files_dir"></span>
						${curDir.name}
					</div>
					<div class="dir-selector__location-space"></div>
				</div>
				<div class="dir-selector__list">
					${dirs.join("")}
				</div>
				${pagination}
			</div>
		`;
	},
	addConfirmation({ parentDirs, addMessage }) {
		const curDir = parentDirs[parentDirs.length - 1];
		const prevDir = parentDirs.length > 1 ? parentDirs[parentDirs.length - 2] : 0;
		const isRoot = curDir.shared_dir === 0;

		return `
			<div class="dir-selector dropdown-content">
				<div class="dir-selector__location">
					<button
						class="
							js-action_link dir-selector__location-button use-icon-state
							${isRoot ? 'dir-selector__location-button--is-disabled' : ''}
						"
						data-action="sz_dir_selector_back"
						data-dir-id="${prevDir.shared_dir}"
						title="${L('Перейти назад')}"
					>
						<span class="js-ico ico-alone ico ico_arr_left"></span>
					</button>
					<div class="dir-selector__location-title">
						<span class="ico_files ico_files_dir"></span>
						${curDir.name}
					</div>
					<div class="dir-selector__location-space"></div>
				</div>
				<div class="dir-selector__message">
					${addMessage}
				</div>
				<div class="button-group">
					<div class="button-group__item">
						<div
							class="js-action_link list-link list-link-blue list-link--short list-link_last t_center"
							data-action="sz_dir_selector_select"
						>
							<span class="ico ico_ok_blue js-ico"></span>
							${L("Да")}
						</div>
					</div>
					<div class="button-group__item">
						<div
							class="js-action_link list-link list-link-grey list-link--short list-link_last t_center"
							data-action="sz_dir_selector_back"
							data-dir-id="${prevDir.shared_dir}"
						>
							${L("Нет")}
						</div>
					</div>
				</div>
			</div>
		`;
	},
	sharedZoneInfo({ addShZDirLink, changeShZDirLink, unshareLink, shZDirs }) {
		return `
			${changeShZDirLink ? `
				<span class="right" style="margin-left: 25px">
					${changeShZDirLink}
				</span>
			` : ``}

			${L("Зона обмена:")} ${shZDirs || addShZDirLink}
			${unshareLink ?? ''}
		`;
	},
	loader() {
		return `
			<div class="dropdown-content dir-selector">
				<div class="dir-selector__empty">
					<span class="ico ico_spinner"></span>
					${L('Загрузка....')}
				</div>
			</div>
		`;
	},
	message(msg) {
		return `
			<div class="dropdown-content">
				<div class="content-item3 content-bl__sep grey">
					${msg}
				</div>
				<div class="js-popper_close list-link list-link-grey list-link--short list-link_last t_center">
					<span class="ico ico_remove"></span>
					${L('Закрыть')}
				</div>
			</div>
		`;
	},
	error(errMsg) {
		return `
			<div class="dropdown-content">
				<div class="content-item3 content-bl__sep red">
					${errMsg}
				</div>
				<div class="js-popper_close list-link list-link-grey list-link--short list-link_last t_center">
					<span class="ico ico_remove"></span>
					${L('Закрыть')}
				</div>
			</div>
		`;
	}
};

function initDirSelector(selectorWidget) {
	let currentDir;
	const popper = getPopperById(selectorWidget.find('.js-sz_dir_selector_popper').prop("id"));
	const selectorPopperContent = $(popper.content());
	const mode = selectorWidget.data('mode');
	let currentPage = 1;
	let totalPages = 0;
	let directoryListing;

	const showError = (error) => {
		selectorPopperContent.html(tpl.error(error));
	};

	const showMessage = (msg) => {
		selectorPopperContent.html(tpl.message(msg));
	};

	const setSelectedDir = async (dirId, dirWidget) => {
		if (mode == 'form-field') {
			selectorWidget.find('.js-sz_dir_selector_value').val(dirId);
			$(popper.opener()).html(dirWidget);
			Spaces.view.setInputError(selectorWidget, false);
		} else if (mode == 'move') {
			const params = selectorWidget.data('params');
			const response = await Spaces.asyncApi("shared_zone.addFile", {
				...params,
				D: dirId,
				CK: null,
			});
			if (response.code != 0) {
				showError(Spaces.apiError(response));
				return false;
			}

			if (response.message) {
				showToast({
					id: "sz_selector",
					severity: "info",
					text: response.message,
				});
			}

			selectorWidget.data('value', dirId);
			$(selectorWidget.data('currentDirView')).html(tpl.sharedZoneInfo(response));
		}
		return true;
	};

	const renderDirectoryListing = () => {
		const offset = (currentPage - 1) * PER_PAGE;
		selectorPopperContent.html(tpl.list({
			parentDirs: directoryListing.parentDirs,
			dirs: directoryListing.dirs.slice(offset, offset + PER_PAGE),
			pagination: simplePagination({ current: currentPage, total: totalPages }),
		}));
	};

	const openDir = async (dirId) => {
		const params = selectorWidget.data('params');
		const response = await Spaces.asyncApi("shared_zone.listForAdd", { ...params, D: dirId });
		if (response.code != 0) {
			showError(Spaces.apiError(response));
			return;
		}

		currentDir = {
			id: dirId,
			widget: response.dir
		};

		if (response.canAdd) {
			selectorPopperContent.html(tpl.addConfirmation({
				parentDirs: response.parentDirs,
				addMessage: response.addMessage,
			}));
		} else {
			totalPages = Math.ceil(response.dirs.length / PER_PAGE);
			currentPage = 1;
			directoryListing = response;

			renderDirectoryListing();
		}
	};

	const checkForAdd = async () => {
		const params = selectorWidget.data('params');
		const response = await Spaces.asyncApi("shared_zone.checkFileForAdd", { ...params });
		if (response.code != 0) {
			if (response.error) {
				showMessage(response.error);
			} else {
				showError(Spaces.apiError(response));
			}
			return false;
		}
		if (response.karmaNotice) {
			showMessage(response.karmaNotice);
			return false;
		}
		return true;
	};

	popper.on("beforeOpen", async () => {
		selectorPopperContent.html(tpl.loader());
		if (!await checkForAdd())
			return;
		await openDir(0); // Всегда открываем корень
	});

	selectorPopperContent.on('click', '.js-dir', function (e) {
		e.preventDefault();
		openDir(+this.dataset.nid);
	});
	selectorPopperContent.action('sz_dir_selector_select', async function (e) {
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
	selectorPopperContent.action('sz_dir_selector_back', function (e) {
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
	for (const selectorWidget of document.querySelectorAll('.js-sz_dir_selector:not([data-inited])'))
		initDirSelector($(selectorWidget));
});

module.on('componentpage', () => {
	$('body').action('sz_file_delete sz_file_add', async function (e) {
		e.preventDefault();

		const link = $(this);

		if (link.data('busy'))
			return;

		const toggleLoading = (flag) => {
			link.find('.js-ico').toggleClass('ico_spinner', flag);
			link.data('busy', flag);
		};

		toggleLoading(true);
		const method = e.linkAction == 'sz_file_add' ? "shared_zone.addFile" : "shared_zone.deleteFile";
		const response = await Spaces.asyncApi(method, { ...link.data('params'), CK: null });
		toggleLoading(false);

		if (response.code === 0) {
			$('#file_share_current_dir').html(tpl.sharedZoneInfo(response));

			if (response.message) {
				showToast({
					id: "sz_selector",
					severity: "info",
					text: response.message,
				});
			}
		} else {
			showToast({
				id: "sz_selector",
				severity: "error",
				text: Spaces.apiError(response),
			});
		}
	}, '.onRequest');
});
