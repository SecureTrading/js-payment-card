import { inArray } from "./utils";

export class HtmlElement {
    constructor(element, attributes, text) {
	this.element = this._create(element);
	this.exposedAttributes = ["value"];
	this.name = element.name;
	this.value = element.value;
	this.checked = element.checked;
	this.setAttributes(attributes);
	if (text) {
	    this.setHtml(text);
	}
    }

    static bySelector(css) {
	let element = document.querySelector(css);
	if (element == null) {
	    throw new TypeError("Could not find element by CSS selector (" + css + ")");
	}
	return new HtmlElement(element);
    }
    
    _create(element) {
	if (typeof element === "string") {
	    element = document.createElement(element);
	}
	return element;
    }
    
    getAttribute(attribute) {
	let result = this.element.getAttribute(attribute);
	if (inArray(this.exposedAttributes, attribute)) {
	    result = this.element[attribute];
	}
	return result;
    }
    
    setAttributes(attributes) {
	for (let attribute in attributes) {
	    let value = attributes[attribute];
	    if (inArray(this.exposedAttributes, attribute)) {
		this.element[attribute] = value;
	    } else if (value === false) {
		this.removeAttribute(attribute);
	    } else {
		this.element.setAttribute(attribute, value);
	    }
	}
    }

    removeAttribute(attribute) {
	this.element.removeAttribute(attribute);
    }

    addListener(event, func) {
	this.element.addEventListener(event, func);
    }

    appendTo(appendToElement) {
	appendToElement.appendChild(this.element);
    }

    append(appendElement) {
	this.element.appendChild(appendElement);
    }

    _hasClass(className) {
	if (this.element.classList) {
	    return this.element.classList.contains(className);
	} else {
	    return !!(this.element.className && this.element.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)")));
	}
    }
    
    addClass(className) {
	if (this.element.classList) {
	    this.element.classList.add(className);
	} else if (!this._hasClass(className)) { 
	    let originalClass = this.getAttribute("class");
	    if (originalClass === null) {
		originalClass = "";
	    }
	    className = originalClass + " " + className;
	    this.setAttributes({"class": className.replace(/(^\s+|\s+$)/g,"")});
	}
    }
 
    removeClass(className) {
	if (this.element.classList) {
	    this.element.classList.remove(className);
	} else if (this._hasClass(className)) {
	    let reg = new RegExp("(\\s|^)" + className + "(\\s|$)");
	    this.element.className=this.element.className.replace(reg, " ");
	}
    }

    setHtml(html, escape) {
	if (typeof escape == "undefined" || escape) {
	    html = escapeHtml(html);
	}
	this.element.innerHTML = html;
    }

    matches(selector) {
	var matches = ( this.element.matches || this.element.msMatchesSelector );
	try {
	    return matches.call(this.element, selector);
	} catch (error) { // If the browser considers the selector string as invalid it can raise, but different browsers may consider different selectors as valid
	    return false;
	}
    }

    getParent() {
	return this.element.parentNode;
    }

}

export function escapeHtml(value) {
    let div = document.createElement("div");
    div.appendChild(document.createTextNode(value));
    return div.innerHTML;
}
