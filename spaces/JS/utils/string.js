export function toKebabCase(str) {
	return String(str)
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		.replace(/[\s_.]+/g, '-')
		.toLowerCase();
}

export function snakeToCamelCase(str) {
	return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
