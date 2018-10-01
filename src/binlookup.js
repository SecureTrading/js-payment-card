import { cardtype, cardtypedetails } from "./cardtype";
import { inArray } from "./utils";

export class BinLookup {
    constructor(config) {
	this.default = null;
	if ("defaultCardType" in config) {
	    // TODO this reverse-lookup almost identical to this.default = paymentCard.getCard(config.defaultCardType) - apart from getting the index rather than the dict, can we refactor getCard into BinLookup and have paymentcard use it from here?
	    for (let i in cardtypedetails) {
		const card = cardtypedetails[i];
		if (card["type"] === config.defaultCardType) {
		    this.default = i;
		}
	    }
	}
	this.minMatch = "minMatch" in config ? config.minMatch : 0;
	this.maxMatch = "maxMatch" in config ? config.maxMatch : 6;
    }

    binLookup(number) {
	let result = null;
	if (number.length >= this.minMatch) {
	    result = exports._lookup(number, cardtype); // eslint-disable-line no-undef
	}
	if ((!result) && this.default && number.length <= this.maxMatch) {
	    result = this.default;
	}
	return cardtypedetails[result] || {type: null};
    }
}// TODO refactor the functions below up into the BinLookup object

export function matchKey(number, key) {
    let n = number.substring(0, key.length);
    let result = n == key;
    if (!result && inArray(key, "-")) {
	const keys = key.split("-");
	let n = parseInt(number.substring(0, keys[1].length));
	if (parseInt(keys[0]) <= n && n <= parseInt(keys[1])) {
	    result = true;
	}
	
    }
    return result;
}

export function binlookup(number) {
    return cardtypedetails[exports._lookup(number, cardtype)] || {type: null}; // eslint-disable-line no-undef
}

export function _lookup(number, tree) {
    if (!(tree instanceof Object)) {
	return tree;
    }
    const found = [];
    for (let key in tree) {
	if (exports.matchKey(number, key)) { // eslint-disable-line no-undef
	    found.push(key);
	}
    }
    found.sort((a, b) => {
	return a.length - b.length;
    });
    let result = null;
    found.some((key) => {
	result = exports._lookup(number, tree[key]); // eslint-disable-line no-undef
	return result;
    });
    if (!result && typeof tree.D !== "undefined") {
	result = tree.D;
    }
    return result;
}
