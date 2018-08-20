export function inArray(array, item) {
    return array.indexOf(item) >= 0;
}

export function stripChars(string, regex) {
    if (typeof regex == "undefined") {
	regex = /[\D+]/g;
    }
    return string.replace(regex, "");
}
