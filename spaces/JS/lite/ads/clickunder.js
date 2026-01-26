import {Spaces} from '../core';

let already_run = false;
let video_cu_url;
let user_agent = navigator.userAgent;
let cu_installed = false;
let cu_click_block;
let cu_sended = {};
let cu_timeout;

function initOnPlay(go, type) {
	if (!document.querySelector || !document.body.addEventListener)
		return;
	
	if (go) {
		checkClickunder('go', type)
	} else {
		let player = document.querySelector('video[id^="player_"]');
		if (player)
			player.addEventListener('play', () => checkClickunder('play', type), false);
		
		let player_block = document.querySelector('.js-video_player_block');
		if (player_block)
			player_block.onExternalVieoPlay = () => checkClickunder('play', type);
		
		let download_wrap = document.querySelector('[id^="download_wrap_"]');
		if (download_wrap)
			download_wrap.addEventListener('click', () => checkClickunder('download', type), false);
	}
}

function checkClickunder(action, type) {
	if (cu_sended[`${type}:${action}`] || cu_installed)
		return;
	
	cu_sended[`${type}:${action}`] = true;
	
	let method = (action == 'go' ? "ama1k3r.onNeed2Go" : "ama1k3r.onCl1ckCU");
	Spaces.api(method, {action: action, type: type}, (res) => {
		if (res.code == 0) {
			let url = res.goURL;
			if (url)
				installClickunder(url);
		} else {
			console.error(`[spcu] ${Spaces.apiError(res)}`);
		}
	}, {
		onError(err) {
			console.error(`[spcu] ${err}`);
		}
	})
}

function installClickunder(url) {
	video_cu_url = url;
	cu_installed = true;
	cu_timeout = Date.now() + timeout * 1000;
	
	if (document.attachEvent) {
		document.attachEvent('onclick', openClickunderEV);
	} else if (document.addEventListener) {
		document.addEventListener('click', openClickunderEV, false);
	}
}

function openWindow(old_url, new_url) {
	if (user_agent.match(/Safari/) && !user_agent.match(/Chrome/) && !user_agent.match(/(Android|Adr)/i)) {
		let a = document.createElement('a');
		a.setAttribute("href", old_url);
		a.setAttribute("target", "_blank");
		
		let dispatch = document.createEvent("HTMLEvents");
		dispatch.initEvent("click", true, true);
		a.dispatchEvent(dispatch);
		
		setTimeout(function () {
			window.location = new_url;
		}, 100);
	} else if (user_agent.match(/IE|Trident/)) {
		window.open(new_url, 'spcu', 'toolbar=0,statusbar=1,resizable=1,scrollbars=1,menubar=0,location=1,directories=0,height=755,width=1025');
		setTimeout(window.focus, 0);
		window.focus();
		
		setTimeout(function() {
			let a = window.open("about:blank");
			a.focus();
			a.close();
			window.focus()
		}, 200);
		
		return false;
	} else {
		setTimeout(function() {
			window.location = new_url;
		}, 200);
		window.open(old_url);
	}
	
	return true;
}

function openClickunder(old_url, new_url) {
	if (already_run)
		return false;
	
	already_run = true;
	
	if (openWindow(old_url, new_url))
		return true;
	
	return false;
}

function parseMainDomain(href) {
	let m = href.match(/^(?:http|https):\/\/(?:[\w\d_.-]+\.)?([\w\d_-]+\.[\w\d_-]+)(?:[\/#?]|$)/i);
	return m && m[1];
}

function containsChild(parent, child) {
	while (child) {
		if (child.parentNode == parent)
			return true;
		child = child.parentNode;
	}
	return false;
}

function openClickunderEV(e) {
	if (e.defaultPrevented && e.defaultPrevented())
		return;
	
	if (e.returnValue === false)
		return;
	
	if (Date.now() >= cu_timeout)
		return;
	
	let link_el = e.target;
	while (link_el && link_el.nodeName != "A" && link_el.nodeName != "UC-CLICK")
		link_el = link_el.parentNode;
	
	if (link_el) {
		if (cu_click_block) {
			let block = document.getElementById(cu_click_block);
			if (!block || !containsChild(block, link_el))
				return;
		}
		
		let link_href = link_el.getAttribute("href");
		
		let link_domain = parseMainDomain(link_href),
			curr_domain = parseMainDomain(location.href);
		
		if (!link_domain || link_domain != curr_domain)
			return;
		
		if (openClickunder(link_href || location.href, video_cu_url))
			e.preventDefault && e.preventDefault();
	}
	
	if (document.detachEvent) {
		document.detachEvent('onclick', openClickunderEV);
	} else if (document.removeEventListener) {
		document.removeEventListener('click', openClickunderEV);
	}
}

export {initOnPlay};
