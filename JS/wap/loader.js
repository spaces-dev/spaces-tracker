/*
Modules Loader (WAP)

Используемые глобальные переменные:
BASE_URL				|	Базовый URL для JS
MAIN_REVISION			|	Базовая ревизия
__require				|	Загрузка модулей: __require.push(['module1', 'module1'], callback, errback)
__components			|	Загрузка модулей: __components.push('module-name')
__define				|	Объявление модулей: __define.push('module1', ['dep1', 'dep2'], function (dep1, dep2) { })
__require_loaded		|	Список статики, которая загружается из <head>
__require_config		|	Конфиг загрузчика
*/
(function (window, document, JS_URL, CSS_URL, MAIN_REVISION) {
	"use strict";
	
	const LOADER_DEBUG = false;
	
	let modules_cache = {};
	let modules_loading = {};
		
	let require_queue = [];
	let require_queue_task;
		
	let require_defer = {};
	let require_defer_id = 0;
		
	let define_defer = {};
	let payload_loaded = {};
	
	let module_to_chunk = {};
	let module_to_preload = {};
	let module_to_revision = {};
	
	let scripts_loaded = {};
	let head_ref;
	
	function getModule(name) {
		return (modules_cache[name] = {
			id:			name,
			loaded:		false,
			exports:	{},
			meta:		{}
		});
	}
	
	/*
		Require modules
	*/
	function require(names, callback, errback, context) {
		if (typeof names == "string")
			names = [names];
		
		require_queue.push([names, callback, errback, context]);
		if (!require_queue_task)
			require_queue_task = tick(requrieTask);
	}
	
	function requrieTask() {
		let argv = require_queue.shift();
		if (require_queue.length) {
			tick(requrieTask);
		} else {
			require_queue_task = false;
		}
		
		requireAsync.apply(null, argv);
	}
	
	function requireFromCache(name, callback) {
		if (modules_cache[name]) {
			callback && callback(modules_cache[name].exports);
			return modules_cache[name].exports;
		}
		return null;
	}
	
	function requireAsync(names, callback, errback, context) {
		let parent_module = context && context.parent && (modules_cache[context.parent] || getModule(context.parent));
		let imports = [];
		let not_loaded = 0;
		
		// Встроенные модули
		let builtin = {
			// Возвращает текущий модуль
			module:		parent_module && {default: parent_module},
			// Возвращает экспорты текущего модуля
			exports:	parent_module && parent_module.exports,
			// Возвращает require()
			require:	require,
			// Возвращает некоторые полезные встроенные функции в качестве модуля "loader"
			loader:		{loadScript, tick, clearTick, domReady, windowReady}
		};
		
		for (let i = 0, l = names.length; i < l; i++) {
			let name = names[i];
			if (builtin[name]) {
				callback && imports.push(builtin[name]);
			} else if (name[0] == ">") {
				imports.push({default: window[name.substr(1)]});
			} else {
				let module = modules_cache[name] || getModule(name);
				if (!module.loaded) {
					not_loaded++;
					
					if (LOADER_DEBUG) {
						if (parent_module) {
							console.log('[require] ' + name + ' (from ' + parent_module.id + ')');
						} else {
							console.log('[require] ' + name);
						}
					}
					
					if (!modules_loading[name]) {
						modules_loading[name] = [];
						
						if (define_defer[name]) {
							define.apply(null, define_defer[name]);
							delete define_defer[name];
						} else {
							loadModuleAsset(name);
						}
						
						if (module_to_preload[name]) {
							require(module_to_preload[name]);
							delete module_to_preload[name];
						}
					}
					
					if (callback || errback || context)
						modules_loading[name].push(require_defer_id);
				}
				
				callback && imports.push(module.exports);
			}
		}
		
		if (not_loaded) {
			if (callback || errback || context) {
				require_defer[require_defer_id++] = [
					[names, callback, errback, context],
					not_loaded
				];
			}
		} else {
			callback && callback.apply(null, imports);
		}
	}
	
	/*
		Define modules
	*/
	function define(name, dep_names, callback) {
		payload_loaded[name] = true;
		
		if (modules_loading[name]) {
			let initializer = function () {
				defineAsync(name, Array.prototype.slice.call(arguments, 0), callback);
			};
			if (dep_names && dep_names.length) {
				require(dep_names, initializer, false, {parent: name});
			} else {
				tick(initializer);
			}
		} else {
			define_defer[name] = [name, dep_names, callback];
		}
	}
	
	function defineAsync(name, imports, callback) {
		let module = modules_cache[name] || getModule(name);
		if (!module.loaded) {
			let result = typeof callback == 'function' ? callback.apply(module.exports, imports) : callback;
			if (result !== undefined)
				module.exports = result;
			
			module.loaded = true;
			
			let requires = modules_loading[name];
			while (requires.length) {
				let require_request_id = requires.pop(),
					require_request = require_defer[require_request_id];
				if (require_request) {
					require_request[1]--;
					
					if (!require_request[1]) {
						require.apply(null, require_request[0]);
						delete require_defer[require_request_id];
					}
				}
			}
			
			delete modules_loading[name];
		}
	}
	
	function getHead() {
		head_ref = head_ref || document.head || document.getElementsByTagName('head')[0];
		return head_ref;
	}
	
	function loadModuleAsset(name) {
		if (LOADER_DEBUG) {
			if (module_to_chunk[name])
				console.log('[chunks] load ' + name + ' from ' + module_to_chunk[name]);
		}
		
		name = module_to_chunk[name] || name;
		
		if (scripts_loaded[name])
			return;
		
		scripts_loaded[name] = 1;
		
		loadScript(JS_URL + '/' + name + '.js?' + MAIN_REVISION + (module_to_revision[name] || Date.now()));
	}
	
	// Загрузчик скриптов
	function loadScript(src, callback, errback) {
		let script = document.createElement('script');
		script.src = src;
		script.type = "text/javascript";
		script.async = true;
		
		if (callback) {
			let onload_called = false;
			script.onload = () => {
				if (!onload_called) {
					callback && callback(script);
					onload_called = true;
					script.onerror = script.onload = script.onreadystatechange = null;
				}
			};
			script.onreadystatechange = () => {
				if (/^(complete|loaded)$/.test(script.readyState))
					script.onload && script.onload();
			};
		}
		
		if (errback) {
			let onerror_called = false;
			script.onerror = (e) => {
				if (!onerror_called) {
					errback && errback(e);
					onerror_called = true;
					script.onerror = script.onload = script.onreadystatechange = null;
				}
			};
		}
		
		getHead().appendChild(script);
		
		return script;
	}
	
	function resolveDefer(symbol, callback, new_object, is_array) {
		let queue = window[symbol];
		if (queue && queue.push) {
			if (is_array) {
				while (queue.length) {
					if (!queue.pop)
						console.error(symbol, queue);
					let argv = queue.pop();
					callback(argv[0], argv[1], argv[2], argv[3]);
				}
			} else {
				while (queue.length)
					callback(queue.pop());
			}
		}
		window[symbol] = new_object;
	}
	
	function isDomReady() {
		let state = document.readyState;
		return state === "complete"  || state === "loaded" || state === "interactive";
	}
	
	function domReady(callback) {
		if (isDomReady()) {
			tick(callback);
		} else if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', () => tick(callback), false);
		} else if (document.attachEvent) {
			document.attachEvent("onreadystatechange", () => {
				if (isDomReady())
					tick(callback);
			});
		} else {
			tick(callback);
		}
	}

	function windowReady(callback) {
		if (document.readyState === "complete") {
			setTimeout(callback, 0);
		} else {
			if (window.addEventListener) {
				window.addEventListener('load', callback, false);
			} else {
				domReady(callback);
			}
		}
	}

	function tick(callback) {
		return setTimeout(callback, 0);
	}
	
	function clearTick(id) {
		return clearTimeout(id);
	}
	
	function useConfig(names, revisions, preloads, chunks) {
		for (let i = 0, l = revisions.length; i < l; i++)
			module_to_revision[names[i]] = revisions[i];
		
		for (let i = 0, l = preloads.length; i < l; i++) {
			let preload = preloads[i];
			let preload_list = [];
			for (let j = 0, lj = preload[1].length; j < lj; j++)
				preload_list.push(names[preload[1][j]]);
			module_to_preload[names[preload[0]]] = preload_list;
		}
		
		for (let i = 0, l = chunks.length; i < l; i++) {
			let chunk = chunks[i];
			module_to_revision[chunk[0]] = chunk[2];
			for (let j = 0, lj = chunk[1].length; j < lj; j++)
				module_to_chunk[names[chunk[1][j]]] = chunk[0];
		}
	}
	
	function init() {
		require.default = require;
		
		// Загрузка компонентов
		require.loaded = requireFromCache;
		
		// Кэш
		require.cache = modules_cache;
		
		// require(modules, callback, errback)
		require.push = (argv) => {
			return require(argv[0], argv[1], argv[2], argv[3]);
		};
		
		domReady(() => {
			let loader_config = window.__require_config;
			if (loader_config) {
				useConfig(loader_config[0], loader_config[1], loader_config[2], loader_config[3]);
				window.__require_config = false;
			}
			
			let loaded_assets = window.__require_loaded;
			if (loaded_assets) {
				for (let i = 0, l = loaded_assets.length; i < l; i++)
					scripts_loaded[loaded_assets[i]] = 1;
				window.__require_loaded = false;
			}
			
			resolveDefer('__define', define, {
				// define(module, body)
				push(argv) {
					return define(argv[0], argv[1], argv[2]);
				}
			}, true);
			resolveDefer('__require', require, require, true);
			resolveDefer('__components', require, {push: require}, false);
		});
	}
	
	init();
})(window, document, BASE_URL, CSS_URL, MAIN_REVISION);
