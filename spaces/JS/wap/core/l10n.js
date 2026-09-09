const MESSAGE_TYPE = {
	LITERAL: 0,
	ARGUMENT: 1,
	SELECT: 5,
	TAG: 8,
};
const MESSAGE_ELEMENT = {
	TYPE: 0,
	VALUE: 1,
	OPTIONS: 2,
	CHILDREN: 2,
};

function format(message, values) {
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
		switch (element[MESSAGE_ELEMENT.TYPE]) {
			case MESSAGE_TYPE.LITERAL:
				result += element[MESSAGE_ELEMENT.VALUE];
				break;
			case MESSAGE_TYPE.ARGUMENT: {
				const value = values[element[MESSAGE_ELEMENT.VALUE]];
				result += value == undefined || value === false ? '' : value;
				break;
			}
			case MESSAGE_TYPE.SELECT: {
				const options = element[MESSAGE_ELEMENT.OPTIONS];
				result += format(options[values[element[MESSAGE_ELEMENT.VALUE]]] || options.other, values);
				break;
			}
			case MESSAGE_TYPE.TAG: {
				const render = values[element[MESSAGE_ELEMENT.VALUE]];
				result += render(format(element[MESSAGE_ELEMENT.CHILDREN], values));
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

	let result = strings[0];
	for (let i = 0; i < values.length; i++)
		result += values[i] + strings[i + 1];
	return result;
}

export function select(message, values) {
	return format(message, values);
}

export function ph(value) {
	for (const name in value)
		return value[name];
}
