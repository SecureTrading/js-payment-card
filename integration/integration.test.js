import each from 'jest-each';
var wd = require("selenium-webdriver");
const chalk = require("chalk");

function getCapabilities(browser, browserVersion, os, osVersion) {
    var capabilities = {
	'browserName' : browser,
	'browser_version' : browserVersion,
	'os' : os,
	'os_version' : osVersion,
	'project': 'js-payment-card',
	'build': process.env.TRAVIS_BUILD_NUMBER,
	'resolution' : '1024x768',
	'browserstack.local' : true,
	'browserstack.localIdentifier' : process.env.BROWSERSTACK_LOCAL_IDENTIFIER
    }
    return capabilities;
}

function getBrowser(browser, browserVersion, os, osVersion) {
    var capabilities = getCapabilities(browser, browserVersion, os, osVersion);
    var url = "http://"+process.env.BROWSERSTACK_USER+":"+process.env.BROWSERSTACK_ACCESS_KEY+"@hub-cloud.browserstack.com/wd/hub";
    var driver = new wd.Builder().usingServer(url).withCapabilities(capabilities);
    if (process.env.http_proxy) {
	driver = driver.usingWebDriverProxy(process.env.http_proxy);
    }
    driver = driver.build();
    return driver;
}

let failures = 0;
let tests = 0;
let browserName = null
async function runTests(browser, browserVersion, os, osVersion, testCases) {
    browserName = browser+":"+browserVersion
    var driver = getBrowser(browser, browserVersion, os, osVersion); // We allow our browsers to queue on browser stack as we don't test more than 10 tests - if we did we'd have to cap the number that run asyncronously here
    for (var i in testCases) {
	tests += 1;
	var testCase = testCases[i];
	try {
	    await testCase(driver);
	} finally {
	    await driver.quit();
	}
    }
}

async function getOverlay(driver, name) {
    return driver.findElement(wd.By.id("st-"+name+"-overlay"));
}

async function checkOverlay(driver, name, expected) {
    var el = await getOverlay(driver, name);
    await el.getText().then((actual) => { expect(actual).toBe(expected) });
}

async function sendKeysAndCheckOverlay(driver, name, toSend, expected) {
    var input = await driver.findElement(wd.By.name(name));
    await input.sendKeys(toSend);
    var overlay = await getOverlay(driver, name);
    await driver.wait(wd.until.elementTextIs(overlay, expected), 20000);
    await checkOverlay(driver, name, expected);
}

async function checkClass(driver, id, expected) {
    await driver.findElement(wd.By.id(id)).getAttribute("class").then((actual) => { expect(actual).toBe(expected) });
}

async function test1(driver) {
    await driver.get("http://127.0.0.1:8080/test.html");
    await driver.wait(wd.until.elementLocated(wd.By.id("st-card-container")), 20000);
    await driver.wait(wd.until.titleIs("Test page"), 20000);
    await sendKeysAndCheckOverlay(driver, "nameoncard", "MRS A B CLARK", "MRS A B CLARK");
    await checkOverlay(driver, "pan", "\u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219 \u2219\u2219\u2219\u2219");
    await sendKeysAndCheckOverlay(driver, "pan", "4111111111111111", "4111 1111 1111 1111");
    await sendKeysAndCheckOverlay(driver, "expirydate", "1222", "12/22");
    await checkClass(driver, "st-card", "");
    await sendKeysAndCheckOverlay(driver, "securitycode", "123", "123");
    await checkClass(driver, "st-card", "st-is-flipped");
}

jest.setTimeout(120000);// 120secs

each([["Chrome", "68.0", "Windows", "10"],
      ["Firefox", "61.0", "Windows", "10"],
      ["Edge", "17.0", "Windows", "10"],
      ["IE", "11.0", "Windows", "10"],
      ["IE", "10.0", "Windows", "8"],
      ["IE", "9.0", "Windows", "7"],
      ["Safari", "11.0", "OS X", "High Sierra"],
     ]
    ).test('integration',
	   (browser, browserVersion, os, osVersion) => {
	       return runTests(browser, browserVersion, os, osVersion, [test1]);
	   });

