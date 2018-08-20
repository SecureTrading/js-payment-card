import each from 'jest-each';
import { inArray } from '../src/utils';
import { cardtype, cardtypedetails } from '../src/cardtype';
const binlookup = require('../src/binlookup');

const fs = require('fs');
const readline = require('readline');


each([["1801", "180", true],
      ["1901", "180", false],
      ["18", "180", false],
      ["3088", "3088-3094", true],
      ["3090", "3088-3094", true],
      ["3096", "3088-3094", false],
     ]).test("matchKey",
	     (number, key, expected) => {
		 expect(binlookup.matchKey(number, key)).toBe(expected);
	     });

test("binlookup", () => {
    const originalLookup = binlookup._lookup;
    try {
	const mappings = Object.assign({198: {type: null}, null: {type: null}}, cardtypedetails);
	for (let result in mappings) {
	    binlookup._lookup = jest.fn();
	    binlookup._lookup.mockReturnValue(result);
	    expect(binlookup.binlookup("01234")).toEqual(mappings[result]);
	    expect(binlookup._lookup).toHaveBeenCalledTimes(1);
	    expect(binlookup._lookup).toHaveBeenCalledWith("01234", cardtype);
	}
    } finally {
	binlookup._lookup = originalLookup;
    }
});

each([["notfound", {}, null, 1],
      ["notfound", {"D": 7}, 7, 1],
      ["180", {"1": {"18": {"1801": 1}}}, null, 3],
      ["1801", {"1": {"18": {"1801": 1}}}, 1, 4],
      ["1802", {"1": {"18": {"1801": 1}}}, null, 3],
      ["3095", {"D": 9, "308-309": {"3088-3094": 2}}, 9, 2],
      ["3088", {"308-309": {"3088-3094": 2}}, 2, 3],
      ["52", {"D": 3, "51-55": 2, "52": 1}, 1, 2],
      ["523", {"51-55": {"D": 2}, "52": {"522": 1}}, 2, 3],
      ["60110", {"5-6": {"56-69": 7}, "6": {"64-65": {"644-659": 8}, "60": {"6011": {"60110": 8, "60112-60114": 8, "60118-60119": {"601186-601199": 8}, "60117": {"601177-601179": 8, "601174": 8}}, "6012": {"601281": 6}}, "62": {"622": {"622126-622925": 8}, "628": {"6282-6288": 8}, "624-626": 8}, "63": {"630": {"63048": {"630487": 9, "630485": 9}, "63049": {"630493-630494": 9, "630498": 9}}}, "64": {"644-649": 8}, "65": 8, "67": {"675": {"6759": {"D": 7}}}}}, 8, 5],
     ]).test("_lookup",
	     (number, tree, expected, depth) => {
		 const originalLookup = binlookup._lookup;
		 try {
		     if (expected) {
			 
		     }
		     binlookup._lookup = jest.fn(originalLookup); // mock the function as itself (so that we can spy how deep it has recursed)
		     expect(binlookup._lookup(number, tree)).toBe(expected);
		     expect(binlookup._lookup).toHaveBeenCalledTimes(depth);
		 } finally {
		     binlookup._lookup = originalLookup;
		 }
	     });
