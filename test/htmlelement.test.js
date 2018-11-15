const jsdom = require("jsdom");
import each from 'jest-each';
const { JSDOM } = jsdom;
const defaultHtml = `<!DOCTYPE html><body><div id="basic"></div><div id="another"><div id="sub"></div></div></body></html>`;
const { document } = (new JSDOM(defaultHtml)).window;
global.document = document;
const HtmlElement = require('../src/htmlelement');
const EventEmitter = require('events');

expect.extend({
    throws(callback, error) {
	let result = {pass: true};
	if (error  == null) {
	    callback();
	} else {
	    try {
		expect(callback).toThrow(error);
	    } catch (e) {
		result = {pass: false,
			  message: () => e.message,
			 }
	    }
	}
	return result
    }
});

each([["myelement", undefined, undefined, "<myelement></myelement>"],
      ["bob", undefined, undefined, "<bob></bob>"],
      [document.createElement("div"), undefined, undefined, "<div></div>"],
      ["bob", {}, undefined, "<bob></bob>"],
      ["bob", {"anything":"something"}, undefined, "<bob anything=\"something\"></bob>"],
      ["bob", {"onlick":"alert('hello');"}, undefined, "<bob onlick=\"alert('hello');\"></bob>"],
      ["bob", {"markup":'"><p>inject me</p>"'}, undefined, "<bob markup=\"&quot;><p>inject me</p>&quot;\"></bob>"],// HTML Escaped
      ["bob", {"anything":"something"}, "", "<bob anything=\"something\"></bob>"],
      ["bob", {"anything":"something"}, "my text value\u2219\u263A", "<bob anything=\"something\">my text value\u2219\u263A</bob>"],
      ["p", {"class":"myclass"}, "my super <p>paragraph</p>", "<p class=\"myclass\">my super &lt;p&gt;paragraph&lt;/p&gt;</p>"],
      [document.createElement("p"), {"class":"myclass"}, "my super paragraph", "<p class=\"myclass\">my super paragraph</p>"],
      ["iframe", {"class":"__privateFieldFrame", "src": "https://webserivces.securetrading.com"}, "", "<iframe class=\"__privateFieldFrame\" src=\"https://webserivces.securetrading.com\"></iframe>"],
     ]).test("HtmlElement.constructor",
	     (element, attributes, text, expected) => {
		 const inst = new HtmlElement.HtmlElement(element, attributes, text);
		 expect(inst.element.outerHTML).toBe(expected);
	     });

each([["p", "p"],
      [document.createElement("p"), "p"],
      ["div", "div"],
      ["iframe", "iframe"]
     ]).test("HtmlElement._create",
	     (element, expectedTag) => {
		 const inst = new HtmlElement.HtmlElement(element);
		 inst.element = undefined;
		 expect(inst._create(element).outerHTML).toBe(document.createElement(expectedTag).outerHTML);
	     });

each([["<input name='expirydate' />", "input[name=expirydate]", null],
      ["<div class='cypress'></div>", ".cypress", null],
      ['<div id="st-card-container"><div id="st-card"><div class="st-card-side" id="st-front"><img id="st-chip-logo" /><img id="st-payment-logo" /><div id="st-pan-overlay"></div><div id="st-expirydate-overlay"></div><div id="st-billingfirstname-overlay"></div><div id="st-securitycode-overlay-front"></div></div><div class="st-card-side" id="st-back"><div id="st-track2"></div><div id="st-signature"></div><div id="st-securitycode-overlay"></div></div></div></div>', "#st-securitycode-overlay", null],
      ['<form id="payment-form"><h1>Sample payment form</h1><div id="st-card-outer-container"></div><label for="nameoncard">Name on card:</label><input type="text" name="billingfirstname" value="" /><label for="pan">Card number:</label><input type="text" name="pan" value="" /><label for="expirydate">Expiry date:</label><input type="text" name="expirydate" value="" /><label for="securitycode">Security code:</label><input type="text" name="securitycode" value="" /><input id="submit-btn" type="submit" value="Pay" /></form>', "form", null],
      ["", "input[name=expirydate]", new TypeError("Could not find element by CSS selector (input[name=expirydate])")],
      ["div class='cypress'", ".cypress", new TypeError("Could not find element by CSS selector (.cypress)")],
      ["", "", new SyntaxError("'' is not a valid selector")],
     ]).test("HtmlElement.bySelector",
	     (html, selector, error) => {
		 const testContainer = document.getElementById("basic");
		 testContainer.innerHTML = html;
		 let inst = null;
		 expect(() => inst = HtmlElement.HtmlElement.bySelector(selector)).throws(error);
		 if (!error) {
		     expect(inst).toEqual(new HtmlElement.HtmlElement(document.querySelector(selector)));
		 }
		 testContainer.innerHTML = "";
	     });

each([[null, "anything", "a value", null, "a value"],
      [null, "anything", "", null, ""],
      [{test: ""}, "test", "bob", "", "bob"],
      [{anattr: ""}, "anattr", "a-value", "", "a-value"],
      [{myattr: "abc"}, "myattr", "something with a space", "abc", "something with a space"],
      [{myattr: "abc"}, "myattr", false, "abc", null],
      [{onclick: "abc something"}, "onclick", "alert('hello world');", "abc something", "alert('hello world');"]
     ]).test("HtmlElement.getAttribute_setAttributes_removeAttribute", // personally would split this up more - could be made into a few even simpler tests with less parameters in the test funcs
	     (attrsBefore, attrName, attrValue, expectedBefore, expected) => {
		 const inst = new HtmlElement.HtmlElement("div");
		 if (attrsBefore !== null) {
		     inst.setAttributes(attrsBefore);
		 }
		 expect(inst.getAttribute(attrName)).toBe(expectedBefore);
		 const attrs = {};
		 attrs[attrName]=attrValue;
		 inst.setAttributes(attrs);
		 expect(inst.getAttribute(attrName)).toBe(expected);
		 inst.removeAttribute(attrName);
		 expect(inst.getAttribute(attrName)).toBe(null);
	     });

each([["div", "click", "a", 0, TypeError],
      ["div", "click", jest.fn(), 1, null],
      ["div", "click", 1, 0, TypeError],
      ["div", "submit", jest.fn(), 1, null],// Can't add a "submit" function to a div since it doesn't submit ...
      ["form", "submit", jest.fn(), 1, null],// ... But can add a "submit" function to a form
      ["input", "keyup", jest.fn(), 1, null],
      ["div", "focus", jest.fn(), 1, null],
      ["input", "paste", jest.fn(), 1, null],
      ["input", "keypress", jest.fn(), 1, null],
     ]).test("HtmlElement.addListener",
	     (element, event, listener, expected, error) => {
		 const inst = new HtmlElement.HtmlElement(element);
		 expect(() => inst.addListener(event, listener)).throws(error);

		 const trigger = document.createEvent("Event");
		 trigger.initEvent(event)
		 inst.element.dispatchEvent(trigger);

		 if (expected) {
		     expect(listener).toHaveBeenCalledTimes(expected);
		     expect(listener).toHaveBeenCalledWith(trigger);
		 }
	     });

each([[document.createElement("p"), "<p></p>", "<p><div></div></p>"],
      [document.createElement("div"), "<div></div>", "<div><div></div></div>"],
      [document.createElement("iframe"), "<iframe></iframe>", "<iframe><div></div></iframe>"],      
     ]).test("HtmlElement.appendTo",
	     (obj, expectedBefore, expected) => {
		 const inst = new HtmlElement.HtmlElement("div");
		 expect(obj.outerHTML).toBe(expectedBefore);
		 inst.appendTo(obj);
		 expect(obj.outerHTML).toBe(expected);
	     });

each([[document.createElement("p"), "<div><p></p></div>"],
      [document.createElement("div"), "<div><div></div></div>"],
      [document.createElement("iframe"), "<div><iframe></iframe></div>"],
     ]).test("HtmlElement.append",
	     (obj, expected) => {
		 const inst = new HtmlElement.HtmlElement("div");
		 expect(inst.element.outerHTML).toBe("<div></div>");
		 inst.append(obj);
		 expect(inst.element.outerHTML).toBe(expected);
	     });

class MockDomElement {
    constructor() {
	this.className = null;
    }
    setAttribute(name, value) {
	this.className = value;
    }
    getAttribute(name) {
	let result = this.className
	if (result) {
	    result = result.trim()
	}
	return result;
    }
}
each([["div", null, "st-test-class", "st-test-class"],
      ["div", "", "st-test-class", "st-test-class"],
      ["div", "", "st-another", "st-another"],
      ["div", "abc", "st-test-case", "abc st-test-case"],
      ["div", "abc", "abc", "abc"],// Add and remove a class which already existed
      ["div", "abc something", "st-test-case", "abc something st-test-case"],
      [new MockDomElement(), null, "st-test-class", "st-test-class"],
      [new MockDomElement(), "", "st-test-class", "st-test-class"],
      [new MockDomElement(), "", "st-another", "st-another"],
      [new MockDomElement(), "abc", "st-test-case", "abc st-test-case"],
      [new MockDomElement(), "abc", "abc", "abc"],// Add and remove a class which already existed
      [new MockDomElement(), "abc something", "st-test-case", "abc something st-test-case"],
      [new MockDomElement(), "abc", "", "abc"],// Add and remove a class which doesn't exist (this would not be valid for classList due to it's validation)
     ]).test("HtmlElement.addClass__hasClass_removeClass", // personally would split this up more - could be made into a few even simpler tests with less parameters in the test funcs
	     (node, classBefore, className, expected) => {
		 const preexisting = !!(classBefore && className && classBefore.includes(className));
		 const inst = new HtmlElement.HtmlElement(node);
		 const element = inst.element;
		 if (classBefore !== null) {
		     element.setAttribute("class", classBefore);
		 }
		 let actual = null;
		 expect(inst._hasClass(className)).toBe(preexisting);
		 inst.addClass(className);
		 expect(inst._hasClass(className)).toBe(!!className);
		 actual = element.getAttribute("class");
		 expect(actual).toBe(expected);
		 inst.removeClass(className);
		 expect(inst._hasClass(className)).toBe(false);
		 actual = element.getAttribute("class");
		 expected = classBefore;
		 if (preexisting) {
		      expected = "";
		 } else if (classBefore === null) {
		     expected = "";
		 }
		 expect(actual).toBe(expected);
	     });

each([["my text", undefined, "<div>my text</div>"],
      ["bob", undefined, "<div>bob</div>"],
      ["", undefined, "<div></div>"],
      ["<a href='http://mysite.com'></a>", undefined, "<div>&lt;a href='http://mysite.com'&gt;&lt;/a&gt;</div>"], // HTML escaped
      ["<a href='http://mysite.com'></a>", true, "<div>&lt;a href='http://mysite.com'&gt;&lt;/a&gt;</div>"], // HTML escaped
      ["<a href='http://mysite.com'></a>", false, "<div><a href=\"http://mysite.com\"></a></div>"], // HTML unescaped
     ]).test("HtmlElement.setHtml",
	     (textToAdd, escape, expected) => {
		 const inst = new HtmlElement.HtmlElement("div");
		 expect(inst.element.outerHTML).toBe("<div></div>");
		 inst.setHtml(textToAdd, escape);
		 expect(inst.element.outerHTML).toBe(expected);
	     });


each([["my text", undefined, "my text"],
      ["bob", undefined, "bob"],
      ["", undefined, ""],
      ["<a href='http://mysite.com'></a>", undefined, "&lt;a href='http://mysite.com'&gt;&lt;/a&gt;"], // HTML escaped
     ]).test("HtmlElement.setHtml",
	     (textToAdd, escape, expected) => {
		 expect(HtmlElement.escapeHtml(textToAdd)).toBe(expected);
	     });

each([["basic", "div[id=basic]", true],
      ["sub", ":-webkit-autofill", false],
      ["sub", ":webkit-autofill", false], // This is considered an invalid selector
      ["basic", "div[id=sub]", false],
     ]).test("HtmlElement.matches",
	     (id, selector, expected) => {
		 const element = HtmlElement.HtmlElement.bySelector("div[id="+id+"]");
		 expect(element.matches(selector)).toBe(expected);
		 element.element.msMatchesSelector = element.element.matches;
		 element.element.matches = undefined;// I.E. doesn't have this defined so we should use msMatchesSelector instead
		 expect(element.matches(selector)).toBe(expected);
	     });

each([["basic", "BODY", ""],
      ["another", "BODY", ""],
      ["sub", "DIV", "another"],
     ]).test("HtmlElement.getParent",
	     (id, expTag, expId) => {
		 const element = HtmlElement.HtmlElement.bySelector("div[id="+id+"]");
		 const parent = element.getParent();
		 expect(parent.tagName).toBe(expTag);
		 expect(parent.id).toBe(expId);
	     });
