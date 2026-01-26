import module from 'module';
import { L } from '../utils';

// Возьмём эти модули с тач версии (так делать плохо)
import $ from '../../vendor/jquery';
import '../../libs/jquery.flot';

let charts = [];

const CHART_THEME = {
	light: {
		axis:		'#dce2e5',
		line:		'#0e3c87',
		border:		'#c5d3e1',
		legend:		'#ffffff',
		
		line: {
			// standart colors
			blue:		'#0E3C87',
			green:		'#61a961',
			red:		'#993333',
			yellow:		'#FFA000',
			purple:		'#673ab7',
			grey:		'#617989',
			black:		'#323232',
		}
	},
	dark: {
		axis:		'#545454',
		line:		'#7cc3ff',
		border:		'#7c7f83',
		legend:		'#3e3f40',
		
		line: {
			// standart colors
			blue:		'#7cc3ff',
			green:		'#78d993',
			red:		'#ff8a66',
			yellow:		'#FFA000',
			purple:		'#b591eb',
			grey:		'#cccccc',
			black:		'#ffffff',
		}
	}
};

let elements = document.getElementsByClassName('js-chart_new');
for (let i = 0; i < elements.length; i++)
	setupChart($(elements[i]));

// Временные костыли пока юзается flot
function prepareData(data) {
	let new_data = [];
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		new_data.push([new Date(v.date), v.value]);
	}
	return new_data;
}

function setupChart(el) {
	let theme = CHART_THEME[INITIAL_THEME];
	
	el.removeClass('js-chart_new');
	
	let lines = el.data('lines');
	
	let series = [];
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		series.push({
			label:	line.title,
			color:	theme.line[line.color || 'blue'],
			data:	prepareData(line.data)
		});
	}
	
	// let legend = $('<div class="pad_t_a">');
	// el.after(legend);
	
	charts.push($.plot(el, series, {
		grid: {
			borderWidth: 1,
			borderColor: theme.border
		},
		legend: {
			show: true,
			backgroundColor: theme.legend,
			// container: legend
		},
		series: {
			shadowSize: 3
		},
		xaxis: {
			color: theme.axis,
			mode: "time",
			timeformat: "%b %d",
			timeBase: "milliseconds",
			monthNames: [L("Янв"), L("Фев"), L("Мар"), L("Апр"), L("Май"), L("Июн"), L("Июл"), L("Авг"), L("Сен"), L("Окт"), L("Ноя"), L("Дек")]
		},
		yaxis: {
			color: theme.axis,
			minTickSize: 0.01,
			tickDecimals: 0
		}
	}));
}
