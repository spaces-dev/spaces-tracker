import module from 'module';
import Spaces from './spacesLib';
import $ from './jquery';

let langs, cats;
let prev_lang_a, prev_lang_b;

function gebi(id) {return document.getElementById(id)}
function showHideSmth(el) {el.style.display = (el.style.display === 'none' ? 'block' : 'none');}
function renderCatSaving(cid) {
	let cat = cats.filter(v => {return +v.cid === +cid})[0];
	if(cat.saving) {
		gebi(`cat_editor_${cid}_saving`).style.display = 'inline';
	} else {
		gebi(`cat_editor_${cid}_saving`).style.display = 'none';
	}
}

function renderKeyphraseEditor(data, parentEl, keyphraseData) {
	let el = document.createElement('div');
	parentEl.appendChild(el);
	el.outerHTML = gebi('cat_editor_TMPL_keyphrase').outerHTML.replace(/TMPL/g, data.kpid);
	let text = gebi(`cat_editor_${data.kpid}_keyphrase_text`);
	
	text.value = data.text;
	let delBtn = gebi(`cat_editor_${data.kpid}_keyphrase_delete`);
	
	text.addEventListener('change', function () {
		text.disabled = true;
		delBtn.disabled = true;
		
		let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Kpid: data.kpid, text: text.value}, function (res) {
			data.text = text.value;
			text.disabled = false;
			delBtn.disabled = false;
			
			cat.saving--;
			renderCatSaving(data.cid);
		})
	});
	
	delBtn.addEventListener('click', function () {
		
		let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Kpid: data.kpid, Delete: 1}, function (res) {
			let i;
			for(let q = 0; q < keyphraseData.length; q++) {
				if(keyphraseData[q].kpid == data.kpid)
					i = q;
			}
			keyphraseData.splice(i, 1);
			
			let e = document.createElement('div');
			parentEl.replaceChild(e, gebi(`cat_editor_${data.kpid}_keyphrase`));
			e.outerHTML = gebi('cat_editor_TMPL_keyphrase_deleted').outerHTML.replace(/TMPL/g, data.kpid);
			gebi(`cat_editor_${data.kpid}_keyphrase_deleted_text`).innerHTML = data.text;
			
			cat.saving--;
			renderCatSaving(data.cid);
		})
	});
}
function renderTitleEditor(data, parentEl, langData) {
	let el = document.createElement('div');
	parentEl.appendChild(el);
	el.outerHTML = gebi('cat_editor_TMPL_title').outerHTML.replace(/TMPL/g, data.ctid);
	let title = gebi(`cat_editor_${data.ctid}_title_text`);
	
	title.value = data.title;
	let setMainBtn = gebi(`cat_editor_${data.ctid}_title_set_main`);
	let delBtn = gebi(`cat_editor_${data.ctid}_title_delete`);
	
	title.addEventListener('change', function () {
		title.disabled = true;
		setMainBtn.disabled = true;
		delBtn.disabled = true;
		
		let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Ctid: data.ctid, title: title.value}, function (res) {
			data.title = title.value;
			title.disabled = false;
			setMainBtn.disabled = false;
			delBtn.disabled = false;
			
			cat.saving--;
			renderCatSaving(data.cid);
		})
	});
	
	setMainBtn.addEventListener('click', function () {
		let mainTitle = gebi(`cat_editor_${data.cid}_lang_${data.lang}_main_title`);
		mainTitle.disabled = true;
		title.disabled = true;
		setMainBtn.disabled = true;
		delBtn.disabled = true;
		
		let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Ctid: data.ctid, Main: 1}, function (res) {
			// Сначала меняем данные
			let unmainedTitleData;
			for(let q = 0; q < langData.length; q++) {
				if(langData[q].is_main)
					unmainedTitleData = langData[q];
				
				langData[q].is_main = data.ctid == langData[q].ctid;
			}
			
			// Потом меняем DOM
			mainTitle.value = data.title;
			mainTitle.disabled = false;
			
			parentEl.removeChild(gebi(`cat_editor_${data.ctid}_title`));
			renderTitleEditor(unmainedTitleData, parentEl, langData);
			
			cat.saving--;
			renderCatSaving(data.cid);
		})
	});
	
	delBtn.addEventListener('click', function () {
		
		let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Ctid: data.ctid, Delete: 1}, function (res) {
			let i;
			for(let q = 0; q < langData.length; q++) {
				if(langData[q].ctid == data.ctid)
					i = q;
			}
			langData.splice(i, 1);
			
			let e = document.createElement('div');
			parentEl.replaceChild(e, gebi(`cat_editor_${data.ctid}_title`));
			e.outerHTML = gebi('cat_editor_TMPL_title_deleted').outerHTML.replace(/TMPL/g, data.ctid);
			gebi(`cat_editor_${data.ctid}_title_deleted_text`).innerHTML = data.title;
			
			cat.saving--;
			renderCatSaving(data.cid);
		})
	});
}
function renderCatEditor(data) {
	let el = document.createElement('div');
	gebi('cat_editor').appendChild(el);
	el.outerHTML = gebi('cat_editor_TMPL').outerHTML.replace(/TMPL/g, data.cid);
	
	let expanded = gebi(`cat_editor_${data.cid}_expanded`);
	let contracted = gebi(`cat_editor_${data.cid}_contracted`);
	contracted.innerHTML = data.titles.ru.filter(v => {return v.is_main})[0].title;
	contracted.addEventListener('click', function() {
		showHideSmth(contracted);
		showHideSmth(expanded);
	});
	
	expanded.querySelector('.cat_editor_meta').addEventListener('click', function () {
		showHideSmth(contracted);
		showHideSmth(expanded);
	});
	
	gebi(`cat_editor_${data.cid}_cat_id`).innerHTML = data.cid;
	gebi(`cat_editor_${data.cid}_files_cnt`).innerHTML = data.files_cnt;
	
	gebi(`cat_editor_${data.cid}_orient_${data.orient}`).selected = true;
	let orient = gebi(`cat_editor_${data.cid}_orient`);
	orient.addEventListener('change', function() {
		orient.disabled = true;
		let v = orient.options[orient.selectedIndex].value;
		
		let cat = cats.filter(v => {return +v.cid == +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, Orient: v}, function (res) {
			for(let q = 0; q < orient.options.length; q++) {
				orient.options.selected = false;
			}
			orient.options[orient.selectedIndex].selected = true;
			data.orient = v;
			orient.disabled = false;
			
			cat.saving--;
			renderCatSaving(data.cid);
		})
	});
	
	let onOrientVisibilityChange = (e) => {
		let orients_hide = Array.from(document.querySelectorAll(`.cat_editor_${data.cid}_orient_hide`))
			.filter((o) => o.checked)
			.map((o) => o.value);
		
		e.target.disabled = true;
		
		let orients_hide_bits = 0;
		for (let o of orients_hide)
			orients_hide_bits |= 1 << o;
		
		let cat = cats.filter(v => {return +v.cid == +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, Orients_hide: orients_hide_bits}, function (res) {
			data.orients_hide = orients_hide_bits;
			
			e.target.disabled = false;
			
			cat.saving--;
			renderCatSaving(data.cid);
		});
	};
	
	document.querySelectorAll(`.cat_editor_${data.cid}_orient_hide`).forEach((o) => {
		o.checked = (data.orients_hide & (1 << o.value)) != 0;
		o.addEventListener('change', onOrientVisibilityChange, false);
	});
	
	for(let lang in data.titles) {
		let langContainer = gebi(`cat_editor_${data.cid}_lang_${lang}_titles`);
		for(let q = 0; q < data.titles[lang].length; q++) {
			let titleData = data.titles[lang][q];
			if(titleData.is_main) {
				let title = gebi(`cat_editor_${data.cid}_lang_${lang}_main_title`);
				title.value = titleData.title;
				title.addEventListener('change', function(){
					let title = gebi(`cat_editor_${data.cid}_lang_${lang}_main_title`);
					title.disabled = true;
					let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
					let titleData = cat.titles[lang].filter(v => {return v.is_main})[0];
					cat.saving++;
					renderCatSaving(data.cid);
					Spaces.api("xxx.cat_editor", {CK: null, Ctid: titleData.ctid, title: title.value}, function (res) {
						titleData.title = title.value;
						title.disabled = false;
						cat.saving--;
						renderCatSaving(data.cid);
					});
				});
			} else {
				renderTitleEditor(titleData, langContainer, data.titles[lang]);
			}
		}
		
		let createText = gebi(`cat_editor_${data.cid}_lang_${lang}_title_new_text`);
		let createBtn = gebi(`cat_editor_${data.cid}_lang_${lang}_title_create`);
		createBtn.addEventListener('click', function () {
			createText.disabled = true;
			createBtn.disabled = true;
			
			let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
			cat.saving++;
			renderCatSaving(data.cid);
			
			Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, lang: lang, title: createText.value}, function(res) {
				let titleData = {ctid: res.Ctid, title: createText.value, is_main: false, lang: lang};
				data.titles[lang].push(titleData);
				renderTitleEditor(titleData, langContainer, data.titles[lang]);
				createText.value = '';
				createText.disabled = false;
				createBtn.disabled = false;
				
				cat.saving--;
				renderCatSaving(data.cid);
			});
		});
		
		for(let ftype in {video: 25, picture: 7}) {
			// page_title
			let pageTitleEditor = gebi(`cat_editor_${data.cid}_lang_${lang}_${ftype}_page_title`);
			if('page_title' in data && lang in data.page_title && ftype in data.page_title[lang])
				pageTitleEditor.value = data.page_title[lang][ftype];
			
			pageTitleEditor.addEventListener('change', function(){
				pageTitleEditor.disabled = true;
				let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
				cat.saving++;
				renderCatSaving(data.cid);
				Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, lang: lang, ftype: ftype, page_title: pageTitleEditor.value}, function (res) {
					if(! cat.page_title)
						cat.page_title = {};
					if(! cat.page_title[lang])
						cat.page_title[lang] = {};
					cat.page_title[lang][ftype] = pageTitleEditor.value;
					pageTitleEditor.disabled = false;
					cat.saving--;
					renderCatSaving(data.cid);
				});
			});
			
			// page_h1
			let pageH1Editor = gebi(`cat_editor_${data.cid}_lang_${lang}_${ftype}_page_h1`);
			if('page_h1' in data && lang in data.page_h1 && ftype in data.page_h1[lang])
				pageH1Editor.value = data.page_h1[lang][ftype];
			
			pageH1Editor.addEventListener('change', function(){
				pageH1Editor.disabled = true;
				let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
				cat.saving++;
				renderCatSaving(data.cid);
				Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, lang: lang, ftype: ftype, page_h1: pageH1Editor.value}, function (res) {
					if(! cat.page_h1)
						cat.page_h1 = {};
					if(! cat.page_h1[lang])
						cat.page_h1[lang] = {};
					cat.page_h1[lang][ftype] = pageH1Editor.value;
					pageH1Editor.disabled = false;
					cat.saving--;
					renderCatSaving(data.cid);
				});
			});
			
			// page_location
			let pageLocationEditor = gebi(`cat_editor_${data.cid}_lang_${lang}_${ftype}_page_location`);
			if('page_location' in data && lang in data.page_location && ftype in data.page_location[lang])
				pageLocationEditor.value = data.page_location[lang][ftype];
			
			pageLocationEditor.addEventListener('change', function(){
				pageLocationEditor.disabled = true;
				let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
				cat.saving++;
				renderCatSaving(data.cid);
				Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, lang: lang, ftype: ftype, page_location: pageLocationEditor.value}, function (res) {
					if(! cat.page_location)
						cat.page_location = {};
					if(! cat.page_location[lang])
						cat.page_location[lang] = {};
					cat.page_location[lang][ftype] = pageLocationEditor.value;
					pageLocationEditor.disabled = false;
					cat.saving--;
					renderCatSaving(data.cid);
				});
			});
			
			// file_page_location
			let filePageLocationEditor = gebi(`cat_editor_${data.cid}_lang_${lang}_${ftype}_file_page_location`);
			if('file_page_location' in data && lang in data.file_page_location && ftype in data.file_page_location[lang])
				filePageLocationEditor.value = data.file_page_location[lang][ftype];
			
			filePageLocationEditor.addEventListener('change', function(){
				filePageLocationEditor.disabled = true;
				let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
				cat.saving++;
				renderCatSaving(data.cid);
				Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, lang: lang, ftype: ftype, file_page_location: filePageLocationEditor.value}, function (res) {
					if(! cat.file_page_location)
						cat.file_page_location = {};
					if(! cat.file_page_location[lang])
						cat.file_page_location[lang] = {};
					cat.file_page_location[lang][ftype] = filePageLocationEditor.value;
					filePageLocationEditor.disabled = false;
					cat.saving--;
					renderCatSaving(data.cid);
				});
			});
			
			// descr
			let descrEditor = gebi(`cat_editor_${data.cid}_lang_${lang}_${ftype}_descr`);
			if(! descrEditor)
				console.log(`cat_editor_${data.cid}_lang_${lang}_${ftype}_descr`);
			
			if('descr' in data && lang in data.descr && ftype in data.descr[lang])
				descrEditor.value = data.descr[lang][ftype];
			
			descrEditor.addEventListener('change', function(){
				descrEditor.disabled = true;
				let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
				cat.saving++;
				renderCatSaving(data.cid);
				Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, lang: lang, ftype: ftype, descr: descrEditor.value}, function (res) {
					if(! cat.descr)
						cat.descr = {};
					if(! cat.descr[lang])
						cat.descr[lang] = {};
					cat.descr[lang][ftype] = descrEditor.value;
					descrEditor.disabled = false;
					cat.saving--;
					renderCatSaving(data.cid);
				});
			});
		}
		
		for(let ftype in {video: 25, picture: 7}) {
				
			let keyphrasesContainer = gebi(`cat_editor_${data.cid}_lang_${lang}_keyphrases_${ftype}`);
			for(let q = 0; q < data.keyphrases[lang][ftype].length; q++) {
				let keyphraseData = data.keyphrases[lang][ftype][q];
				renderKeyphraseEditor(keyphraseData, keyphrasesContainer, data.keyphrases[lang][ftype]);
				//renderTitleEditor(titleData, keyphrasesContainer, data.titles[lang]);
			}
			
			let createText = gebi(`cat_editor_${data.cid}_lang_${lang}_keyphrase_${ftype}_new_text`);
			let createBtn = gebi(`cat_editor_${data.cid}_lang_${lang}_keyphrase_${ftype}_create`);
			createBtn.addEventListener('click', function () {
				createText.disabled = true;
				createBtn.disabled = true;
				
				let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
				cat.saving++;
				renderCatSaving(data.cid);
				
				Spaces.api("xxx.cat_editor", {CK: null, Cid: data.cid, lang: lang, ftype: ftype, keyphrase: createText.value}, function(res) {
					let keyphraseData = {kpid: res.Kpid, text: createText.value, lang: lang, ftype: ftype, cid: data.cid};
					data.keyphrases[lang][ftype].push(keyphraseData);
					renderKeyphraseEditor(keyphraseData, keyphrasesContainer, data.keyphrases[lang][ftype]);
					createText.value = '';
					createText.disabled = false;
					createBtn.disabled = false;
					
					cat.saving--;
					renderCatSaving(data.cid);
				});
			});
		}
	}
	
	// перемещение файлов из одной категории в другую (слияние без удаления исходной категории)
	let moveInput = gebi(`cat_editor_${data.cid}_move_input`);
	let moveBtn = gebi(`cat_editor_${data.cid}_move_go`);
	moveInput.addEventListener('input', function () {
		moveBtn.disabled = cats.filter(v => {return +v.cid === +moveInput.value}).length === 0;
	});
	moveBtn.addEventListener('click', function () {
		moveInput.disabled = true;
		moveBtn.disabled = true;
		
		let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Move: 1, From: data.cid, To: +moveInput.value}, function(res) {
			let targetCat = cats.filter(v => {return +v.cid === +moveInput.value})[0];
			
			data.files_cnt = 0;
			gebi(`cat_editor_${data.cid}_files_cnt`).innerHTML = data.files_cnt;
			
			targetCat.files_cnt = res.NewTargetCatFilesCnt;
			gebi(`cat_editor_${moveInput.value}_files_cnt`).innerHTML = targetCat.files_cnt;
			
			moveInput.disabled = false;
			moveInput.value = '';
			
			cat.saving--;
			renderCatSaving(data.cid);
		});
	});
	
	// удаление категории (с откреплением от категории всех файлов)
	gebi(`cat_editor_${data.cid}_delete`).addEventListener('click', function() {showHideSmth(gebi(`cat_editor_${data.cid}_delete_sure`))});
	gebi(`cat_editor_${data.cid}_delete_no`).addEventListener('click', function() {showHideSmth(gebi(`cat_editor_${data.cid}_delete_sure`))});
	let delBtn = gebi(`cat_editor_${data.cid}_delete_yes`);
	delBtn.addEventListener('click', function() {
		delBtn.disabled = true;
		
		let cat = cats.filter(v => {return +v.cid == +data.cid})[0];
		cat.saving++;
		renderCatSaving(data.cid);
		
		Spaces.api("xxx.cat_editor", {CK: null, Delete: 1, Cid: data.cid}, function(res) {
			gebi('cat_editor').removeChild(gebi(`cat_editor_${data.cid}`));
		});
	});
	
	gebi(`cat_editor_${data.cid}_done`).addEventListener('click', function() {
		let cat = cats.filter(v => {return +v.cid === +data.cid})[0];
		
		let cb;
		cb = function(){
			if(cat.saving) {
				setTimeout(cb, 100);
			} else {
				let contracted = gebi(`cat_editor_${data.cid}_contracted`);
				contracted.innerHTML = data.titles.ru.filter(v => {return v.is_main})[0].title;
				showHideSmth(contracted);
				showHideSmth(gebi(`cat_editor_${data.cid}_expanded`));
			}
		};
		cb();
	});
}

function handleLangSwitch() {
	let lang_a = $('[name="lang_a"]:checked').val();
	let lang_b = $('[name="lang_b"]:checked').val();
	
	if (lang_a == lang_b) {
		$(`[name="lang_a"][value="${prev_lang_b}"]`).prop("checked", true);
		$(`[name="lang_b"][value="${prev_lang_a}"]`).prop("checked", true);
		handleLangSwitch();
		return;
	}
	
	prev_lang_a = lang_a;
	prev_lang_b = lang_b;
	
	$('.cat_editor_lang').each((i, lang_div) => {
		lang_div.classList.toggle('hide', lang_div.dataset.lang != lang_a && lang_div.dataset.lang != lang_b);
	});
	
}

export function init(new_cats, new_langs) {
	cats = new_cats;
	langs = new_langs;
	
	$('#cat_editor_add_new_cat').on('click', (e) => {
		e.preventDefault();
		$(e.target).remove();
		$('#cat_editor_new_cat_form').removeClass('hide');
	});
	
	$('.js-editor-lang').on('change', () => handleLangSwitch());
	handleLangSwitch();
	
	for(let q = 0; q < cats.length; q++) {
		cats[q].saving = 0;
		renderCatEditor(cats[q]);
	}
	
	let newCatLangTitles = {};
	for(let q = 0; q < langs.length; q++)
		newCatLangTitles[langs[q]] = gebi(`cat_editor_new_${langs[q]}_title`);
	
	let newCatLangBtn = gebi(`cat_editor_new_go`);
	newCatLangBtn.addEventListener('click', function () {
		newCatLangBtn.disabled = true;
		let params = {CK: null, Create: 1};
		for(let q = 0; q < langs.length; q++) {
			newCatLangTitles[langs[q]].disabled = true;
			params[langs[q]] = newCatLangTitles[langs[q]].value;
		}
		Spaces.api("xxx.cat_editor", params, function (res) {
			cats.push(res.cat);
			renderCatEditor(res.cat);
			
			for(let q = 0; q < langs.length; q++) {
				newCatLangTitles[langs[q]].value = '';
				newCatLangTitles[langs[q]].disabled = false;
			}
			newCatLangBtn.disabled = false;
		});
	});
}
