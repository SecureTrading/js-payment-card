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
import visaLogo from "./images/VISA-S.png";

import { cardtypedetails } from "./cardtype";
import { HtmlElement } from "./htmlelement";
import { inArray, stripChars } from "./utils";
import { binlookup } from "./binlookup";

export class Card {
    constructor(config) {
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
		       VISA: visaLogo,
	};
	this.cardDetails = {};

	this.doNotFlip = ["AMEX"];

	this.placeholders = { pan: "\u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219",
			      expirydate: "MM / YY",
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
	this.config.minMatch = "minMatch" in this.config ? this.config.minMatch : 0;
	this.config.supported = "supported" in this.config ? this.config.supported : this.getAllCardTypes();
    }
    
    createCard() {
	this.container = HtmlElement.bySelector("div#st-card-outer-container");
	this.container.setHtml(this.template, false);
    }

    getAllCardTypes() {
	const result = [];
	for (let i in cardtypedetails) {
	    result.push(cardtypedetails[i].type);
	}
	return result.sort();
    }

    getCard(type) {
	let result = undefined;
	for (let i in cardtypedetails) {
	    const card = cardtypedetails[i];
	    if (card["type"] === type) {
		result = card;
	    }
	}
	return result;
    }
    
    setDomElements() {
	this.elements = {pan: HtmlElement.bySelector("input[name=pan]"),
			 expirydate: HtmlElement.bySelector("input[name=expirydate]"),
			 securitycode: HtmlElement.bySelector("input[name=securitycode]"),
			 nameoncard: HtmlElement.bySelector("input[name=nameoncard]"),
			};
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

    getMaxEntryLimits() {
	const panLimits = [];
	const cvcLimits = [];
	this.getAllCardTypes().forEach((type) => {
	    const card = this.getCard(type);
	    if (this.isSupported(type)) {
		panLimits.push(...card["length"]);
		cvcLimits.push(...card["cvcLength"]);
	    }
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
	this.overlays[type].setHtml(value);
	if (type === "securitycode") {
	    if (value === this.placeholders["securitycode"]) {
		value = this.placeholders["frontsecuritycode"];
	    }
	    this.overlays["frontsecuritycode"].setHtml(value);
	}
    }

    isSupported(cardType) {
	return (cardType in this.logos && inArray(this.config.supported, cardType));
    }

    updatePan() {
	const value = stripChars(this.elements.pan.getAttribute("value"));
	const newDetails = binlookup(value);
	const cardType = newDetails.type;
	this.container.removeClass("st-" + this.cardDetails.type);
	this.container.removeClass("st-detected");
	if (value.length > this.config.minMatch && cardType !== null && this.isSupported(cardType)) {
	    this.container.addClass("st-" + cardType);
	    this.container.addClass("st-detected");
	    this.logoImg.setAttributes({"src": this.logos[cardType]});
	    this.cardDetails = newDetails;
	}
	else {
	    this.logoImg.setAttributes({"src": ""});
	    this.cardDetails = {type: null};
	}
	let hideFrontClass = "st-hide-front-securitycode";
	if (this.shouldFlip()) {
	    this.container.addClass(hideFrontClass);
	}
	else {
	    this.container.removeClass(hideFrontClass);
	}
    }

    keyUp(event) {
	this.updateOverlay(event.target.name);
	return true;
    }

    paste(event) {
	return event.preventDefault();
}

    restrictNumerical(event) {
	let input = event.which;
	if (input === 32) {
	    return event.preventDefault();
	} else if (event.metaKey || event.ctrlKey || input === 0 || input < 33) {// Special behaviour for control characters (as borrowed from example code)
	    return true;
	}
	input = String.fromCharCode(input);
	if (!/^\d+$/.test(input)) {
	    return event.preventDefault();
	}

	const type = event.target.name;
	this.formatInput(type);

	const field = this.elements[type];
	const limit = this.entryLimits[type];
	if (limit && (field.element.selectionStart === field.element.selectionEnd) && stripChars(field.getAttribute("value") + input).length > limit) {
	    return event.preventDefault();
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
	    if (format) {
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
	    if (value.length > 1) {
		if (!inArray(original, "/")) {
		    selectStart += 3;
		    selectEnd += 3;
		}
		value = value.substring(0, 2) + " / " + value.substring(2);
	    }
	}
	field.setAttributes({value: value});
	field.element.setSelectionRange(selectStart, selectEnd);
    }

    shouldFlip() {
	return !inArray(this.doNotFlip, this.cardDetails.type);
    }

    focusSecurityCode() {
	if (this.shouldFlip()) {
	    this.cardElement.addClass("is-flipped");
	}
    }
    
    blurSecurityCode() {
	this.cardElement.removeClass("is-flipped");
    }
    
}
