var wd = require("selenium-webdriver");
const chalk = require("chalk");

var browserList = [["Chrome", "68.0", "Windows", "10"],
		   ["Firefox", "61.0", "Windows", "10"],
		   ["Edge", "17.0", "Windows", "10"],
		   ["IE", "11.0", "Windows", "10"],
		   ["IE", "10.0", "Windows", "8"],
		   ["IE", "9.0", "Windows", "7"],
		   ["Safari", "11.0", "OS X", "High Sierra"],
		  ]


// Input capabilities
function getCapabilities(browserName) {
    var capabilities = {
	'browserName' : browserName[0],
	'browser_version' : browserName[1],
	'os' : browserName[2],
	'os_version' : browserName[3],
	'project': 'js-payment-card',
	'resolution' : '1024x768',
	'browserstack.local' : true,
	'browserstack.localIdentifier' : process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    }
    return capabilities;
}

function getBrowser(browserName) {
    var capabilities = getCapabilities(browserName);
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
async function runTests(testCases) {
    for (var browser in browserList) {
	browserName = browserList[browser];
	var driver = getBrowser(browserName); // We allow our browsers to queue on browser stack as we don't test more than 10 tests - if we did we'd have to cap the number that run asyncronously here
	for (var i in testCases) {
	    tests += 1;
	    var testCase = testCases[i];
	    try {
		await testCase(driver).catch(handleError);
	    } finally {
		await driver.quit();
	    }
	}
    }
}

function handleError(error) { 
    failures += 1; 
    console.log(chalk.red.bold("Failure in browser: "+browserName.join(" ")));
    console.log(chalk.red.bold(error));
}

function logResults() {
    console.log(chalk.bold("*".repeat(50)));
    console.log(chalk.magenta.bold("Total tests run: "+tests));
    console.log(chalk.green.bold("Total successful tests: "+(tests-failures)));

    if (failures !== 0) {
	console.log(chalk.red.bold("Total failed tests: "+failures));
	console.log(chalk.bold("*"*50));
	process.exit(1);
    }
    console.log(chalk.bold("*".repeat(50)));
}

async function test1(driver) {
    await driver.get("http://127.0.0.1:8080/test.html");
    await driver.wait(wd.until.elementLocated(wd.By.id("st-card-container")), 5000);
    await driver.wait(wd.until.titleIs("Test page"), 1000);
}

runTests([test1]).then(logResults);


