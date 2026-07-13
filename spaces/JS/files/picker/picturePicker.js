import module from 'module';
import AttachSelector from '../../widgets/attach_selector';
import { createDataSelector } from '../../utils/dom';

function initPicturePicker(pickerWidget) {
	const preview = pickerWidget.find('.js-picture_picker__preview');
	const button = pickerWidget.find(createDataSelector({ action: "picture_picker__select" }));

	const updateImageSrc = (img, src, src2x) => {
		const previewWrap = img.closest('.js-preview_wrap');
		const onLoad = () => {
			previewWrap.classList.remove('skeleton-shimmer');
			img.onload = undefined;
			img.onerror = undefined;
		};
		previewWrap.classList.add('skeleton-shimmer');
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

	const selectFile = async (file) => {
		pickerWidget.data({
			fileId: file.nid,
			fileType: file.type,
			photoArea: '',
		});

		if (file.preview)
			updateImageSrc(preview.find('.js-preview')[0], file.preview.previewURL, file.preview.previewURL_2x);

		updateFormField(file.type, file.nid);

		pickerWidget.dispatch(new CustomEvent('picturePicker:select', {
			detail: {
				fileId: file.nid,
				fileType: file.type,
			},
			bubbles: true
		}));

		AttachSelector.close();
	};

	AttachSelector.setup(preview, {
		file_type:		pickerWidget.data('fileType'),
		form:			pickerWidget,
		links:			[preview[0], button[0]].filter((v) => !!v),
		allowAlias:		true,
		max_files:		1,
		avatar:			'picker',
		linkDownload:	true,
		fix_position:	-10,
		public:			true,
		attaches:		false,
		noAutoSelect:	true,
	});

	pickerWidget.on('onNewAttach', (_e, data) => {
		selectFile(data.file);
		return false;
	});
	pickerWidget.on('AttachSelectorOpen', () => {
		const fileId = pickerWidget.data('fileId');
		const fileType = pickerWidget.data('fileType');
		setTimeout(() => AttachSelector.select(fileId, fileType), 0);
	});
}

module.on('component', () => {
	for (const pickerWidget of document.querySelectorAll('.js-picture_picker:not([data-inited])')) {
		pickerWidget.dataset.inited = "true";
		initPicturePicker($(pickerWidget));
	}
})
