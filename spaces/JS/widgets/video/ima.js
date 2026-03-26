import { loadScript, windowReady } from 'loader';

let imaSdkPromise;
let imaSdkLoaded = false;

export async function loadGoogleImaSdk() {
	if (imaSdkLoaded)
		return;
	if (!imaSdkPromise) {
		imaSdkPromise = new Promise((resolve, reject) => {
			windowReady(() => loadScript('//imasdk.googleapis.com/js/sdkloader/ima3.js', resolve, reject));
		});
		imaSdkPromise.then(() => {
			imaSdkLoaded = true;
			imaSdkPromise = null;
			console.log("[IMA SDK] loaded!", Date.now() - SPACES_LOAD_START);
		}).catch(() => {
			imaSdkPromise = null;
		});
	}
	return await imaSdkPromise;
}
