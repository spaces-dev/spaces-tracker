import module from 'module';
import $ from '../jquery';
import { throttle } from '../utils';

const tpl = {
	selectAlias({ aliases }) {
		return aliases
			.map((alias) => `<option value="${alias.id}">${alias.title}</option>`)
			.join("");
	},
	selectCats({ tagId, cats }) {
		return cats
			.map((cat) => `
				<label>
					<input name="InT_cats_${tagId}" type="checkbox" value="${cat.cid}" />
					${cat.title}
				</label>
			`.trim())
			.join(", ");
	},
};

module.on('componentpage', () => {
	const allCats = JSON.parse(document.getElementById('json_seo_tags_cats').textContent);
	const allAliases = JSON.parse(document.getElementById('json_seo_tags_aliases').textContent);

	const handleInput = throttle((seoTag, input) => {
		const value = input.value.trim();
		seoTag.find('.js-seo_tag_toggle_int_query').prop("checked", value.length > 0);
	});

	$('#main').on('click', '.js-seo_tag_show_all_cats', function (e) {
		e.preventDefault();
		const seoTag = $(this).parents('.js-seo_tag');

		console.time("init seo cats");
		const selectedCats = seoTag.data('selectedCats');
		$(`#cats_other_${seoTag.data('id')}`).show().html(tpl.selectCats({
			tagId: seoTag.data('id'),
			cats: allCats.filter((cat) => !selectedCats.includes(cat.id))
		}));
		$(this).hide();
		console.timeEnd("init seo cats");
	})
	.on('change', '.js-seo_tag_cat', function () {
		const seoTag = $(this).parents('.js-seo_tag');
		$(`#link_type_int_cats_${seoTag.data('id')}`).prop("checked", true);
	})
	.on('click', '.js-seo_tag_add_int_query', function () {
		const seoTag = $(this).parents('.js-seo_tag');
		toggleIntQuery(seoTag, true);
	}).on('click', '.js-seo_tag_remove_int_query', function () {
		const seoTag = $(this).parents('.js-seo_tag');
		toggleIntQuery(seoTag, false);
	}).on('change input', '.js-seo_tag_int_query', function () {
		const seoTag = $(this).parents('.js-seo_tag');
		handleInput(seoTag, this);
	}).on('mousedown', '.js-seo_tag_alias_for', function () {
		const select = $(this);
		const seoTag = select.parents('.js-seo_tag');
		if (select.data('inited'))
			return;

		console.time("init seo aliases");
		const currentValue = select.val();
		const currentSeoTagId = seoTag.data('id');
		const skipAliases = [currentValue, currentSeoTagId];
		select.append(tpl.selectAlias({
			aliases: allAliases.filter((alias) => !skipAliases.includes(alias.id))
		}));
		console.timeEnd("init seo aliases");

		select.data('inited', true);
	});
});

function toggleIntQuery(seoTag, state) {
	seoTag.find('.js-seo_tag_add_int_query').toggleClass('hide', state);
	seoTag.find('.js-seo_tag_remove_int_query').toggleClass('hide', !state);
	seoTag.find('.js-seo_tag_int_query_title').toggleClass('hide', !state);

	if (!state)
		seoTag.find('.js-seo_tag_int_query_title').val("");
}
