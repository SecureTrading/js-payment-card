import { cardtypedetails } from "../src/cardtype";
import { Card } from "../src/payment-card";

test('structure', // Checks we have generated a cardtype in the right structure (and have all the card types in our logos in payment-card)
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
	 var card = new Card({init: false});
	 var cardPaymentTypes = [];
	 for (var cardPaymentType in card.logos) {
	     cardPaymentTypes.push(cardPaymentType);
	 }
	 expect(paymentTypes.sort()).toMatchObject(cardPaymentTypes.sort());
	 
     });
     
