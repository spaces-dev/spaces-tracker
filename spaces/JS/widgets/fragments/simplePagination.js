import { L } from "../../utils";

export function simplePagination({ current, total }) { // FIXME: табличная вёрстка 😍
	if (total <= 1)
		return '';

	return `
		<div class="pgn-wrapper">
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
							>
								<span class="js-ico ico ico_arr_left"></span>
								<span class="js-text">${L("Назад")}</span>
							</button>
						</td>
						<td class="table__cell">
							<div class="pgn__counter pgn__range">
								${L("{0} из {1}", current, total)}
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
							>
								<span class="js-text">${L("Вперёд")}</span>
								<span class="js-ico ico ico_arr_right"></span>
							</button>
						</td>
					</tr>
				</table>
			</div>
		</div>
	`;
};
