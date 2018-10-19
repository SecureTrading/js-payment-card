export function inArray(array, item) {
    return array.indexOf(item) >= 0;
}

export function stripChars(string, regex) {
    if (typeof regex == "undefined") {
	regex = /[\D+]/g;
    }
    return string.replace(regex, "");
}

export function forEachBreak(iterable, callback) {// This is a custom implementation of Array.some which also works for objects - when it breaks it returns null or the truthy response rather than boolean (unlike some implementations of Array.some)
    // return Object.values(iterable).some(callback)
    let result = null;
    for (let i in iterable) {
	result = callback(iterable[i]);
	if (result) {
		break;
	}
    }
    return result || null;
}
