import each from 'jest-each';
const utils = require('../src/utils');

each([[[], "", false],
      [[""], "", true],
      [["1"], 1, false],
      [[1], "1", false],
      [[1, 2, 3, 4, 5, 6, 7, 8, 9, 0], 9, true],
      ["30-31", "-", true],
     ]).test("utils.inArray",
	     (array, item, expected) => {
		 expect(utils.inArray(array, item)).toBe(expected);
             });

each([["", undefined, ""],
      ["6011 0110", undefined, "60110110"],
      ["p455w0rd", undefined, "4550"],
      ["p455w0rd", /\d/g, "pwrd"],
      ["p455w0rd", /\d+/, "pw0rd"],
     ]).test("utils.stripChars",
	      (string, regex, expected) => {
		  expect(utils.stripChars(string, regex)).toBe(expected)
	      });

each([[[], null, 0],
      [[0, 0, 0, 0], null, 4],// if we don't get a truthy result we iterate the whole length
      [[0, 0, 4, 6], 4, 3],// short circuits after the first truthy result
      [[null, null, 4, 6], 4, 3],// this is more like what we do in _lookup
      [{0: 0, 1: 0, 2: 4, 3: 6}, 4, 3], // behaves like return Object.values(iterable).some(callback)
     ]).test("utils.forEachBreak",
	      (iterable, expected, timesCalledBack) => {
		  const callback = jest.fn((item) => {
		      return item
		  });
		  expect(utils.forEachBreak(iterable, callback)).toBe(expected);
		  expect(callback).toHaveBeenCalledTimes(timesCalledBack);
	      });

