window.TestFiles = function (test) {
    Macdom.setup.reset = true;
    var path = "tests/tests",
        tested = file_get_contents(path + "/" + test + "-a.html"),
        expected = file_get_contents(path + "/" + test + "-b.html"),
        compiled = Macdom.compile(tested);

    check(test, compiled, expected)
};
window.TestStrings = function (test, tested, expected) {
    Macdom.setup.reset = true;
    Macdom.setup.compressCode = true;
    tested = Macdom.compile(tested);
    check(test, tested, expected);
};

function check (test, tested, expected) {
    var result;

    result = expected === tested ? "OK" : "FAIL => " + tested;
    console.log(test + " - " + result);
}