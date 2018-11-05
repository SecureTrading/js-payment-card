const jsdom = require("jsdom");
import each from 'jest-each';
const { JSDOM } = jsdom;
const defaultHtml = `<!DOCTYPE html><body><p>Hello world</p><div id="st-card-outer-container"></div><form><input name="pan" /><input name="expirydate" /><input name="securitycode" /><input name="nameoncard" /></form></body></html>`;
const { CustomEvent} = (new JSDOM(defaultHtml)).window;
global.CustomEvent = CustomEvent;

const EventTarget = require('../src/eventtarget');
const testCallback = jest.fn();
const testCallback2 = jest.fn();

test('EventTarget.constructor', // Checks we automatically call init
     () => {
	const et = new EventTarget.EventTarget();
	expect(et.listeners).toEqual({});
     });

test("EventTarget.addUseRemoveListener",
    () => {
	const et = new EventTarget.EventTarget();
	const callback = jest.fn();
	const callback2 = jest.fn();
	// addEventListener: Register two callback functions for this event
	et.addEventListener("event", callback);
	expect(et.listeners).toEqual({event: [callback]});
	et.addEventListener("event", callback2);
	expect(et.listeners).toEqual({event: [callback, callback2]});
	// dispatchEvent: Create and dispatch two unique events
	// WARNING: these need to have different properties applied because otherwise .toHaveBeenNthCalledWith can't tell the difference
	const ev1 = new CustomEvent("event", {detail: 1});
	ev1.testname = "one"
	et.dispatchEvent(ev1);
	const ev2 = new CustomEvent("event", {detail: 2});
	ev2.testid = 2
	et.dispatchEvent(ev2);
	// dispatchEvent: Check that both callback functions have been called for each event
	expect(callback).toHaveBeenCalledTimes(2);
	expect(callback).toHaveBeenNthCalledWith(1, ev1);
	expect(callback).toHaveBeenNthCalledWith(2, ev2);
	expect(callback2).toHaveBeenCalledTimes(2);
	expect(callback2).toHaveBeenNthCalledWith(1, ev1);
	expect(callback2).toHaveBeenNthCalledWith(2, ev2);
	// removeEventListener: Remove each callback function
	et.removeEventListener("event", callback);
	expect(et.listeners).toEqual({event: [callback2]});
	et.removeEventListener("event", callback); // Removing a function that isn't registered - it doesn't touch the other one
	expect(et.listeners).toEqual({event: [callback2]});
	et.removeEventListener("event", callback2);
	expect(et.listeners).toEqual({event: []});
	// dispatchEvent: Create and dispatch an event with no handler registered
	const ev3 = new CustomEvent("event", {detail: 1});
	ev3.testinfo = "three"
	et.dispatchEvent(ev3);
	// dispatchEvent: Check that both callback functions have not been called again
	expect(callback).toHaveBeenCalledTimes(2);
	expect(callback2).toHaveBeenCalledTimes(2);
    });

each([[{}, ["event", testCallback], {event: [testCallback]}],
      [{event: []}, ["event", testCallback2], {event: [testCallback2]}], // with an empty list like one's been removed
      [{event: [testCallback]}, ["event", testCallback2], {event: [testCallback, testCallback2]}], // can have multiple callbacks for the same event
      [{event: [testCallback]}, ["event", testCallback], {event: [testCallback, testCallback]}], // if I add the same callback to the same event it's added twice, should we try to be smarter about this in future?
      [{event: [testCallback]}, ["event2", testCallback2], {event: [testCallback], event2: [testCallback2]}], // can have callbacks for different events
      [{event: [testCallback]}, ["event2", testCallback], {event: [testCallback], event2: [testCallback]}], // can have the same callback on different events
    ])
.test("EventTarget.addEventListener",
    (before, args, after) => {
	const et = new EventTarget.EventTarget();
	const callback = jest.fn();
	et.listeners = before;
	et.addEventListener(...args);
	expect(et.listeners).toEqual(after);
    });

each([[{event: [testCallback]}, ["event", testCallback], {event: []}],
      [{event: [testCallback]}, ["event", testCallback2], {event: [testCallback]}],
      [{event: [testCallback, testCallback2]}, ["event", testCallback], {event: [testCallback2]}],
      [{event: [testCallback], event2: [testCallback2]}, ["event", testCallback], {event: [], event2: [testCallback2]}],
      [{event: [testCallback], event2: [testCallback]}, ["event", testCallback], {event: [], event2: [testCallback]}],
      [{event: []}, ["event", testCallback2], {event: []}],
      [{}, ["event", testCallback2], {}],
    ])
.test("EventTarget.removeEventListener",
    (before, args, after) => {
	const et = new EventTarget.EventTarget();
	const callback = jest.fn();
	et.listeners = before;
	et.removeEventListener(...args);
	expect(et.listeners).toEqual(after);
    });

const testEvent1 = new CustomEvent("event", {detail: 1});
const testEvent2 = new CustomEvent("event2", {detail: 2});
each([[{event: [null]}, {event: [testEvent1]}],
      [{event: [null, null, null, null]}, {event: [testEvent1]}],
      [{event: [null], event2: [null, null], noEvent: [null]}, {event: [testEvent1], event2: [testEvent2]}],
      [{}, {}],
    ])
.test("EventTarget.dispatchEvent",
    (before, after) => {
	const et = new EventTarget.EventTarget();
	Object.values(before).forEach((list) => {
	    for (const i in list) {
		list[i] = jest.fn();
	    }
	});
	et.listeners = before
	et.dispatchEvent(testEvent1);
	et.dispatchEvent(testEvent2);
	Object.keys(before).forEach((event) => {
	    const list = before[event];
	    const expected = event in after ? after[event] : [];
	    for (const i in list) {
		expect(list[i]).toHaveBeenCalledTimes(expected.length);
		for (let i = 1; i < list.length; i++) {
		    for (let j = 0; j < expected.length; j++) {
			expect(list[i]).toHaveBeenNthCalledWith(j+1, expected[j]);
		    }
		}
	    }
	});
    });
