import SpacesApp from '../android/api';

function canShareInApp() {
	return SpacesApp && SpacesApp.params && SpacesApp.params.nativeShare;
}

export function canShare() {
	return typeof navigator.share === 'function' || canShareInApp();
}

export function share(data) {
	if (typeof navigator.share === 'function')
		return navigator.share(data);

	if (canShareInApp())
		return SpacesApp.exec('share', data);
}
