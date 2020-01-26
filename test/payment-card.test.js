const jsdom = require("jsdom");
import each from 'jest-each';
const { JSDOM } = jsdom;
import { PaymentsUtils } from "@securetrading/js-payments-utils";
const defaultHtml = `<!DOCTYPE html><body><p>Hello world</p><div id="st-card-outer-container"></div><form><input name="pan" /><input name="expirydate" /><input name="securitycode" /><input name="nameoncard" /></form></body></html>`;
const { document, CustomEvent} = (new JSDOM(defaultHtml)).window;
global.document = document;
global.CustomEvent = CustomEvent;
global.EventTarget = class {
    constructor() {
	this.dispatchEvent = jest.fn();
	this.addEventListener = jest.fn();
    }
}; // This is a shim for EventTarget because the one in JSDOM doesn't behave as expected
const PaymentCard = require('../src/payment-card');
const fs = require("fs");
const realTemplate = fs.readFileSync(__dirname + '/../src/template.html', 'utf8');


test("PaymentCard.auto_init", // Checks we automatically call init
     () => {
	 const pc = new PaymentCard.Card({});
	 const container = document.querySelector("#st-card-outer-container");
	 // Check something that happens in init has happened like setting up the overlays
	 expect(pc.overlays.pan.element.innerHTML).toBe("\u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219");
	 expect(pc.chipImg.getAttribute("src")).toBe("st-mock-file");
     });

test("PaymentCard.init", // Check what we can"t check in auto_init because we need to mock it before it"s called
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 const container = document.querySelector("#st-card-outer-container");
	 pc.updatePan = jest.fn();
	 pc.updateOverlay = jest.fn();
	 pc.setEventListeners = jest.fn();

	 pc.init();

	 expect(pc.updatePan).toHaveBeenCalledTimes(1);
	 expect(pc.updateOverlay).toHaveBeenCalledTimes(4);
	 expect(pc.updateOverlay).toHaveBeenNthCalledWith(1, "pan");
	 expect(pc.updateOverlay).toHaveBeenNthCalledWith(2, "expirydate");
	 expect(pc.updateOverlay).toHaveBeenNthCalledWith(3, "securitycode");
	 expect(pc.updateOverlay).toHaveBeenNthCalledWith(4, "nameoncard");
	 expect(pc.elements.expirydate.getAttribute("placeholder")).toBe("MM/YY");
	 expect(pc.setEventListeners).toHaveBeenCalledTimes(1);
     });

each([[{}, {init: true}, []],
      [{init: false}, {init: false}, []],
      [{supported: ["VISA"]}, {init: true}, []],
      [{init: false, supported: ["VISA", "MASTERCARD"]}, {init: false}, []],
      [{init: true}, {init: true}, []],
      [{init: false, listeners: {"changeCardType": "callback"}}, {init: false}, [["changeCardType", "callback"]]],
      [{init: false, listeners: {}}, {init: false}, []],
     ])
.test("PaymentCard.setConfig", // Check different options get set on config correctly
     (testConfig, expected, listeners) => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.config = testConfig;
	 pc.addEventListener = jest.fn();
	 pc.setConfig();
	 expect(pc.config).toMatchObject(expected); // WARNING: toMatchObject only tests the keys in the expected are a subset of the actual - to test against {} we MUST use toEqual
	 expect(pc.addEventListener).toHaveBeenCalledTimes(listeners.length);
	 for (let i in listeners) {
	     expect(pc.addEventListener).toHaveBeenNthCalledWith(1+parseInt(i), ...listeners[i]);
	 }
     });

each([["hello world", "hello world"],
      ["<div>Some html</div>", "<div>Some html</div>"], // We have turned escaping off because we control the template we don't expect &lt; etc...
      ["\u2219\u263A", "\u2219\u263A"], // Make sure unicode characters work
     ]).test("PaymentCard.createCard", 
	     (template, expected) => {
		 const pc = new PaymentCard.Card({init: false});
		 pc.template = template;
		 pc.createCard();
		 const container = document.querySelector("#st-card-outer-container");
		 expect(container.innerHTML).toBe(expected);
	     });

test("PaymentCard.setDomElements", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();

	 // Check the elements
	 expect(pc.elements.pan).toMatchObject({name: "pan", exposedAttributes: ["value"]}); // WARNING: toMatchObject only tests the keys in the expected are a subset of the actual - to test against {} we MUST use toEqual
	 expect(pc.elements.pan.element).toMatchObject({type: "text"}); // WARNING: toMatchObject only tests the keys in the expected are a subset of the actual - to test against {} we MUST use toEqual
	 expect(pc.elements.pan.element.tagName).toBe("INPUT");
	 expect(pc.elements.expirydate).toMatchObject({name: "expirydate"}); // WARNING: toMatchObject only tests the keys in the expected are a subset of the actual - to test against {} we MUST use toEqual
	 expect(pc.elements.securitycode).toMatchObject({name: "securitycode"}); // WARNING: toMatchObject only tests the keys in the expected are a subset of the actual - to test against {} we MUST use toEqual
	 expect(pc.elements.nameoncard).toMatchObject({name: "nameoncard"}); // WARNING: toMatchObject only tests the keys in the expected are a subset of the actual - to test against {} we MUST use toEqual

	 // Check the autofills
	 expect(pc.autofillElements.expirymonth.getAttribute("autocomplete")).toBe("cc-exp-month");
	 expect(pc.autofillElements.expiryyear.getAttribute("autocomplete")).toBe("cc-exp-year");
	 expect(pc.elements.pan.getAttribute("autocomplete")).toBe("cc-number");

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

test("PaymentCard.setAutocomplete", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();

	 pc.setAutocomplete();
	 expect(pc.elements.pan.getAttribute("autocomplete")).toBe("cc-number");
	 expect(pc.elements.expirydate.getAttribute("autocomplete")).toBe("cc-exp");
	 expect(pc.elements.securitycode.getAttribute("autocomplete")).toBe("cc-csc");
	 expect(pc.elements.nameoncard.getAttribute("autocomplete")).toBe("cc-name");
	 expect(pc.elements.nameoncard.getAttribute("tabindex")).toBe("0");
     });

test("PaymentCard.addAutofillElement", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();

	 pc.autofillElements = {};
	 pc.addAutofillElement("bob", "cc-exp-month", pc.elements.pan.getParent());
	 expect(pc.autofillElements["bob"].getAttribute("type")).toBe("number");
	 expect(pc.autofillElements["bob"].getAttribute("autocomplete")).toBe("cc-exp-month");
	 expect(pc.autofillElements["bob"].getAttribute("class")).toBe("autofill-input");

	 expect(pc.elements.pan.getParent().lastChild).toBe(pc.autofillElements["bob"].element);

	 pc.addAutofillElement("steve", "anything", pc.elements.pan.getParent());
	 expect(pc.autofillElements["bob"].getAttribute("type")).toBe("number");
	 expect(pc.autofillElements["bob"].getAttribute("autocomplete")).toBe("cc-exp-month");
	 expect(pc.autofillElements["bob"].getAttribute("class")).toBe("autofill-input");
	 expect(pc.autofillElements["bob"].getAttribute("tabindex")).toBe("-1");
	 expect(pc.autofillElements["steve"].getAttribute("type")).toBe("number");
	 expect(pc.autofillElements["steve"].getAttribute("autocomplete")).toBe("anything");
	 expect(pc.autofillElements["steve"].getAttribute("class")).toBe("autofill-input");

	 expect(pc.elements.pan.getParent().lastChild).toBe(pc.autofillElements["steve"].element);
     });

test("PaymentCard.getMaxEntryLimits", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.getMaxEntryLimits()
	 
	 expect(pc.entryLimits).toMatchObject({pan: 19, securitycode: 4}); // WARNING: toMatchObject only tests the keys in the expected are a subset of the actual - to test against {} we MUST use toEqual
     });

test("PaymentCard.setEventListeners", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();

	 const expectAddCalls = {"pan": 6,
				 "expirydate": 4,
				 "nameoncard": 3,
				 "securitycode": 6,
				}
	 const expBindCalls = {"keyUp": 8,
			       "paste": 4,
			       "restrictNumerical": 3,
			       "focusSecurityCode": 1,
			       "blurSecurityCode": 1,
			       "onAutofill": 3,
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
each([[{animationName: "unknown"}, 0, 0],
      [{animationName: "autofillstart"}, 1, 0],
      [{type: "blur"}, 1, 0],
      [{type: "other"}, 0, 0],
      [{animationName: "autofillcancel"}, 0, 1],
      [{animationName: "autofillcancel", type: "other"}, 0, 1],
      [{animationName: "autofillcancel", type: "blur"}, 1, 0],
      ]
    ).test("PaymentCard.onAutofill", 
	   (event, expAutofill, expCancelAutofill) => {
	       const e = event;
	       const pc = new PaymentCard.Card({init: false});
	       pc.autofillExpiry = jest.fn();
	       pc.cancelAutofill = jest.fn();
	       pc.template = realTemplate;
	       pc.createCard();
	       pc.onAutofill(e)
	       setTimeout(function(){
		   expect(pc.autofillExpiry).toHaveBeenCalledTimes(expAutofill);
		   expect(pc.cancelAutofill).toHaveBeenCalledTimes(expCancelAutofill);
	       }, 80); // Have to wait for after the autofillExpiry might have been called

	   });

test("PaymentCard.autofillExpiry",
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.createCard();
	 pc.setDomElements();
	 pc.updateOverlay = jest.fn();
	 try {
	     expect(pc.elements.expirydate.getAttribute("value")).toBe("");
	     pc.autofillExpiry();

	     expect(pc.updateOverlay).toHaveBeenCalledTimes(0);
	     expect(pc.elements.expirydate.getAttribute("value")).toBe("");
	     
	     pc.autofillElements.expirymonth.setAttributes({"value": "12"})
	     pc.autofillElements.expiryyear.setAttributes({"value": "2022"})
	     
	     pc.autofillSelector = "input[name=pan]";   
	     expect(pc.elements.pan.getAttribute("class")).toBe(null);

	     pc.autofillExpiry();

	     expect(pc.elements.pan.getAttribute("class")).toBe("is-autofilled");
	     expect(pc.elements.expirydate.getAttribute("class")).toBe("is-autofilled");
	     expect(pc.elements.securitycode.getAttribute("class")).toBe(null); // This isn't the expirydate or the one identified by the selector

	     expect(pc.elements.expirydate.getAttribute("value")).toBe("12/2022");

	 } finally { // Reset the dom after this test as it modifies it too much for other tests to cope with
	     const { document, CustomEvent} = (new JSDOM(defaultHtml)).window;
	     global.document = document;
	 }
     });

test("PaymentCard.cancelAutofill",
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.createCard();
	 pc.setDomElements();
	 pc.elements.pan.addClass("is-autofilled")
	 pc.elements.nameoncard.addClass("is-autofilled")
	 pc.elements.nameoncard.addClass("another")
	 expect(pc.elements.pan.getAttribute("class")).toBe("is-autofilled");
	 expect(pc.elements.nameoncard.getAttribute("class")).toBe("is-autofilled another");
	 expect(pc.elements.expirydate.getAttribute("class")).toBe(null);
	 pc.cancelAutofill();
	 expect(pc.elements.pan.getAttribute("class")).toBe("");
	 expect(pc.elements.nameoncard.getAttribute("class")).toBe("another");
	 expect(pc.elements.expirydate.getAttribute("class")).toBe(null);
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
    ).test("PaymentCard.updateOverlay", 
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

each([["securitycode", "", "", false, ""],
      ["securitycode", "\u2219\u2219\u2219", "\u2219\u2219\u2219", false, "\u2219\u2219\u2219\u2219"],
      ["securitycode", "hello world", "hello world", false, "hello world"],
      ["pan", "", "", false, ""],
      ["pan", "\u2219\u2219\u2219", "\u2219\u2219\u2219", false, ""],
      ["pan", "hello world", "hello world", false, ""],
      ["pan", "55555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555", "5555555555555555555555", true, ""], // an unrealistic length with no limit
      ["nameoncard", "Hey there Delilah, what's it like in new york city?", "Hey there Delil\u2026", false, ""], // cutoff limit
      ["nameoncard", "Hey there Delil", "Hey there Delil", false, ""], // no cutoff char if not limited
      ["expirydate", "12 / 3456", "12 / 3456", false, ""],
      ["expirydate", "12345 / 67890", "12345 / 6", false, ""], // cutoff with no cuttof char
     ]).test("PaymentCard.setOverlay",
	     (field, set, expected, expectCenter, fscExpected) => {
		 const pc = new PaymentCard.Card({init: false});
		 pc.template = realTemplate;
		 pc.createCard();
		 pc.container.removeClass("st-card-centered")// so we have a standard baseline for all cases (else it doesn't reset when we test fields that shouldn't change it)
		 pc.setDomElements();
		 
		 pc.setOverlay(field, set);
		 expect(pc.overlays[field].element.innerHTML).toBe(expected);
		 expect(pc.container._hasClass("st-card-centered")).toBe(expectCenter);
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
.test("PaymentCard.shouldCenter", 
     (value, expected) => {
	 const pc = new PaymentCard.Card({init: false});
	 expect(pc.shouldCenter(value)).toBe(expected);
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
    .test("PaymentCard.updatePan", 
     (config, pan, expectedCardType, expectedLogo, expectedClass) => {
	 config = Object.assign({init: false, onChangeCardType: jest.fn()}, config)
	 const pc = new PaymentCard.Card(config);
	 pc.dispatchEvent = jest.fn();
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
	 expect(pc.dispatchEvent).toHaveBeenCalledTimes(1);
	 const expEvent = new CustomEvent("changeCardType", {});
	 expEvent.cardType = {old: {type: "oldcardtype"},
			      new: PaymentsUtils.iinLookup.getCard(expectedCardType) || {type: null},
			      }
	 expect(pc.dispatchEvent).toHaveBeenCalledWith(expEvent);
     });

each([[{target: {name: "expirydate"}}, "expirydate"],
      [{target: {name: "securitycode"}}, "securitycode"],
      [{target: {name: "nameoncard"}}, "nameoncard"],
      [{target: {name: "pan"}}, "pan"],
     ]).test("PaymentCard.keyUp",
	     (event, expected) => {
		 const pc = new PaymentCard.Card({init: false});
		 pc.updateOverlay = jest.fn();
		 pc.keyUp(event);
		 expect(pc.updateOverlay).toHaveBeenCalledTimes(1);
		 expect(pc.updateOverlay).toHaveBeenCalledWith(expected);
	     });

test("PaymentCard.paste",
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
     ]).test("PaymentCard.restrictNumerical",
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
     ]).test("PaymentCard.formatInput",
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
.test("PaymentCard.shouldFlip", 
     (doNotFlip, cardType, expected) => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.doNotFlip = doNotFlip;
	 pc.cardDetails = {type: cardType};
	 expect(pc.shouldFlip()).toBe(expected);
     });

test("PaymentCard.focusSecurityCode", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();
	 pc.cardElement.addClass = jest.fn();
	 pc.cardElement.removeClass = jest.fn();
	 pc.focusSecurityCode()
	 expect(pc.cardElement.addClass).toHaveBeenCalledTimes(1);
	 expect(pc.cardElement.addClass).toHaveBeenCalledWith("st-is-flipped");
	 expect(pc.cardElement.removeClass).toHaveBeenCalledTimes(0);
     });

test("PaymentCard.focusSecurityCode_noFlip", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();
	 pc.cardDetails = {type: "AMEX"}; // Amex doesn't flip
	 pc.cardElement.addClass = jest.fn();
	 pc.cardElement.removeClass = jest.fn();
	 pc.focusSecurityCode()
	 expect(pc.cardElement.addClass).toHaveBeenCalledTimes(0);
	 expect(pc.cardElement.removeClass).toHaveBeenCalledTimes(0);
     });

test("PaymentCard.blurSecurityCode", 
     () => {
	 const pc = new PaymentCard.Card({init: false});
	 pc.template = realTemplate;
	 pc.createCard();
	 pc.setDomElements();
	 pc.cardElement.addClass = jest.fn();
	 pc.cardElement.removeClass = jest.fn();
	 pc.blurSecurityCode()
	 expect(pc.cardElement.addClass).toHaveBeenCalledTimes(0);
	 expect(pc.cardElement.removeClass).toHaveBeenCalledTimes(1);
	 expect(pc.cardElement.removeClass).toHaveBeenCalledWith("st-is-flipped");
     });
