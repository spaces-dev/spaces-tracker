import cookie from '../cookie';
import { Spaces } from '../spacesLib';
import { TRANSPARENT_PIXEL } from '../utils';

const TIMEOUT = 5000;

serversChecker();

function serversChecker() {
	const checkServersList = SPACES_PARAMS.checkServers;

	if (cookie.get("Htzct"))
		return;

	let checkQueueCount = 0;
	let stat = [];
	const checkServer = (url, serverName, checkDataBit) => {
		checkQueueCount++;
		checkUrl(url + '?' + Date.now(), (success) => {
			setCookie(success, serverName, checkDataBit);
			checkQueueCount--;

			stat.push([serverName, success]);

			if (checkQueueCount == 0) {
				setTimeout(serversChecker, 60 * 1000);
				Spaces.api("files.servers.stat", {
					seRver: stat.map(row => row[0]),
					AvAilable: stat.map(row => row[1])
				});
				stat = [];
			}
		});
	};

	let mask = 0;
	for (const server in checkServersList) {
		const check = checkServersList[server];
		mask |= 1 << check.bit;
		checkServer(check.url, server, check.bit);
	}

	const flags = Number(cookie.get("Htzna1") || 0);
	if (flags != (flags & mask)) {
		console.log("Cleaning old bits, mask=" + mask + ", flags=" + flags);
		cookie.set("Htzna1", flags & mask, { expires: 3600 });
	}

	cookie.set("Htzct", 1, { expires: 15 * 60 });
}

function setCookie(success, serverName, bit) {
	let flags = Number(cookie.get("Htzna1") || 0);
	if (success) {
		flags &= ~(1 << bit);
		console.log(`server ${serverName} (#${bit}) is available`);
	} else {
		flags |= (1 << bit);
		console.log(`server ${serverName} (#${bit}) is NOT available`);
	}
	cookie.set("Htzna1", flags, { expires: 3600 });
}

function checkUrl(url, callback) {
	const check = new Image();
	check.src = url;
	check.style.cssText = 'position:fixed;top:-1px;left:-1px';
	check.width = 1;
	check.height = 1;

	const timeout = setTimeout(() => {
		check.src = TRANSPARENT_PIXEL;
		onCheckDone(false);
	}, TIMEOUT);

	const onCheckDone = (success) => {
		callback(success);
		check.parentNode.removeChild(check);
		check.onload = check.onerror = null;
		clearTimeout(timeout);
	};

	check.onload = () => onCheckDone(true);
	check.onerror = () => onCheckDone(false);
	document.body.appendChild(check);
}
