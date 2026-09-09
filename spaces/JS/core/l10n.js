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
const pluralRules = new Map();
const numberFormats = new Map();
const dateTimeFormats = new Map();
const language = document.documentElement.lang;

function getFormatter(cache, Formatter, options) {
	const key = JSON.stringify(options);
	let formatter = cache.get(key);
	if (!formatter) {
		formatter = new Formatter(language, options);
		cache.set(key, formatter);
	}
	return formatter;
}

function getPluralCategory(value, pluralType) {
	const options = pluralType == PLURAL_TYPE.ORDINAL ? { type: 'ordinal' } : undefined;
	return getFormatter(pluralRules, Intl.PluralRules, options).select(value);
}

function formatNumber(value, options) {
	let scale = 1;
	let intlOptions = options;
	if (options && options.scale !== undefined) {
		scale = options.scale;
		intlOptions = { ...options };
		delete intlOptions.scale;
	}
	if (scale != 1)
		value *= scale;
	return getFormatter(numberFormats, Intl.NumberFormat, intlOptions).format(value);
}

function formatDateTime(value, options) {
	return getFormatter(dateTimeFormats, Intl.DateTimeFormat, options).format(value);
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
				result += formatDateTime(values[element[MESSAGE_ELEMENT.VALUE]], element[MESSAGE_ELEMENT.OPTIONS]);
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
					options[getPluralCategory(value - offset, element[MESSAGE_ELEMENT.PLURAL_TYPE])] || options.other;
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
