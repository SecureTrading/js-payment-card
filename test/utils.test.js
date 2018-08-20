import each from 'jest-each';
const utils = require('../src/utils');

each([[[], "", false],
      [[""], "", true],
      [["1"], 1, false],
      [[1], "1", false],
      [[1, 2, 3, 4, 5, 6, 7, 8, 9, 0], 9, true],
      ["30-31", "-", true],
     ]).test("inArray",
	     (array, item, expected) => {
		 expect(utils.inArray(array, item)).toBe(expected);
             });

each([["", undefined, ""],
      ["6011 0110", undefined, "60110110"],
      ["p455w0rd", undefined, "4550"],
      ["p455w0rd", /\d/g, "pwrd"],
      ["p455w0rd", /\d+/, "pw0rd"],
     ]).test("stripChars",
	      (string, regex, expected) => {
		  expect(utils.stripChars(string, regex)).toBe(expected)
	      });
