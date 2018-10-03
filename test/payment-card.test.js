const jsdom = require("jsdom");
import each from 'jest-each';
const { JSDOM } = jsdom;
const defaultHtml = `<!DOCTYPE html><body><p>Hello world</p><div id="st-card-outer-container"></div><form><input name="pan" /><input name="expirydate" /><input name="securitycode" /><input name="nameoncard" /></form></body></html>`;
const { document } = (new JSDOM(defaultHtml)).window;
global.document = document;
const PaymentCard = require('../src/payment-card');
const fs = require("fs");
const realTemplate = fs.readFileSync(__dirname + '/../src/template.html', 'utf8');

test('auto_init', // Checks we automatically call init
     () => {
	 const pc = new PaymentCard.Card({});
	 const container = document.querySelector("#st-card-outer-container");
	 // Check something that happens in init has happened like setting up the overlays
	 expect(pc.overlays.pan.element.innerHTML).toBe("\u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219");
	 expect(pc.chipImg.getAttribute("src")).toBe("st-mock-file");
     });

test('init', // Check what we can't check in auto_init because we need to mock it before it's called
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 const container = document.querySelector("#st-card-outer-container");
	 pc.updatePan = jest.fn();
	 pc.updateOverlay = jest.fn();
	 pc.setEventListeners = jest.fn();

	 pc.init();

	 expect(pc.updatePan.mock.calls.length).toBe(1);
	 expect(pc.updateOverlay.mock.calls.length).toBe(4);
	 expect(pc.updateOverlay.mock.calls).toMatchObject([["pan"], ["expirydate"], ["securitycode"], ["nameoncard"]]);
	 expect(pc.elements.expirydate.getAttribute("placeholder")).toBe("MM/YY");
	 expect(pc.setEventListeners.mock.calls.length).toBe(1);
     });

each([[{}, {init: true}],
      [{init: false}, {init: false}],
      [{supported: ["VISA"]}, {init: true}],
      [{init: false, supported: ["VISA", "MASTERCARD"]}, {init: false}],
      [{init: true}, {init: true}],
     ])
.test('setConfig', // Check different options get set on config correctly
     (testConfig, expected) => {
	 const pc = new PaymentCard.Card(testConfig);
	 expect(pc.config).toMatchObject(expected);
     });

each([["hello world", "hello world"],
      ["<div>Some html</div>", "<div>Some html</div>"], // We have turned escaping off because we control the template we don't expect &lt; etc...
      ["\u2219\u263A", "\u2219\u263A"], // Make sure unicode characters work
     ]).test('createCard', 
	     (template, expected) => {
		 const pc = new PaymentCard.Card({init: false});
		 pc.template = template;
		 pc.createCard();
		 const container = document.querySelector("#st-card-outer-container");
		 expect(container.innerHTML).toBe(expected);
	     });

test('setDomElements', 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();

	 // Check the elements
	 expect(pc.elements.pan).toMatchObject({name: "pan", exposedAttributes: ["value"]});
	 expect(pc.elements.pan.element).toMatchObject({type: "text"});
	 expect(pc.elements.pan.element.tagName).toBe("INPUT");
	 expect(pc.elements.expirydate).toMatchObject({name: "expirydate"});
	 expect(pc.elements.securitycode).toMatchObject({name: "securitycode"});
	 expect(pc.elements.nameoncard).toMatchObject({name: "nameoncard"});

	 // Check the overlays
	 expect(pc.overlays.pan.getAttribute("id")).toBe("st-pan-overlay");
	 expect(pc.overlays.pan.element.tagName).toBe("DIV");
	 expect(pc.overlays.expirydate.getAttribute("id")).toBe("st-expirydate-overlay");
	 expect(pc.overlays.securitycode.getAttribute("id")).toBe("st-securitycode-overlay");
	 expect(pc.overlays.nameoncard.getAttribute("id")).toBe("st-nameoncard-overlay");

	 // Check other elements we cache
	 expect(pc.cardElement.getAttribute("id")).toBe("st-card");
	 expect(pc.cardElement.element.tagName).toBe("DIV");

	 expect(pc.chipImg.getAttribute("id")).toBe("st-chip-logo");
	 expect(pc.chipImg.element.tagName).toBe("IMG");

	 expect(pc.logoImg.getAttribute("id")).toBe("st-payment-logo");
	 expect(pc.logoImg.element.tagName).toBe("IMG");
     });

test('getMaxEntryLimits', 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.getMaxEntryLimits()
	 
	 expect(pc.entryLimits).toMatchObject({pan: 19, securitycode: 4});
     });

test('setEventListeners', 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();

	 const expectAddCalls = {"pan": 4,
				 "expirydate": 4,
				 "nameoncard": 3,
				 "securitycode": 6,
				}
	 const expBindCalls = {"keyUp": 8,
			       "paste": 4,
			       "restrictNumerical": 3,
			       "focusSecurityCode": 1,
			       "blurSecurityCode": 1,
			      }

	 for (let element in expectAddCalls) {
	     pc.elements[element].addListener = jest.fn();
	 }
	 for (let bind in expBindCalls) {
	     pc[bind].bind = jest.fn((obj) => pc[bind]);
	 }

	 pc.setEventListeners();

	 for (let element in expectAddCalls) {
	     expect(pc.elements[element].addListener).toHaveBeenCalledTimes(expectAddCalls[element]);
	     expect(pc.elements[element].addListener).toHaveBeenNthCalledWith(1, "keyup", pc.keyUp);
	     expect(pc.elements[element].addListener).toHaveBeenNthCalledWith(2, "change", pc.keyUp);
	     expect(pc.elements[element].addListener).toHaveBeenNthCalledWith(3, "paste", pc.paste);
	 }

	 expect(pc.elements.pan.addListener).toHaveBeenNthCalledWith(4, "keypress", pc.restrictNumerical);
	 expect(pc.elements.expirydate.addListener).toHaveBeenNthCalledWith(4, "keypress", pc.restrictNumerical);
	 expect(pc.elements.securitycode.addListener).toHaveBeenNthCalledWith(4, "keypress", pc.restrictNumerical);
	 expect(pc.elements.securitycode.addListener).toHaveBeenNthCalledWith(5, "focus", pc.focusSecurityCode);
	 expect(pc.elements.securitycode.addListener).toHaveBeenNthCalledWith(6, "blur", pc.blurSecurityCode);

	 for (let bind in expBindCalls) {
	     const calls = expBindCalls[bind]
	     expect(pc[bind].bind).toHaveBeenCalledTimes(calls);
	     for (let i = 1; i <= calls; i++) {
		 expect(pc[bind].bind).toHaveBeenNthCalledWith(i, pc);
	     }
	 }
});

each([["pan", "4111", "4111", 1],
      ["pan", "41112222", "41112222", 1],// Not up to this function to format content (this is done by Payment.format functions)
      ["pan", "41112222111111111111", "41112222111111111111", 1],// Restricts due to card length
      ["pan", "4111 2222 1111 1111 1111", "4111 2222 1111 1111 11", 1],// formatted pan
      ["pan", "", "\u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219", 1],
      ["pan", "<input>", "&lt;input&gt;", 1],// Not up to this function to filter content (this is done by Payment.format functions)
      ["nameoncard", "", "MR J BLOGGS", 0],
      ["nameoncard", "41112222", "41112222", 0],
      ["nameoncard", "\u2219", "\u2219", 0],
      ["nameoncard", "<input />", "&lt;input /&gt;", 0], // Test escaping
      ["securitycode", "", "\u2219\u2219\u2219", 0],
      ["securitycode", "41", "41", 0],
      ["securitycode", "411", "411", 0],
      ["securitycode", "41112222", "4111", 0],
      ["securitycode", "41112222111111111111", "4111", 0],
      ["securitycode", "", "\u2219\u2219\u2219", 0],
      ["securitycode", "<b>", "&lt;b&gt;", 0],
      ["expirydate", "12 / 22", "12 / 22", 0],
      ["expirydate", "12/22", "12/22", 0],
      ["expirydate", "12/22222", "12/22222", 0],
      ["expirydate", "11 ", "11 ", 0],
      ["expirydate", "1", "1", 0],
      ["expirydate", "", "MM/YY", 0],
      ["expirydate", "<b>", "&lt;b&gt;", 0],
     ]
    ).test('updateOverlay', 
	   (type, value, expectedValue, expUpdatePan) => {
	       const pc = new PaymentCard.Card({init: false});
	       pc.template = realTemplate;
	       pc.createCard();
	       pc.setDomElements();
	       pc.getMaxEntryLimits();

	       pc.formatInput = jest.fn();
	       pc.elements[type].getAttribute = jest.fn();
	       pc.elements[type].getAttribute.mockReturnValueOnce(value);

	       pc.updateOverlay(type);
	       expect(pc.overlays[type].element.innerHTML).toBe(expectedValue);
	       expect(pc.formatInput).toHaveBeenCalledTimes(1);
	   });

each([["securitycode", "", "", ""],
      ["securitycode", "\u2219\u2219\u2219", "\u2219\u2219\u2219", "\u2219\u2219\u2219\u2219"],
      ["securitycode", "hello world", "hello world", "hello world"],
      ["pan", "", "", ""],
      ["pan", "\u2219\u2219\u2219", "\u2219\u2219\u2219", ""],
      ["pan", "hello world", "hello world", ""],
      ["pan", "55555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555", "5555555555555555555555", ""], // an unrealistic length with no limit
      ["nameoncard", "Hey there Delilah, what's it like in new york city?", "Hey there Delil\u2026", ""], // cutoff limit
      ["nameoncard", "Hey there Delil", "Hey there Delil", ""], // no cutoff char if not limited
      ["expirydate", "12 / 3456", "12 / 3456", ""],
      ["expirydate", "12345 / 67890", "12345 / 6", ""], // cutoff with no cuttof char
     ]).test('setOverlay',
	     (field, set, expected, fscExpected) => {
		 const pc = new PaymentCard.Card({init: false});
		 pc.template = realTemplate;
		 pc.createCard();
		 pc.setDomElements();
		 
		 pc.setOverlay(field, set);
		 expect(pc.overlays[field].element.innerHTML).toBe(expected);
		 expect(pc.overlays["frontsecuritycode"].element.innerHTML).toBe(fscExpected);// Just make sure this isn't changed for the pan
	     });

each([["", false],
      ["4", false],
      ["4111 1111 1111 1111", false],
      ["41111111111111111", false],
      ["4111 1111 1111 11111", true],
      ["4111 1111 1111 1111 1", true],
      ["4111 1111 1111 1111 ", true],
      ["55555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555 ", true],
      ["5100 1291 1111 11111", true],
      ["5100 1291 1111 1111", false],
     ])
.test('shouldCenter', 
     (value, expected) => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.createCard();
	 pc.setDomElements();
	 pc.elements.pan.setAttributes({"value": value})
	 expect(pc.shouldCenter()).toBe(expected);
     });

each([[{}, "", null, "", "st-hide-front-securitycode"],
      [{defaultCardType: "AMEX"}, "", "AMEX", "amex-logo", "st-AMEX st-detected"],
      [{}, "4111 1111 1111 1111", "VISA", "visa-logo", "st-VISA st-detected st-hide-front-securitycode"],
      [{}, "6011", "MAESTRO", "maestro-logo", "st-MAESTRO st-detected st-hide-front-securitycode"],
      [{minMatch: 5}, "6011", null, "", "st-hide-front-securitycode"],
      [{defaultCardType: "AMEX", maxMatch: 3}, "0000", null, "", "st-hide-front-securitycode"],
      [{}, "6011 0", "DISCOVER", "discover-logo", "st-DISCOVER st-detected st-hide-front-securitycode"],
      [{}, "41204", "VISA", "visa-logo", "st-VISA st-detected st-hide-front-securitycode"],
      [{}, "53", "MASTERCARD", "mastercard-logo", "st-MASTERCARD st-detected st-hide-front-securitycode"],
      [{}, "5100129111111111", "MASTERCARD", "mastercard-logo", "st-MASTERCARD st-detected st-hide-front-securitycode"], // this is a mastercarddebit card but we've rolled the brand up together
      [{}, "222", null, "", "st-hide-front-securitycode"],
      [{}, "888", null, "", "st-hide-front-securitycode"],
      [{}, "3456", "AMEX", "amex-logo", "st-AMEX st-detected"], // Amex doesn't flip
     ])
    .test('updatePan', 
     (config, pan, expectedCardType, expectedLogo, expectedClass) => {
	 config = Object.assign({init: false, onChangeCardType: jest.fn()}, config)
	 const pc = new PaymentCard.Card(config);
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();
	 pc.container.setAttributes({"class": ""});
	 pc.logos = {"VISA": "visa-logo", "MAESTRO": "maestro-logo", "MASTERCARD": "mastercard-logo", "DISCOVER": "discover-logo", "AMEX": "amex-logo"};
	 pc.cardDetails = {type: "oldcardtype"}
	 pc.container.setAttributes({"class": "st-oldcardtype"});
	 pc.elements.pan.setAttributes({"value": pan});
	 pc.updatePan();
	 expect(pc.cardDetails.type).toBe(expectedCardType);
	 expect(pc.logoImg.getAttribute("src")).toBe(expectedLogo);
	 expect(pc.container.getAttribute("class")).toBe(expectedClass);
	 expect(config.onChangeCardType).toHaveBeenCalledTimes(1);
     });

each([[{target: {name: "expirydate"}}, "expirydate"],
      [{target: {name: "securitycode"}}, "securitycode"],
      [{target: {name: "nameoncard"}}, "nameoncard"],
      [{target: {name: "pan"}}, "pan"],
     ]).test('keyUp',
	     (event, expected) => {
		 const pc = new PaymentCard.Card({init: false});
		 pc.updateOverlay = jest.fn();
		 pc.keyUp(event);
		 expect(pc.updateOverlay).toHaveBeenCalledTimes(1);
		 expect(pc.updateOverlay).toHaveBeenCalledWith(expected);
	     });

test('paste',
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 const event = {preventDefault: jest.fn()};
	 pc.paste(event);
	 expect(event.preventDefault).toHaveBeenCalledTimes(1);
	 expect(event.preventDefault).toHaveBeenCalledWith();
     });

each([["", null, true, 0],
      ["", {target: {name: "expirydate"}}, true, 0],
      ["", {target: {name: "expirydate"}, which: 47}, "preventDefault", 0],// /
      ["12", {target: {name: "expirydate"}, which: 47}, true, 1],// /
      ["12/", {target: {name: "expirydate"}, which: 47}, "preventDefault", 0],// /
      ["", {target: {name: "securitycode"}}, true, 0],
      ["", {target: {name: "securitycode"}, which: 8}, true, 0],// BACKSPACE
      ["", {target: {name: "securitycode"}, which: 9}, true, 0],// TAB
      ["", {target: {name: "securitycode"}, which: 10}, true, 0],// LF
      ["", {target: {name: "securitycode"}, which: 13}, true, 0],// CR
      ["", {target: {name: "securitycode"}, which: 32}, "preventDefault", 0],// SPACE
      ["", {target: {name: "securitycode"}, which: 85}, "preventDefault", 0],// U
      ["", {target: {name: "securitycode"}, which: 52}, true, 1],// 4
      ["1234", {target: {name: "securitycode"}, which: 52}, "preventDefault", 1],// 4
      ["55555555555555555555", {target: {name: "pan"}, which: 52}, "preventDefault", 1],// 2
      ["Elvis Isn't Dead", {target: {name: "nameoncard"}, which: 52}, true, 1],// we don't use restrictNumerical on the name for obvious reasons but it serves to prove that we don't restrict length based on displayLimits
     ]).test("restrictNumerical",
     (existing, e, expected, expFormats) => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.setDomElements();
	 pc.getMaxEntryLimits();
	 pc.formatInput = jest.fn();
	 global.event = {target: {name: "dummyGlobal"}};
	 if (e !== null) {
	     pc.elements[e.target.name].setAttributes({value: existing});
	     e.preventDefault = jest.fn();
	     e.preventDefault.mockReturnValue("preventDefault");
	 }
	 expect(pc.restrictNumerical(e)).toBe(expected);

	 if (e !== null) {
	     let expPrevent = 0
	     if (expected == "preventDefault") {
		 expPrevent = 1;
	     }
	     expect(e.preventDefault).toHaveBeenCalledTimes(expPrevent);
	 }
	 expect(pc.formatInput).toHaveBeenCalledTimes(expFormats);
     });

each([["securitycode", "1066", null],
      ["expirydate", "1066", {value: "10/66"}],
      ["expirydate", "2", {value: "02"}],
      ["expirydate", "12/", null],
      ["expirydate", "##/###", {value: "/"}],
      ["expirydate", "21066", {value: "02/1066"}],
      ["expirydate", "210 / 66", {value: "02/1066"}],
      ["pan", "", null],
      ["pan", "37", null],
      ["pan", "4111111111111111", {value: "4111 1111 1111 1111"}],// most types use this format
      ["pan", "377722222211111", {value: "3777 222222 11111"}],// amex cards have their own format (diners does this too)
      ["pan", "111111111111111", null],// no recognised type: no format
     ]).test("formatInput",
	     (field, value, expected) => {
		 const pc = new PaymentCard.Card({init: true});
		 pc.updatePan = jest.fn(pc.updatePan);
		 const input = pc.elements[field];
		 input.setAttributes({value: value});

		 input.setAttributes = jest.fn();// Want's to be after we've set the value for the test but before the call to formatInput
		 pc.formatInput(field);
		 let called = 0;
		 if (expected !== null) {
		     expect(input.setAttributes).toHaveBeenCalledWith(expected);
		     called = 1;
		 }
		 expect(input.setAttributes).toHaveBeenCalledTimes(called);
		 
		 let expUpdatePan = 0;
		 if (field == "pan") {
		     expUpdatePan = 1;
		 }
		 expect(pc.updatePan).toHaveBeenCalledTimes(expUpdatePan);
	     });

each([[["AMEX"], "VISA", true],
      [["AMEX"], "AMEX", false],
      [["VISA", "AMEX"], "AMEX", false],
      [["VISA", "AMEX"], "VISA", false],
      [["VISA", "AMEX"], "MASTERCARD", true],
      [["VISA", "AMEX", "MASTERCARD"], "MASTERCARD", false],
      [[], "AMEX", true],
     ])
.test('shouldFlip', 
     (doNotFlip, cardType, expected) => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.doNotFlip = doNotFlip;
	 pc.cardDetails = {type: cardType};
	 expect(pc.shouldFlip()).toBe(expected);
     });

test('focusSecurityCode', 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();
	 pc.cardElement.addClass = jest.fn();
	 pc.cardElement.removeClass = jest.fn();
	 pc.focusSecurityCode()
	 expect(pc.cardElement.addClass.mock.calls).toMatchObject([["st-is-flipped"]]);
	 expect(pc.cardElement.removeClass.mock.calls).toMatchObject([]);// Not called
     });

test('focusSecurityCode_noFlip', 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();
	 pc.cardDetails = {type: "AMEX"}; // Amex doesn't flip
	 pc.cardElement.addClass = jest.fn();
	 pc.cardElement.removeClass = jest.fn();
	 pc.focusSecurityCode()
	 expect(pc.cardElement.addClass.mock.calls).toMatchObject([]);// Not called
	 expect(pc.cardElement.removeClass.mock.calls).toMatchObject([]);// Not called
     });

test('blurSecurityCode', 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();
	 pc.cardElement.addClass = jest.fn();
	 pc.cardElement.removeClass = jest.fn();
	 pc.blurSecurityCode()
	 expect(pc.cardElement.addClass.mock.calls).toMatchObject([]);
	 expect(pc.cardElement.removeClass.mock.calls).toMatchObject([["st-is-flipped"]]);
     });
