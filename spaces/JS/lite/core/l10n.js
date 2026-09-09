const MESSAGE_TYPE = {
	LITERAL: 0,
	ARGUMENT: 1,
	NUMBER: 2,
	DATE: 3,
	TIME: 4,
	SELECT: 5,
	PLURAL: 6,
	POUND: 7,
	TAG: 8,
};
const MESSAGE_ELEMENT = {
	TYPE: 0,
	VALUE: 1,
	OPTIONS: 2,
	CHILDREN: 2,
	OFFSET: 3,
	PLURAL_TYPE: 4,
};
const PLURAL_TYPE = {
	ORDINAL: 1,
};
const language = document.documentElement.lang;

function getPluralRule(language, pluralType) {
	if (pluralType == PLURAL_TYPE.ORDINAL)
		return language == 'en' ? 'englishOrdinal' : 'other';

	switch (language) {
		case 'ru':
		case 'uk':
			return 'slavic';
		case 'pt':
			return 'integerZeroOrOne';
		default:
			return 'one';
	}
}

function selectPluralCategory(value, pluralType) {
	value = Math.abs(value);
	switch (getPluralRule(language, pluralType)) {
		case 'englishOrdinal': {
			const mod10 = value % 10;
			const mod100 = value % 100;
			if (mod10 == 1 && mod100 != 11)
				return 'one';
			if (mod10 == 2 && mod100 != 12)
				return 'two';
			if (mod10 == 3 && mod100 != 13)
				return 'few';
			return 'other';
		}
		case 'slavic': {
			if (value % 1)
				return 'other';
			const mod10 = value % 10;
			const mod100 = value % 100;
			if (mod10 == 1 && mod100 != 11)
				return 'one';
			if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
				return 'few';
			return 'many';
		}
		case 'integerZeroOrOne':
			return value < 2 ? 'one' : 'other';
		case 'one':
			return value == 1 ? 'one' : 'other';
		case 'other':
			return 'other';
	}
}

function formatNumber(value, options) {
	value = Number(value);
	if (options && options.scale !== undefined)
		value *= options.scale;
	if (options && options.style == 'percent')
		return String(value * 100) + '%';
	if (options && options.maximumFractionDigits === 0)
		value = Math.round(value);
	return String(value);
}

function formatDateTime(value, time) {
	const date = value instanceof Date ? value : new Date(value);
	return time ? date.toLocaleTimeString() : date.toLocaleDateString();
}

function format(message, values, pluralValue) {
	if (typeof message == 'string') {
		return message.replace(/\{([\w.-]+)\}/g, (placeholder, name) => {
			if (values[name] === undefined)
				return placeholder;
			return values[name];
		});
	}

	let result = '';
	for (let i = 0; i < message.length; i++) {
		const element = message[i];
		const type = element[MESSAGE_ELEMENT.TYPE];
		switch (type) {
			case MESSAGE_TYPE.LITERAL:
				result += element[MESSAGE_ELEMENT.VALUE];
				break;
			case MESSAGE_TYPE.ARGUMENT: {
				const value = values[element[MESSAGE_ELEMENT.VALUE]];
				result += value == undefined || value === false ? '' : value;
				break;
			}
			case MESSAGE_TYPE.NUMBER:
				result += formatNumber(values[element[MESSAGE_ELEMENT.VALUE]], element[MESSAGE_ELEMENT.OPTIONS]);
				break;
			case MESSAGE_TYPE.DATE:
			case MESSAGE_TYPE.TIME:
				result += formatDateTime(values[element[MESSAGE_ELEMENT.VALUE]], type == MESSAGE_TYPE.TIME);
				break;
			case MESSAGE_TYPE.SELECT: {
				const options = element[MESSAGE_ELEMENT.OPTIONS];
				result += format(options[values[element[MESSAGE_ELEMENT.VALUE]]] || options.other, values, pluralValue);
				break;
			}
			case MESSAGE_TYPE.PLURAL: {
				const value = Number(values[element[MESSAGE_ELEMENT.VALUE]]);
				const options = element[MESSAGE_ELEMENT.OPTIONS];
				const offset = element[MESSAGE_ELEMENT.OFFSET] || 0;
				const exact = '=' + value;
				const option = Object.prototype.hasOwnProperty.call(options, exact) ?
					options[exact] :
					options[selectPluralCategory(value - offset, element[MESSAGE_ELEMENT.PLURAL_TYPE])] || options.other;
				result += format(option, values, value - offset);
				break;
			}
			case MESSAGE_TYPE.POUND:
				result += formatNumber(pluralValue);
				break;
			case MESSAGE_TYPE.TAG: {
				const render = values[element[MESSAGE_ELEMENT.VALUE]];
				result += render(format(element[MESSAGE_ELEMENT.CHILDREN], values, pluralValue));
				break;
			}
		}
	}
	return result;
}

export function L(message, values, ...positionalValues) {
	if (values && typeof values == 'object')
		return format(message, values);

	const args = [values, ...positionalValues];
	const variables = {};
	for (let i = 0; i < args.length; i++)
		variables[i] = args[i];
	return format(message, variables);
}

export function t(strings, ...values) {
	if (typeof strings == 'string' || strings.raw === undefined)
		return format(strings, values[0]);

	let message = strings[0];
	const variables = {};
	for (let i = 0; i < values.length; i++) {
		message += '{' + i + '}' + strings[i + 1];
		variables[i] = values[i];
	}
	return format(message, variables);
}

export function plural(message, values) {
	return format(message, values);
}

export function select(message, values) {
	return format(message, values);
}

export function ph(value) {
	for (const name in value)
		return value[name];
}
