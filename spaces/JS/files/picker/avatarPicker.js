import module from 'module';
import AttachSelector from '../../widgets/attach_selector';
import Spaces from '../../spacesLib';
import { showToast } from '../../widgets/toaster';
import { getNearestPopper, getPopperById, Popper } from '../../widgets/popper';
import { createDataSelector } from '../../utils/dom';

const AVATAR_CONFIG = {
	// Аватарка юзера
	[Spaces.TYPES.USER]: {
		api: {
			edit: "anketa.photoEdit",
			remove: "anketa.photoDelete"
		},
		params: {
			owner: "User",
			photo: "Photo",
			curPhoto: "avatar",
			defPhoto: "default_avatar",
			uplPhoto: "upload_avatar"
		},
		ownAvatar: true,
		selector: '.js-my_avatar',
		selectorParams: {
			avatar: 'user'
		}
	},

	// Аватарка сообщества
	[Spaces.TYPES.COMM]: {
		api: {
			edit: "comm.logoEdit",
			remove: "comm.logoDelete"
		},
		params: {
			owner: "Comm",
			photo: "Logo",
			curPhoto: "logo",
			defPhoto: "default_logo",
			uplPhoto: "upload_logo"
		},
		ownerParam: 'comm',
		selectorParams: {
			only_comm: true,
			avatar: 'comm'
		}
	},

	// Обложка беседы
	[Spaces.TYPES.MAIL_TALK]: {
		api: {
			edit: "mail.talkAvatarEdit",
			remove: "mail.talkAvatarDelete"
		},
		params: {
			owner: "Talk",
			photo: "Avatar",
			curPhoto: "avatar",
			defPhoto: "default_avatar",
			uplPhoto: "default_avatar"
		},
		ownerParam: 'talk',
		selectorParams: {
			avatar: 'mail',
			dir: 0,
		}
	},
};

function initAvatarPicker(pickerWidget) {
	const ownerId = pickerWidget.data('ownerId');
	const ownerType = pickerWidget.data('ownerType');
	const config = AVATAR_CONFIG[ownerType];
	let editorWidnow;
	let generatorWindow;
	let lastAvatarSelect = 0;

	const preview = pickerWidget.find('.js-avatar_picker__preview');
	const button = pickerWidget.find(createDataSelector({ action: "avatar_picker__select" }));

	const updateFunctionsList = () => {
		const hasAvatar = pickerWidget.data('fileId') > 0;
		pickerWidget.find(createDataSelector({ action: 'avatar_picker__crop' })).toggleClass('hide', !hasAvatar);
		pickerWidget.find(createDataSelector({ action: 'avatar_picker__delete' })).toggleClass('hide', !hasAvatar);
	};

	const getOtherAvatarImages = () => {
		const images = [];
		if (config.selector) {
			const selector = `${config.selector.replace('%d', ownerId)} .js-preview`;
			images.push(...document.querySelectorAll(selector));
		}
		return images;
	};

	const setAvatarLoading = (flag) => {
		const images = [preview.find('.js-preview')[0], ...getOtherAvatarImages()];
		for (const img of images) {
			const previewWrap = img.closest('.js-preview_wrap');
			previewWrap.classList.toggle('skeleton-shimmer', flag);
		}
	};

	const updateImageSrc = (img, src, src2x, isStub) => {
		const previewWrap = img.closest('.js-preview_wrap');
		const onLoad = () => {
			previewWrap.classList.remove('skeleton-shimmer');
			img.classList.toggle('preview--stub', isStub);
			img.onload = undefined;
			img.onerror = undefined;
		};
		img.onload = onLoad;
		img.onerror = onLoad;
		img.src = src;
		img.srcset = src2x ? `${src}, ${src2x} 1.5x` : '';
	};

	const updateFormField = (fileType, fileId) => {
		const formWidget = pickerWidget.parents('.js-file_select_fw');
		if (!formWidget.length)
			return;
		formWidget.find('.js-file_select_fw__type').val(fileType);
		formWidget.find('.js-file_select_fw__id').val(fileId);
	};

	const selectAvatar = async (fileId) => {
		const apiMethod = fileId ? config.api.edit : config.api.remove;
		const apiData = {
			[config.params.owner]: ownerId,
			[config.params.photo]: fileId,
			CK: null,
		};

		lastAvatarSelect = Date.now();

		setAvatarLoading(true);
		const response = await Spaces.asyncApi(apiMethod, apiData);
		if (response.code != 0) {
			setAvatarLoading(false);
			showToast({
				severity: "error",
				text: Spaces.apiError(response),
			});
			return;
		}

		pickerWidget.data({
			preview: response.choose_area,
			preview2x: response.choose_area_2x,
			rotate: response.rotate,
			fileId: fileId,
			photoArea: '',
		});

		const pickerPreviewSrc = fileId ? response[config.params.curPhoto] : response[config.params.uplPhoto];
		const pickerPreviewSrc2x = fileId ? response[`${config.params.curPhoto}_2x`] : response[`${config.params.uplPhoto}_2x`];
		updateImageSrc(preview.find('.js-preview')[0], pickerPreviewSrc, pickerPreviewSrc2x, fileId > 0);

		const avatarPreviewSrc = fileId ? response[config.params.curPhoto] : response[config.params.defPhoto];
		const avatarPreviewSrc2x = fileId ? response[`${config.params.curPhoto}_2x`] : response[`${config.params.defPhoto}_2x`];
		for (const img of getOtherAvatarImages())
			updateImageSrc(img, avatarPreviewSrc, avatarPreviewSrc2x, fileId > 0);

		updateFunctionsList();
		updateFormField(Spaces.TYPES.PICTURE, fileId);

		pickerWidget.dispatch(new CustomEvent('avatarPicker:select', {
			detail: {
				fileId,
				fileType: Spaces.TYPES.PICTURE,
			},
			bubbles: true
		}));
	};

	if (ownerType == Spaces.TYPES.USER) {
		$('#main').on('ownAvatarUpdate', function (e) {
			if (Date.now() - lastAvatarSelect < 5000)
				e.preventDefault();
		});
	}

	const ownerParam = config.ownerParam;
	AttachSelector.setup(preview, {
		file_type:		Spaces.TYPES.PICTURE,
		form:			pickerWidget,
		buttons:		pickerWidget.find('.js-avatar_picker__buttons'),
		uploadButtons:	pickerWidget.find('.js-avatar_picker__upload_buttons'),
		links:			[preview[0], button[0]].filter((v) => !!v),
		allowAlias:		true,
		max_files:		1,
		avatar:			config.avatarType,
		linkDownload:	true,
		fix_position:	-10,
		public:			true,
		attaches:		false,
		noAutoSelect:	true,
		[ownerParam]:	ownerId,
		...config.selectorParams
	});

	pickerWidget.on('onNewAttach', (_e, data) => {
		selectAvatar(data.file.nid);
		return false;
	});
	pickerWidget.on('AttachSelectorOpen', () => {
		const photoId = pickerWidget.data('fileId');
		updateFunctionsList();
		setTimeout(() => AttachSelector.select(photoId, Spaces.TYPES.PICTURE), 0);
	});
	pickerWidget.action('avatar_picker__delete', (e) => {
		e.preventDefault();
		AttachSelector.select(0, Spaces.TYPES.PICTURE);
		selectAvatar(0);
		AttachSelector.close();
	});
	pickerWidget.action('avatar_picker__crop', async function (e) {
		e.preventDefault();

		const opener = getNearestPopper(this).opener();
		const link = $(this);
		link.addClass('disabled').find('.js-ico').addClass('ico_spinner');

		const { default: AvatarCrop } = await import("../../avatar_crop");
		if (!editorWidnow) {
			const att = AttachSelector.instance(this);
			const windowElement = document.createElement('div');
			windowElement.className = 'popper-dropdown';
			att.getForm().append(windowElement);

			editorWidnow = new Popper(windowElement);
			editorWidnow.on('afterClose', () => AvatarCrop.destroy(editorWidnow.$content()));
		}

		AvatarCrop.setup(
			$(editorWidnow.content()),
			{
				image: pickerWidget.data("preview"),
				image_2x: pickerWidget.data("preview2x"),
				area: pickerWidget.data("photoArea"),
				rotate: pickerWidget.data("rotate"),
				onAvatarCrop(src, src2x, area) {
					pickerWidget.data("photoArea", area);
					setAvatarLoading(true);
					updateImageSrc(preview.find('.js-preview')[0], src, src2x);
					for (const img of getOtherAvatarImages())
						updateImageSrc(img, src, src2x);
				}
			},
			() => editorWidnow.open({}, opener)
		);
	});
	pickerWidget.action('avatar_picker__ai', async function (e) {
		e.preventDefault();

		const opener = getNearestPopper(this).opener();
		const link = $(this);
		link.addClass('disabled').find('.js-ico').addClass('ico_spinner');

		const { default: PicGenerator } = await import("../../pic_generator");
		if (!generatorWindow) {
			const att = AttachSelector.instance(this);
			const windowElement = document.createElement('div');
			windowElement.className = 'popper-dropdown';
			att.getForm().append(windowElement);

			generatorWindow = new Popper(windowElement);
			generatorWindow.on('afterClose', () => PicGenerator.destroy());
		}

		PicGenerator.init(
			$(generatorWindow.content()),
			{
				type: 'avatar',
				onInit() {
					generatorWindow.open({}, opener);
				},
				onSelect(fileId) {
					selectAvatar(fileId);
				},
				onCancel() {
					const parentPopperId = opener.dataset.popperId;
					getPopperById(parentPopperId)?.open({}, opener);
				}
			}
		);
	});
}

module.on('component', () => {
	for (const pickerWidget of document.querySelectorAll('.js-avatar_picker:not([data-inited])')) {
		pickerWidget.dataset.inited = "true";
		initAvatarPicker($(pickerWidget));
	}
})
