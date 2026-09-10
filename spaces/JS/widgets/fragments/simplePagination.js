import { L } from "../../core/l10n";

export function simplePagination({ current, total, arrows = true, numbered = false }) { // FIXME: табличная вёрстка 😍
	if (total <= 1 || (!arrows && !numbered))
		return '';

	if (!arrows) {
		return `
			<div class="pgn-wrapper">
				<div class="pgn">
					${numberedPagination({ current, total })}
				</div>
			</div>
		`;
	}

	return `
		<div class="pgn-wrapper">
			<!-- l10n-set context="pagination" -->
			<div class="pgn">
				<table class="table__wrap pgn__table">
					<tr>
						<td class="table__cell" width="35%">
							<button
								class="
									js-simple_pagination
									pgn__button
									pgn__link_prev
									pgn__link_hover
									${current == 1 ? 'pgn__link_disabled' : ''}
								"
								data-dir="prev"
								${current == 1 ? 'disabled' : ''}
							>
								<span class="js-ico ico ico_arr_left"></span>
								<span class="js-text">${L("Назад")}</span>
							</button>
						</td>
						<td class="table__cell">
							<div class="pgn__counter pgn__range">
								${L('{current} из {total}', { current, total })}
							</div>
						</td>
						<td class="table__cell table__cell_last" width="35%">
							<button
								class="
									js-simple_pagination
									pgn__button
									pgn__link_next
									pgn__link_hover
									${current == total ? 'pgn__link_disabled' : ''}
								"
								data-dir="next"
								${current == total ? 'disabled' : ''}
							>
								<span class="js-text">${L("Вперёд")}</span>
								<span class="js-ico ico ico_arr_right"></span>
							</button>
						</td>
					</tr>
				</table>
				${numbered ? numberedPagination({ current, total, separated: true }) : ''}
			</div>
			<!-- l10n-reset -->
		</div>
	`;
};

function numberedPagination({ current, total, separated = false }) {
	const start = total <= 7 ? 2 : Math.max(2, Math.min(current - 1, total - 3));
	const end = total <= 7 ? total - 1 : Math.min(total - 1, Math.max(current + 1, 4));
	const pages = [1];
	for (let page = start; page <= end; page++)
		pages.push(page);
	pages.push(total);

	return `
		<table class="table__nums table__wrap pgn__additional pgn__table ${separated ? 'table_top_border' : ''}">
			<tr>
				${pages.map((page, index) => {
					return `
						${index > 0 && page - pages[index - 1] > 1 ? `
							<td class="table__cell pgn__separator">
								<span class="pgn__counter">...</span>
							</td>
						` : ''}
						<td class="table__cell ${page == current ? 'pgn__button_press' : ''} ${page == total ? 'table__cell_last' : ''}">
							${page == current ? `
								<span class="pgn__counter" aria-current="page">${page}</span>
							` : `
								<button type="button" class="js-simple_pagination pgn__button" data-page="${page}">
									${page}
								</button>
							`}
						</td>
					`;
				}).join('')}
			</tr>
		</table>
	`;
}
