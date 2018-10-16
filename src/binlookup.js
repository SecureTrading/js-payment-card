import { cardtype, cardtypedetails } from "./cardtype";
import { inArray, forEachBreak } from "./utils";

export class BinLookup {
    constructor(config) {
	config = config || {};
	this.minMatch = "minMatch" in config ? config.minMatch : 0;
	this.maxMatch = "maxMatch" in config ? config.maxMatch : 6;

	this.supported = this.getAllCardTypes();
	if ("supported" in config) {
	    const support = config.supported;
	    for (let i in support) {
		const type = support[i];
		if (!this.isSupported(type)) {
		    throw "unsupported cardType " + type;
		}
	    }
	    this.supported = support;
	}

	this.default = "defaultCardType" in config ? this.getCard(config.defaultCardType) : null;
    }

    forEachBreakCardTypes(callback) {
	return forEachBreak(cardtypedetails, (card) => {
	    if (this.isSupported(card)) {
		return callback(card);
	    }
	});
    }

    getAllCardTypes() {// this cannot use foreachBreakCardTypes since it's used to set up this.supported
	const result = [];
	forEachBreak(cardtypedetails, (card) => {
		result.push(card.type);
	});
	return result.sort();
    }

    isSupported(cardType) {
	if (cardType instanceof Object) {
	    cardType = cardType.type;
	}
	return inArray(this.supported, cardType);
    }

    getCard(type) {
	return this.forEachBreakCardTypes((card) => {
	    if (card["type"] === type) {
		return card;
	    }
	});
    }

    binLookup(number) {
	let result = {type: null};
	if (number.length >= this.minMatch) {
	    const tmp = cardtypedetails[this._lookup(number, cardtype)];
	    if (this.isSupported(tmp)) {
		result = tmp;
	    }
	}
	if ((!result.type) && this.default && number.length <= this.maxMatch) {
	    result = this.default;
	}
	return result;
    }

    matchKey(number, key) {
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

    _lookup(number, tree) {
	if (!(tree instanceof Object)) {
	    return tree;
	}
	const found = [];
	for (let key in tree) {
	    if (this.matchKey(number, key)) {
		found.push(key);
	    }
	}
	found.sort((a, b) => {
	    return a.length - b.length;
	});
	return forEachBreak(found, (key) => {
		return this._lookup(number, tree[key]);
	}) || tree.D || null;
    }
}
