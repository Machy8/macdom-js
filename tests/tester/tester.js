

window.testsStart = new Date().getTime();
window.testsFailed = 0;
window.testsCount = 0;

window.TestFiles = function (test) {
    var path = "tests/tests",
        tested = file_get_contents(path + "/" + test + "-a.html"),
        expected = file_get_contents(path + "/" + test + "-b.html"),
        compiled = Macdom.compile(tested);

    check(test, compiled, expected)
};


window.TestStrings = function (test, tested, expected) {
    Macdom.setup.compressCode = true;
    tested = Macdom.compile(tested);
    check(test, tested, expected);
};


window.showSummary = function () {
    var testsTime = new Date().getTime() - window.testsStart,
        msgA = 'Tests done - ' + window.testsCount,
        msgB = "\nResult - " + window.testsFailed+' failed',
        msgC = "\nTime - " + testsTime + 'ms.';

    console.log(msgA + msgB + msgC);

};

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
    }
}

function check (test, tested, expected) {
    var result;

    if(expected !== tested) {
        window.testsFailed++;
        console.log(test + " - " + "FAIL\n\n" + '"' + tested + '"');
    }

    window.testsCount++;
    resetSetup();
}