const jsdom = require("jsdom");
import each from 'jest-each';
const { JSDOM } = jsdom;
const defaultHtml = `<!DOCTYPE html><body><p>Hello world</p><div id="st-card-outer-container"></div><form><input name="pan" /><input name="expirydate" /><input name="securitycode" /><input name="nameoncard" /></form></body></html>`;
const { document, CustomEvent} = (new JSDOM(defaultHtml)).window;
global.document = document;
global.CustomEvent = CustomEvent;

const events = require('../src/events');

test("events.CreateEvent",
    () => {
	const type = "event";
	const ev = new events.CreateEvent(type);
	expect(ev).toEqual(new CustomEvent(type));
	const oldDocument = global.document;
	try {
	    global.document = {};
	    const ev = new events.CreateEvent(type);
	    const expected = oldDocument.createEvent("CustomEvent");
	    expected.initEvent(type, false, false);
	    expect(ev).toEqual(expected);
	} finally {
	    global.document = oldDocument;
	}
    });

each([[[], {}],
      [[{type: "new"}, {type: "old"}], {new: {type: "new"}, old: {type: "old"}}],
     ])
.test("events.ChangeCardTypeEvent",
    (args, expected) => {
	const ev = new events.ChangeCardTypeEvent(...args);
	expect(ev.cardType).toEqual(expected)
    });
