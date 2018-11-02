global.EventTarget = class {}; // This is a shim for EventTarget because the one in JSDOM doesn't behave as expected
import { cardtypedetails } from "../src/cardtype";
const PaymentCard = require("../src/payment-card");

test('cardtype_structure', // Checks we have generated a cardtype in the right structure (and have all the card types in our logos in payment-card)
     () => {
	 var expectedAttributes = ["cvcLength", "format", "length", "luhn", "type"];
	 var paymentTypes = [];
	 for (var i in cardtypedetails) {
	     var attributes = [];
	     for (var attribute in cardtypedetails[i]) {
		 attributes.push(attribute);
	     }
	     expect(attributes.sort()).toMatchObject(expectedAttributes);
	     paymentTypes.push(cardtypedetails[i]["type"]);
	 }
	 var card = new PaymentCard.Card({init: false});
	 var cardPaymentTypes = [];
	 for (var cardPaymentType in card.logos) {
	     cardPaymentTypes.push(cardPaymentType);
	 }
	 expect(paymentTypes.sort()).toMatchObject(cardPaymentTypes.sort());
	 
     });
     
