import cookie from './cookie';
import {css2js} from './device';
import {L, extend, ge, ce, insert_after, light_json} from './utils';

let api_req_n = 0;

let Codes = {
	COMMON: {
		code: 0,
		SUCCESS: 0,
		ERR_NEED_CAPTCHA: 1,
		ERR_UNKNOWN_METHOD: 2,
		ERR_USER_NOT_FOUND: 3,
		ERR_WRONG_CAPTCHA_CODE: 4,
		ERR_EMPTY_MESSAGE: 5,
		ERR_UNKNOWN_ERROR: 6,
		ERR_OFTEN_OPERATION: 7,
		ERR_WRONG_CK: 8,
		ERR_SMS_NOT_SEND: 9,
		ERR_UNKNOWN_ERROR_PLEASE_RETRY: 10,
		ERR_FORBIDDEN: 11,
		ERR_BAD_REQUEST: 12,
		ERR_NEED_CONFIRM_ACTION: 13,
		ERR_USER_IN_YOUR_BLACKLIST: 14,
		ERR_YOU_IN_USER_BLACKLIST: 15,
		ERR_MESSAGE_TOO_LONG: 16,
		ERR_MESSAGE_WITH_UNPAID_STICKERS: 17,
		ERR_GCM: 18,
		ERR_USER_ACT_PHONE_NOT_FOUND: 19,
		ERR_OBJECT_NOT_FOUND: 20,
		ERR_USER_IS_OWNER: 21,
		ERR_COMM_NOT_FOUND: 22,
		ERR_WRONG_EMAIL: 23,
		ERR_WRONG_PHONE: 24,
		ERR_USER_IS_BLOCKED: 25,
		ERR_USER_IS_FROZEN: 26,
		ERR_APP_NOT_FOUND: 27,
		ERR_WML: 28,
		ERR_ADULT_CONTENT: 29,
		ERR_SPAM_CONTROL: 30,
		ERR_WRONG_OWNER: 31,
		ERR_NOT_ENOUGH_KARMA: 32,
		ERR_SMALL_RATE: 33,
		ERR_URL_NOT_FOUND: 34,
		ERR_YOU_ARE_BANNED: 35,
		ERR_OBJECT_BLOCKED: 36,
		ERR_CANCEL_CAPTCHA: 9999
	},
	AUTH: {
		code: 1,
		ERR_AUTH_REQUIRED: 1001,
		ERR_EMPTY_LOGIN_OR_PASSWORD: 1002,
		ERR_WRONG_LOGIN_OR_PASSWORD: 1003,
		ERR_SESSION_NOT_FOUND: 1004,
		ERR_USER_MODEL_NOT_CONSTRUCTED: 1005,
		ERR_AUTH_ERROR: 1006,
		ERR_ALREADY_LOGGED_IN: 1007,
		ERR_ACTIVATION_REQUIRED: 1008,
		ERR_ACCOUNT_UNFREEZE: 1009
	},
	MAIL: {
		code: 2,
		ERR_CONTACT_NOT_FOUND: 2001,
		ERR_MESSAGE_ERROR: 2002,
		ERR_SPAM_CONTROL: 2003,
		ERR_GARBAGE_IS_CLEARING: 2005,
		ERR_CONTACT_IS_SWAPPING: 2006,
		ERR_MESSAGE_NOT_FOUND: 2007,
		ERR_WRONG_EMAIL_FORMAT: 2008,
		ERR_MESSAGE_SEND_DENIED: 2009,
		ERR_DUP_MESSAGE: 2010,
		ERR_WRONG_PHONE_FORMAT: 2011,
		ERR_TOO_LARGE_ATTACHES_WEIGHT: 2012,
		ERR_SPAMING_INNER_CONTACT: 2013,
		ERR_TALK_NOT_FOUND: 2014,
		ERR_TALK_MEMBER_NOT_FOUND: 2015
	},
	REG: {
		code: 3,
		ERR_WRONG_CONTACT: 3001,
		ERR_CONTACT_ALREADY_USED: 3002,
		ERR_CONTACT_ALREADY_REGISTERED: 3003,
		ERR_IP_LIMIT_EXCEEDED: 3004,
		ERR_DOMAIN_LIMIT_EXCEEDED: 3005,
		ERR_ACTIVATION_NOT_FOUND: 3006,
		ERR_RESTORE_TYPE_REQUIRED: 3007,
		ERR_WRONG_CODE: 3008
	},
	FRIENDS: {
		code: 4,
		ERR_HIS_LIMIT_EXCEEDED: 4001,
		ERR_YOUR_LIMIT_EXCEEDED: 4002,
		ERR_OFFER_EXISTS: 4003,
		ERR_ALREADY_FRIENDS: 4004,
		ERR_OFFER_BLOCKED: 4005,
		ERR_FRIEND_NOT_FOUND: 4006,
		ERR_PENDING_NOT_FOUND: 4007,
		ERR_FROM: 4008,
		ERR_EMAIL_USED: 4009,
		ERR_INVITE_EXISTS: 4010,
		ERR_OFFER_RESTRICTED: 4011,
		ERR_SYNC_DECLINED: 4012,
		ERR_SYNC_NOT_EXIST: 4013
	},
	CHAT: {
		code: 5,
		ERR_ATTACH_SEND_DENIED: 5001,
		ERR_ROOM_NOT_FOUND: 5002,
		ERR_CONTACT_DENIED: 5003,
		ERR_BANNED: 5004,
		ERR_NEWBIE: 5005,
		ERR_FORBIDDEN: 5006,
		ERR_SHUTUP: 5007,
		ERR_MESSAGE_PARAMS: 5008,
		ERR_SPAM: 5009,
		ERR_DUP_MESSAGE: 5010,
		ERR_COMPLAIN: 5011,
		ERR_MESSAGE_NOT_FOUND: 5012,
		ERR_USER_ISNT_FRIEND: 5013,
		ERR_SMILES_LIMIT_EXCEED: 5014
	},
	FORUM: {
		code: 6,
		ERR_COMMENT_NOT_FOUND: 6001,
		ERR_TOPIC_NOT_FOUND: 6002,
		ERR_FORUM_NOT_FOUND: 6003,
		ERR_FORUM_IN_GARBAGE: 6004,
		ERR_NEED_RULE_READ: 6005
	},
	TRASH: {
		code: 7,
		ERR_OBJ_DELETED: 7001,
		ERR_OBJ_RESTORED: 7002
	},
	VOTING: {
		code: 8,
		ERR_VOTE_NOT_FOUND: 8001,
		ERR_CANT_DISLIKE: 8002
	},
	FILES: {
		code: 9,
		ERR_DIR_ACCESS_DENIED: 9001,
		ERR_FILE_NOT_FOUND: 9002,
		ERR_RESOLUTION_NOT_AVAILABLE: 9003,
		ERR_WRONG_SIZE: 9004,
		ERR_BAD_VIDEO_CONVERTER_KEY: 9005,
		ERR_UPLOAD_ERROR: 9006,
		ERR_FILE_IS_BLOCKED: 9007,
		ERR_WRONG_TYPE: 9008,
		ERR_DIR_NOT_FOUND: 9009,
		ERR_WRONG_TEMP_ID: 9010,
		ERR_STRANGER_FILE: 9011,
		ERR_EDIT: 9012,
		ERR_CANT_LOAD_PIC: 9013,
		ERR_CANT_LOAD_LINK: 9014,
		ERR_COLLECTION_NOT_FOUND: 9015,
		ERR_YOUR_FILE: 9016,
		ERR_YOUR_COLLECTION: 9017,
		ERR_NOT_CONVERTED: 9018
	},
	SEARCH: {
		code: 10,
		ERR_BAD_QUERY: 10001
	},
	LENTA: {
		code: 11,
		ERR_SUBSCR_NOT_FOUND: 11001,
		ERR_AUTHOR_IS_PRIVATE_GROUP: 11002,
		ERR_SUBSCR_ALREADY_EXISTS: 11003
	},
	GIFTS: {
		code: 12,
		ERR_GIFT_NOT_FOUND: 12001
	},
	SERVICES: {
		code: 13,
		ERR_COUNTRY_NOT_FOUND: 13001,
		ERR_REGION_NOT_FOUND: 13002,
		ERR_CITY_NOT_FOUND: 13003,
		ERR_UNIVERSITY_NOT_FOUND: 13004,
		ERR_FACULTY_NOT_FOUND: 13005,
		ERR_MOBILE_BRAND_NOT_FOUND: 13006,
		ERR_GHOST_NOT_FOUND: 13007,
		ERR_GHOST_UNCHANGED: 13008
	},
	COMPLAINTS: {
		code: 14,
		ERR_WRONG_TYPE: 14001,
		ERR_WRONG_REASON: 14002,
		ERR_COMPLAIN_DENIED: 14003,
		ERR_COMPLAINTS_EXIST: 14004,
		ERR_TIME_EXCEED: 14005,
		ERR_CNT_EXCEED: 14006
	},
	BLACKLIST: {
		code: 15,
		ERR_WRONG_TYPE: 15001,
		ERR_OBJECT_NOT_FOUND: 15002,
		ERR_SPAM_CONTROL: 15003
	},
	POLLS: {
		code: 16,
		ERR_POLL_EXIST: 16001,
		ERR_ACCESS_DENIED: 16002,
		ERR_WRONG_OWNER: 16003,
		ERR_WRONG_END_TIME: 16004,
		ERR_WRONG_VARIANT: 16005,
		ERR_VARIANTS_CNT: 16006,
		ERR_POLL_ISNT_VALIDATE: 16007,
		ERR_POLL_NOT_FOUND: 16008,
		ERR_SMALL_RATE: 16009,
		ALREADY_VOTED: 16010,
		ERR_VOTING: 16011
	},
	ATTACHES: {
		code: 17,
		ERR_ATTACH_NOT_FOUND: 17001,
		ERR_TYPE_ISNT_SUPPORTED: 17002,
		ERR_PARENT_NOT_FOUND: 17003,
		ERR_ATTACH_ALREADY_EXIST: 17004,
		ERR_WRONG_OWNER: 17005,
		ERR_MAX_COUNT: 17006,
		ERR_CHECK_ATTACH: 17007
	},
	COMM: {
		code: 18,
		ERR_BLOCKED: 18001,
		ERR_ACCESS_DENIED: 18002
	},
	COMMENTS: {
		code: 19,
		ERR_INVALID: 19001,
		ERR_NOT_FOUND: 19002,
		ERR_EDIT_TIME: 19003
	},
	JOURNAL: {
		code: 20,
		ERR_RECORD_NOT_FOUND: 20001
	}
};

let API_ERRORS = {
	// COMMON
	[Codes.COMMON.ERR_OBJECT_NOT_FOUND]:			L("Объект удалён, перезагрузите страницу."),
	[Codes.COMMON.ERR_USER_IS_FROZEN]:				L("Пользователь удалён"),
	[Codes.COMMON.ERR_USER_IS_BLOCKED]:				L("Пользователь заблокирован"),
	[Codes.COMMON.ERR_FREQ_LIMITER]:				L("Слишком частая операция. Подождите немного и попробуйте снова."),
	[Codes.COMMON.ERR_USER_NOT_FOUND]:				L("Обитатель не найден"),
	[Codes.COMMON.ERR_MESSAGE_TOO_LONG]:			L("Слишком длинное сообщение"),
	[Codes.COMMON.ERR_FORBIDDEN]:					L("Доступ запрещён"),
	[Codes.COMMON.ERR_UNKNOWN_ERROR_PLEASE_RETRY]:	L("Неизвестная ошибка, повторите"),
	[Codes.COMMON.ERR_OFTEN_OPERATION]:				L('Слишком частая операция'),
	[Codes.COMMON.ERR_USER_IN_YOUR_BLACKLIST]:		L("Обитатель находится в вашем чёрном списке"),
	[Codes.COMMON.ERR_YOU_IN_USER_BLACKLIST]:		L("Вы находитесь в чёрном списке обитателя")
};

let Spaces = {
	TYPES: {
		FILE: 5,
		MUSIC: 6,
		PICTURE: 7,
		VIDEO: 25,
		EXTERNAL_VIDEO: 82
	},
	ExternalVideo: {
		YOUTUBE: 1
	},
	KEYS: {
		ESC: 27,
		PGDOWN: 34,
		PGUP: 33,
		HOME: 36,
		END: 35,
		UP: 38,
		DOWN: 40,
		RIGHT: 39,
		LEFT: 37,
		ENTER: 10,
		MAC_ENTER: 13,
		ALT: 18
	},
	params: window.SPACES_PARAMS,
	sid: function () {
		let sid = cookie.get('sid');
		if (sid)
			return sid;
		let m = location.search.match(/sid=([^#;&]+)/);
		if (m)
			return m[1];
		return "";
	},
	api: function (method, params, callback, opts) {
		opts = extend({
			onError: null
		}, opts);
		
		if (params.method && method.indexOf('.') < 0) {
			method = method.split('.')[0] + "." + params.method;
			delete params.method;
		}
		
		params = params || {};
		params.CK = Spaces.params.CK;
		params.sid = Spaces.sid();
		
		ajax({
			url: "/api/" + method.replace(/\./g, '/') + "/?_=" + api_req_n,
			data: params,
			method: 'POST',
			dataType: 'json',
			success: function (data) {
				data.$code = data.code;
				data.code = parseInt(data.code, 10);
				data.$error = Spaces.apiError(data);
				
				if (data.code == Codes.COMMON.ERR_WRONG_CK) {
					location.reload();
					return;
				}
				
				if (data.code == Codes.AUTH.ERR_AUTH_REQUIRED) {
					location.href = "/registration/";
					return;
				}
				
				callback && callback(data);
			},
			error: function (err) {
				opts.onError && opts.onError(get_http_error(err.status));
			}
		});
		
		api_req_n++;
	},
	apiError: function (res) {
		if (res.error)
		    return res.error;
		switch (res.code) {
			case Codes.AUTH.ERR_ACTIVATION_REQUIRED:
				return L("Извините, вы не можете {0}, пока не {3}подтвердите свой аккаунт{4}. " + 
					"Если у вас возникли проблемы с подтверждением аккаунта, обратитесь в {1}Службу тех.поддержки{2}.", res.action || "это сделать",
					'<a href="/soo/support">', '</a>',
					'<a href="/registration/?Link_id=' + Spaces.params.link_id + '">', '</a>');
		}
		return API_ERRORS[res.code] || (L('Неизвестная ошибка: {0}', res.code));
	},
	showError: function (err) {
		let last = ge('#common_error');
		last && last.parentNode.removeChild(last);
		if (err) {
			let hp = ge('#header_path'),
				error = ce('div', {className: 'oh error', id: 'common_error', innerHTML: err});
			insert_after(error, hp);
			error.appendChild(ce('img', {
				src: ICONS_BASEURL + 'cross_r.gif',
				className: 'right',
				onclick: function () {
					Spaces.showError(false);
					return false;
				}
			}));
			window.scrollTo(0, 0);
		}
	}
};

/* AJAX */
let ajax_factory = [
	function () { return new XMLHttpRequest() },
	function () { return new ActiveXObject("Msxml2.XMLHTTP") },
	function () { return new ActiveXObject("Msxml3.XMLHTTP") },
	function () { return new ActiveXObject("Microsoft.XMLHTTP") }
];

export function ajax(opts) {
	opts = extend({
		method: 'GET',
		url: '',
		data: {},
		success: null,
		error: null,
		always: null,
		dataType: "raw"
	}, opts);
	
	let xhr;
	for (let i = 0; i < ajax_factory.length; ++i) {
		try { xhr = ajax_factory[i](); } catch (e) { }
	}
	if (!xhr)
		return false;
	let form_data = opts.data ? serialize_query(opts.data) : "";
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			xhr.onreadystatechange = function () { };
			
			let status = 0, statusText = '', responseText;
			try { status = xhr.status; } catch (e) { }
			try { statusText = xhr.statusText; } catch (e) { }
			try { responseText = xhr.responseText; } catch (e) { }
			
			let error = !(status >= 200 && status < 300);
			if (opts.dataType == 'json') {
				try {
					responseText = window.JSON ? JSON.parse(responseText) : light_json(responseText);
				} catch (e) {
					error = true;
				}
			}
			
			opts.always && opts.always();
			if (!error) {
				opts.success && opts.success(responseText, {
					status: status,
					statusText: statusText
				});
			} else {
				opts.error && opts.error({
					responseText: responseText,
					status: status,
					statusText: statusText
				});
			}
		}
	}
	xhr.open(opts.method, opts.url, true);
	try { xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded'); } catch (e) { }
	try { xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest'); } catch (e) { }
	xhr.send(form_data);
	
	return xhr;
}

export function get_http_error(code) {
	switch (code) {
		case 501: case 502: case 503: case 504: case 403: case 404:
			return L('Внимание! На {0} в данный момент проводятся технические работы!', Spaces.params.Domain);
		case 500: case 525:
			return L('Внимание! При выполнении вашего запроса, произошла внутренняя ошибка сервера!<br />' + 
				'Попробуйте сейчас обновить страницу, и, если ошибка повторяется, немедленно сообщите об этом в сообществе <a href="/soo/support">support</a><br />' + 
				'Опишите подробно, где произошла данная ошибка, в какой момент, и что нужно сделать для того, чтобы повторить данную ошибку. <br />' + 
				'Спасибо вам за помощь в нахождении ошибок на сайте!<br />');
		case 0:
			return L("Ошибка подключения. Проверьте ваше подключение к интернету. ");
		default:
			return L('При выполнении вашего запроса произошла ошибка HTTP: {0}', code);
	}
}

export function node_data(el) {
	let attrs = el.attributes, ret = {};
	for (let i = 0; i < attrs.length; ++i) {
		if (attrs[i].name.indexOf('data-') == 0)
			ret[css2js(attrs[i].name.substr(5))] = attrs[i].value;
	}
	return ret;
}

export function serialize_query(query, sep) {
	sep = sep || '&';
	let out = [];
	for (let key in query) {
		let val = query[key];
		if (val === undefined)
			continue;
		if (typeof val == 'boolean')
			val = val ? 1 : 0;
		if ((val instanceof Array)) {
			for (let i = 0, l = val.length; i < l; ++i)
				out.push(key + '=' + encodeURIComponent(val[i]));
		} else {
			out.push(key + '=' + encodeURIComponent(val));
		}
	}
	return out.join(sep);
}

export function safe_uri_decode(str) {
	return decodeURIComponent(str.replace(/%([^a-f0-9]{1,2}|$)/gi, "%25$1").replace(/\+/g, ' '));
}

export function parse_query(query) {
	let parts = query.split(/&amp;|&|;/), out = {}, m;
	for (let i = 0, l = parts.length; i < l; ++i) {
		if ((m = parts[i].match(/^([^=]+)=?(.*)$/))) {
			let key = m[1], value = safe_uri_decode(m[2] || "");
			if (key in out) {
				if (!(out[key] instanceof Array))
					out[key] = [out[key]];
				out[key].push(value);
			} else {
				out[key] = value;
			}
		}
	}
	return out;
}

export {Spaces, Codes};
