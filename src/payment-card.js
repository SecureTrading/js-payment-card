import styles from "./styles.css"; // eslint-disable-line no-unused-vars
import template from "./template.html";
import chipLogo from "./images/chip.png";

import amexLogo from "./images/AMEX-S.png";
import astropaycardLogo from "./images/ASTROPAYCARD-S.png";
import dinersLogo from "./images/DINERS-S.png";
import discoverLogo from "./images/DISCOVER-S.png";
import jcbLogo from "./images/JCB-S.png";
import laserLogo from "./images/LASER-S.png";
import maestroLogo from "./images/MAESTRO-S.png";
import mastercardLogo from "./images/MASTERCARD-S.png";
import pibaLogo from "./images/PIBA-S.png";
import visaLogo from "./images/VISA-S.png";

import { EventTarget } from "./eventtarget";
import { ChangeCardTypeEvent } from "./events";
import { HtmlElement } from "./htmlelement";
import { inArray, stripChars } from "./utils";
import { BinLookup } from "./binlookup";

export class Card extends EventTarget {
    constructor(config) {
	super();
	this.config = config;
	this.template = template;
	
	this.logos = { AMEX: amexLogo,
		       ASTROPAYCARD: astropaycardLogo,
		       DINERS: dinersLogo,
		       DISCOVER: discoverLogo,
		       JCB: jcbLogo,
		       LASER: laserLogo,
		       MAESTRO: maestroLogo,
		       MASTERCARD: mastercardLogo,
		       PIBA: pibaLogo,
		       VISA: visaLogo,
	};
	this.cardDetails = {};

	this.doNotFlip = ["AMEX"];

	this.placeholders = { pan: "\u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219",
			      expirydate: "MM/YY",
			      securitycode: "\u2219\u2219\u2219",
			      frontsecuritycode: "\u2219\u2219\u2219\u2219",
			      nameoncard: "MR J BLOGGS"
	};
	this.entryLimits = {expirydate: 6};
	this.displayLimits = {nameoncard: 15,
			      pan: 22,
			      expirydate: 9,
			      };
	this.displayCutoff = {nameoncard: "\u2026"};
	this.autofillSelector = ":-webkit-autofill";

	this.setConfig();
	if (this.config.init) {
	    this.init();
	}
    }

    init() {     
	this.createCard();
	this.setDomElements();
	this.elements.expirydate.setAttributes({placeholder: this.placeholders["expirydate"],
						type: "text",
					       });
	this.chipImg.setAttributes({"src": chipLogo});
	this.getMaxEntryLimits();

	for (let field in this.elements) {
	    this.setOverlay(field, this.placeholders[field]);
	    if (field == "pan") {
		this.updatePan();
	    }
	    this.updateOverlay(field);
	}
	this.setEventListeners();
	
    }

    setConfig() {
	this.config.init = "init" in this.config ? this.config.init : true;
	this.binLookup = new BinLookup(this.config);
	if ("listeners" in this.config) {
	    const listeners = this.config.listeners;
	    for (let eventType in listeners) {
		this.addEventListener(eventType, listeners[eventType]);
	    }
	}
    }
    
    createCard() {
	this.container = HtmlElement.bySelector("div#st-card-outer-container");
	this.container.setHtml(this.template, false);
    }

    setDomElements() {
	this.elements = {pan: HtmlElement.bySelector("input[name=pan]"),
			 expirydate: HtmlElement.bySelector("input[name=expirydate]"),
			 securitycode: HtmlElement.bySelector("input[name=securitycode]"),
			 nameoncard: HtmlElement.bySelector("input[name=nameoncard]"),
			};
	
	this.setAutocomplete();
	this.autofillElements = {};
	this.addAutofillElement("expirymonth", "cc-exp-month", this.elements.pan.getParent());
	this.addAutofillElement("expiryyear", "cc-exp-year", this.elements.pan.getParent());

	this.overlays = {pan: HtmlElement.bySelector("div#st-pan-overlay"),
			 expirydate: HtmlElement.bySelector("div#st-expirydate-overlay"),
			 nameoncard: HtmlElement.bySelector("div#st-nameoncard-overlay"),
			 securitycode: HtmlElement.bySelector("div#st-securitycode-overlay"),
			 frontsecuritycode: HtmlElement.bySelector("div#st-securitycode-overlay-front")
			};
	
	this.cardElement = HtmlElement.bySelector("div#st-card");
	this.chipImg = HtmlElement.bySelector("img#st-chip-logo");
	this.logoImg = HtmlElement.bySelector("img#st-payment-logo");
    }

    setAutocomplete() {
	this.elements.pan.setAttributes({"autocomplete": "cc-number", "tabindex": "0"});
	this.elements.expirydate.setAttributes({"autocomplete": "cc-exp", "tabindex": "0"});
	this.elements.securitycode.setAttributes({"autocomplete": "cc-csc", "tabindex": "0"});
	this.elements.nameoncard.setAttributes({"autocomplete": "cc-name", "tabindex": "0"});
    }

    addAutofillElement(name, type, parent) {
	var autofillElement = new HtmlElement("input", {type: "number", autocomplete: type, class: "autofill-input", tabindex: "-1"}); // Note we don't add the name attribute to this so we don't ever submit the expirymonth/year
	autofillElement.appendTo(parent);
	this.autofillElements[name] = autofillElement;
    }

    getMaxEntryLimits() {
	const panLimits = [];
	const cvcLimits = [];
	this.binLookup.forEachBreakCardTypes((card) => {
		panLimits.push(...card["length"]);
		cvcLimits.push(...card["cvcLength"]);
	});
	this.entryLimits.pan = Math.max(...panLimits);
	this.entryLimits.securitycode = Math.max(...cvcLimits);
    }

    setEventListeners(){
	for (let field in this.elements) {
	    this.elements[field].addListener("keyup", this.keyUp.bind(this));
	    this.elements[field].addListener("change", this.keyUp.bind(this));
	    this.elements[field].addListener("paste", this.paste.bind(this));
	    if (field !== "nameoncard") {
		this.elements[field].addListener("keypress", this.restrictNumerical.bind(this));
	    }
	}
	this.elements.securitycode.addListener("focus", this.focusSecurityCode.bind(this));
	this.elements.securitycode.addListener("blur", this.blurSecurityCode.bind(this));

	this.elements.pan.addListener("animationstart", this.onAutofill.bind(this));
	this.elements.pan.addListener("webkitAnimationStart", this.onAutofill.bind(this));
	this.autofillElements.expiryyear.addListener("blur", this.onAutofill.bind(this));
    }
	
    onAutofill(e) {
	if (e.animationName == "autofillstart" || e.type == "blur") {
	    setTimeout(this.autofillExpiry.bind(this), 50); // Have to set the timeout so that we wait for the field to be populated
	} else if (e.animationName == "autofillcancel") {
	    this.cancelAutofill();
	}
	
    }
    
    autofillExpiry() {
	let month = this.autofillElements.expirymonth.getAttribute("value");
	let year = this.autofillElements.expiryyear.getAttribute("value");
	if (month && year) {
	    this.elements.expirydate.setAttributes({value: month+"/"+year});
	    this.updateOverlay("expirydate");
	    this.elements.expirydate.addClass("is-autofilled");
	    for (let field in this.elements) {
		if (this.elements[field].matches(this.autofillSelector)) {
		    this.elements[field].addClass("is-autofilled");
		}
	    }
	} else {
	    this.elements.expirydate.setAttributes({value: ""});
	}
    }

    cancelAutofill() {
	for (let field in this.elements) {
	    this.elements[field].removeClass("is-autofilled");
	}
    }

    updateOverlay(type) {
	this.formatInput(type);
	let value = this.elements[type].getAttribute("value");

	if (value === "") {
	    value = this.placeholders[type];
	}

	this.setOverlay(type, value);
    }

    setOverlay(type, value) {
	const limit = this.displayLimits[type] || this.entryLimits[type];
	if (value.length > limit) {
	    value = value.substring(0, limit) + (this.displayCutoff[type] || "");
	}
	if (type === "pan") {
	    const centerClass = "st-card-centered";
	    if (this.shouldCenter(value)) {
		this.container.addClass(centerClass);
	    } else {
		this.container.removeClass(centerClass);
	    }
	}
	this.overlays[type].setHtml(value);
	if (type === "securitycode") {
	    if (value === this.placeholders["securitycode"]) {
		value = this.placeholders["frontsecuritycode"];
	    }
	    this.overlays["frontsecuritycode"].setHtml(value);
	}
    }

    shouldCenter(value) {
    	if (value.length >= 20) {
    	    return true;
    	}
    	return false;
    }

    updatePan() {
	const value = stripChars(this.elements.pan.getAttribute("value"));
	const newDetails = this.binLookup.binLookup(value);
	const cardType = newDetails.type;
	if (newDetails !== this.cardDetails) {
	    this.container.removeClass("st-" + this.cardDetails.type);
	    this.container.removeClass("st-detected");
	    if (cardType !== null && cardType in this.logos) {
		this.container.addClass("st-" + cardType);
		this.container.addClass("st-detected");
		this.logoImg.setAttributes({"src": this.logos[cardType]});
	    }
	    else {
		this.logoImg.setAttributes({"src": ""});
	    }
	    const oldDetails = this.cardDetails;
	    this.cardDetails = newDetails;
	    let hideFrontClass = "st-hide-front-securitycode";
	    if (this.shouldFlip()) {
		this.container.addClass(hideFrontClass);
	    }
	    else {
		this.container.removeClass(hideFrontClass);
	    }
	    this.dispatchEvent(new ChangeCardTypeEvent(newDetails, oldDetails));
	}
    }

    keyUp(event) {
	this.updateOverlay(event.target.name);
	return true;
    }

    paste(event) {
	return event.preventDefault();
    }

    restrictNumerical(e) {
	e = e || event;
	let input = e.which;
	if (input === 32) {
	    return e.preventDefault();
	} else if (e.metaKey || e.ctrlKey || input === 0 || input === undefined || input < 33) {// Special behaviour for control characters (as borrowed from example code)
	    return true;
	} 
	input = String.fromCharCode(input);
	const type = e.target.name;
	const field = this.elements[type];
	const value = field.getAttribute("value");
	if (!(/^\d+$/.test(input) || (type === "expirydate" && input === "/" && value.length === 2))) {
	    return e.preventDefault();
	}

	this.formatInput(type);

	const limit = this.entryLimits[type];
	if (limit && (field.element.selectionStart === field.element.selectionEnd) && stripChars(value + input).length > limit) {
	    return e.preventDefault();
	}
	return true;
    }

    formatInput(type) {
	const field = this.elements[type];
	const original = field.getAttribute("value");
	let value = original;
	let selectStart = field.element.selectionStart;
	let selectEnd = field.element.selectionEnd;

	if (type == "pan") {
	    this.updatePan();
	    const format = this.cardDetails.format;
	    if (format && value.length > 0) {// Don't bother formatting the pan if we have a blank string
		value = stripChars(value);
		let matches = value.match(new RegExp(format, "")).slice(1);
		if (inArray(matches, undefined)) {
		    matches = matches.slice(0, matches.indexOf(undefined));
		}
		const matched = matches.length;
		if (this.cardDetails.format && matched > 1) {
		    let preMatched = original.split(" ").length;
		    selectStart += matched - preMatched;
		    selectEnd += matched - preMatched;
		    value = matches.join(" ");
		}
	    }
	} else if (type == "expirydate") {
	    value = stripChars(value);
	    if (parseInt(value.substring(0,1)) > 1) {
		value = "0" + value;
		selectStart += 1;
		selectEnd += 1;
	    }
	    const hasSlash = inArray(original, "/");
	    if (value.length > 2 || hasSlash) {
		if (!hasSlash) {
		    selectStart += 1;
		    selectEnd += 1;
		}
		value = value.substring(0, 2) + "/" + value.substring(2);
	    }
	}
	if (value!==original) {
	    field.setAttributes({value: value});
	    field.element.setSelectionRange(selectStart, selectEnd);
	}
    }

    shouldFlip() {
	return !inArray(this.doNotFlip, this.cardDetails.type);
    }

    focusSecurityCode() {
	if (this.shouldFlip()) {
	    this.cardElement.addClass("st-is-flipped");
	}
    }
    
    blurSecurityCode() {
	this.cardElement.removeClass("st-is-flipped");
    }
    
}
