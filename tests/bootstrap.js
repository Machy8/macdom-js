var Macdom, actTestedVersion, testsStarted, testsCount, testsFailed,
	assert = require('assert'),
	fs = require('fs'),
	MacdomVersions = ["macdom", "macdom.min", "macdom.min.base62"];

(function () {
	resetSummary();

	for (var version of MacdomVersions) {
		actTestedVersion = version;
		testsStarted = new Date().getTime();
		Macdom = require(__dirname + "/../src/" + version);
		runTests();
	}

})();

function testFiles (fileName) {
	var acutal = fs.readFileSync(__dirname + "/actual/" + fileName + ".html", 'utf8'),
		expected = fs.readFileSync(__dirname + "/expected/" + fileName + ".html", 'utf8');

	actual = Macdom.compile(acutal);

	try {
		assert.equal(actual, expected);

	} catch (e) {
		logError("string", testName, actual, expected);

	} finally {
		resetSetup();
		testsCount++
	}

}

function testStrings (testName, actual, expected) {
	Macdom.setup.compressCode = true;

	actual = Macdom.compile(actual);

	try {
		assert.equal(actual, expected);

	} catch (e) {
		logError("string", testName, actual, expected);

	} finally {
		resetSetup();
		testsCount++;
	}
}

function logError (testType, testName, actual, expected) {
	console.log(actTestedVersion + " - " + testType + " test - " + testName + " => failed.");
	console.log("\nSetup");
	console.log(Macdom.setup);
	console.log("\nActual\n'" + actual + "'");
	console.log("\nExpected\n'" + expected + "'");
	console.log("\n\n");

	testsFailed++;
}

function showSummary () {
	var testsTime = new Date().getTime() - testsStarted,
		msgA = 'Tests done - ' + testsCount,
		msgB = "\nResult - " + testsFailed + ' failed',
		msgC = "\nTime - " + testsTime + 'ms.';

	console.log("Version - " + actTestedVersion);
	console.log(msgA + msgB + msgC);
	console.log("\n");

	resetSummary();
}

function resetSummary () {
	testsCount = testsFailed = 0;
}

function resetSetup () {
	Macdom.setup = {
		addBooleanAttributes: '',
		addElements: {},
		addMacro: {},
		addQkAttributes: {},
		booleanAttributes: false,
		booleansWithValue: false,
		changeQkAttributes: {},
		closeSelfClosingTags: false,
		compressCode: false,
		compressText: false,
		indentMethod: 'combined',
		outputIndentation: 'tabs',
		preferXhtml: false,
		removeBooleanAttributes: '',
		removeElements: '',
		removeMacros: '',
		skipElements: '',
		spacesPerIndent: 4,
		structureHtmlSkeleton: true
	};
}

// All tests
function runTests () {

	testFiles("booleans");
	testFiles("class");
	testFiles("html-attributes");
	testFiles("id");
	testFiles("macros");
	testFiles("quick-attributes");
	testFiles("replicator");
	testFiles("check-js-css");
	testFiles("structure-html-skeleton");

	Macdom.setup.structureHtmlSkeleton = false;
	testFiles("structure-html-skeleton2");

	Macdom.setup.structureHtmlSkeleton = false;
	testFiles("showcase");

	Macdom.setup.structureHtmlSkeleton = false;
	testFiles("text");

	Macdom.setup.preferXhtml = true;
	testFiles("prefer-xhtml");

	Macdom.setup.skipElements = 'table h6 skipthisarea';
	testFiles("skip-areas");

	Macdom.setup.outputIndentation = "spaces";
	testFiles("output-indentation");

	Macdom.setup.addQkAttributes = {
		span: 'data-first data-second',
		div: 'data-first data-second data-third'
	};
	testFiles('add-qk-attributes');

	testStrings("Elements 1", 'html', '<html></html>');
	testStrings("Elements 2", 'input', '<input>');
	testStrings("Elements 3", 'div\ninput', '<div></div><input>');


	Macdom.setup.addBooleanAttributes = "beer steak muhehe";
	testStrings("Add boolean attributes", 'input $text beer steak muhehe', '<input type="text" beer steak muhehe>');

	Macdom.setup.removeBooleanAttributes = "beer steak muhehe";
	testStrings("Remove boolean attributes", 'input $text beer steak muhehe', '<input type="text">');

	testStrings("Blank line", "input", "<input>");
	Macdom.setup.blankLine = true;
	testStrings("Blank line 2", "input", "<input>\n");

	testStrings("Trim left", "div Some text ", "<div>Some text </div>");
	Macdom.setup.trim = "both";
	testStrings("Trim both", "div Some text ", "<div>Some text</div>");

	Macdom.setup.indentMethod = 'spaces';
	testStrings("Indent methods 1.1", "div\n    div", '<div><div></div></div>');

	Macdom.setup.indentMethod = 'spaces';
	testStrings("Indent methods 1.2", "div\n\tdiv", '<div></div><div></div>');

	Macdom.setup.indentMethod = 'tabs';
	testStrings("Indent methods 2.1", "div\n\tdiv", '<div><div></div></div>');

	Macdom.setup.indentMethod = 'tabs';
	testStrings("Indent methods 2.2", "div\n    div", '<div></div><div></div>');

	testStrings("Indent methods 3.1", "div\n    div", '<div><div></div></div>');
	testStrings("Indent methods 3.2", "div\n\tdiv", '<div><div></div></div>');
	testStrings("Indent methods 3.3", "div\n    div\n    \tdiv", '<div><div><div></div></div></div>');

	Macdom.setup.changeQkAttributes = {
		a: {
			target: 'href',
			href: 'target'
		}
	};
	testStrings("Change qk attributes", 'a $google.com $blank Some text', '<a target="google.com" href="blank">Some text</a>');

	Macdom.setup.changeQkAttributes = {
		a: {
			target: null,
			href: null
		}
	};
	testStrings("Change qk attributes 2", 'a $google.com $blank Some text', '<a>Some text</a>');

	Macdom.setup.removeElements = "a span div";
	Macdom.setup.compressCode = true;
	testStrings("Remove elements", "div\nspan\na", 'divspana');

	Macdom.setup.addElements = {
		svg: {
			qkAttributes: ['width', 'height']
		},
		elementxy: {
			unpaired: true,
			qkAttributes: ['data-somedata']
		},
		a: null,
		span: null,
		div: null
	};
	testStrings("Add elements", 'svg $100 $100 Inner text', '<svg width="100" height="100">Inner text</svg>');
	testStrings("Add elements 2", 'elementxy $Some data content;', '<elementxy data-somedata="Some data content">');

	var inputFunction = function (line) {
		return '<input type="password" data-user="' + line + '" placeholder="New password">';
	};
	Macdom.setup.addMacros = {
		title1: function (line) {
			return '<h1>' + line + '</h1>';
		},
		passwordInput: inputFunction
	};
	testStrings("Add macros", 'title1 Some text in the h1 element', '<h1>Some text in the h1 element</h1>');
	testStrings("Add macros 2", 'passwordInput user12345', '<input type="password" data-user="user12345" placeholder="New password">');

	Macdom.setup.removeMacros = "!5 utf-8";
	Macdom.setup.compressCode = true;
	testStrings("Remove macros", '!5\nutf-8', '!5utf-8');

	testStrings("Spaces per indent 1", 'div\n    div #innerDiv', '<div><div id="innerDiv"></div></div>');

	Macdom.setup.spacesPerIndent = 3;
	testStrings("Spaces per indent 2", 'div\n   div #innerDiv', '<div><div id="innerDiv"></div></div>');

	Macdom.setup.spacesPerIndent = 2;
	testStrings("Spaces per indent 3", 'div\n  div #innerDiv', '<div><div id="innerDiv"></div></div>');

	Macdom.setup.spacesPerIndent = 1;
	testStrings("Spaces per indent 4", 'div\n div #innerDiv', '<div><div id="innerDiv"></div></div>');

	showSummary();
}