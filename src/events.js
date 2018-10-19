export function CreateEvent(type) {
    let event = null;
    if (document.createEvent) {
	event = document.createEvent("CustomEvent");
	event.initEvent(type, false, false);
    } else {
	event = new CustomEvent(type);
    }
    return event;
}

export class ChangeCardTypeEvent extends CreateEvent {
    constructor(newDetails, oldDetails) {
	super("changeCardType");
	this.cardType = {new: newDetails,
			old: oldDetails,
			};
    }
}
