(function(){

    TestFiles("booleans");
    TestFiles("class");
    TestFiles("html-attributes");
    TestFiles("id");
    TestFiles("macros");
    TestFiles("quick-attributes");
    TestFiles("replicator");
    TestFiles("showcase");
    Macdom.setup.preferXhtml = true;
    TestFiles("prefer-xhtml");
    Macdom.setup.finallCodeIndentation = "spaces";
    TestFiles("finall-code-indentation");
    
    Macdom.setup.ncaRegExpInlineTags = [/^\s*\<(?:skipthisarea) *[^>]*\>.*\<\/skipthisarea\>/];
    Macdom.setup.ncaRegExpOpenTags = [/^\s*\<(?:skipthisarea) *[^>]*\>/];
    Macdom.setup.ncaRegExpCloseTags = [/.*\<\/(?:skipthisarea)\>$/];
    Macdom.setup.ncaCloseTags = ['</skipthisarea>'];
    TestFiles("skip-areas");
    TestFiles("structure-html-skeleton");

    Macdom.setup.structureHtmlSkeleton = false;
    TestFiles("structure-html-skeleton2");
    Macdom.setup.structureHtmlSkeleton = true;
    TestFiles("text");
    
    TestStrings("Elements 1", 'html', '<html></html>');
    TestStrings("Elements 2", 'input', '<input>');
    TestStrings("Elements 3", 'div\ninput', '<div></div><input>');
    
    Macdom.setup.addBooleanAttributes = "beer steak muhehe";
    TestStrings("addBooleanAttributes", 'input $text beer steak muhehe', '<input type="text" beer steak muhehe>');

    Macdom.setup.removeBooleanAttributes = "beer steak muhehe";
    TestStrings("removeBooleanAttributes", 'input $text beer steak muhehe', '<input type="text">');
    
    Macdom.setup.indentMethod = 1;
    TestStrings("indent methods 1.1", "div\n    div", '<div><div></div></div>');
    Macdom.setup.indentMethod = 1;
    TestStrings("indent methods 1.2", "div\n\tdiv", '<div></div><div></div>');

    Macdom.setup.indentMethod = 2;
    TestStrings("indent methods 2.1", "div\n\tdiv", '<div><div></div></div>');
    Macdom.setup.indentMethod = 2;
    TestStrings("indent methods 2.2", "div\n    div", '<div></div><div></div>');
    
    TestStrings("indent methods 3.1", "div\n    div", '<div><div></div></div>');
    TestStrings("indent methods 3.2", "div\n\tdiv", '<div><div></div></div>');
    TestStrings("indent methods 3.3", "div\n    div\n    \tdiv", '<div><div><div></div></div></div>');
    
    Macdom.setup.changeQkAttributes = {
        a: {
            target: 'href',
            href: 'target'
        }
    };
    TestStrings("changeQkAttributes", 'a $google.com $blank Some text', '<a target="google.com" href="blank">Some text</a>');

    Macdom.setup.changeQkAttributes = {
        a: {
            target: null,
            href: null
        }
    };
    TestStrings("changeQkAttributes2", 'a $google.com $blank Some text', '<a>Some text</a>'); 
   
    Macdom.setup.removeElements = "a span div";
    TestStrings("removeElements", "div\nspan\na", 'divspana');
    
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
    TestStrings("addElements", 'svg $100 $100 Inner text', '<svg width="100" height="100">Inner text</svg>');
    TestStrings("addElements2", 'elementxy $Some data content;', '<elementxy data-somedata="Some data content">');
    
    var inputFunction = function (line) {
        return '<input type="password" data-user="' + line + '" placeholder="New password">';
    };
    Macdom.setup.addMacros = {
        title1: function (line) {
            return '<h1>' + line + '</h1>';
        },
        passwordInput: inputFunction
    };
    TestStrings("addMacros", 'title1 Some text in the h1 element', '<h1>Some text in the h1 element</h1>');
    TestStrings("addMacros2", 'passwordInput user12345', '<input type="password" data-user="user12345" placeholder="New password">');

    Macdom.setup.removeMacros = "!5 utf-8";
    TestStrings("removeMacros", '!5\nutf-8', '!5utf-8');
    
    TestStrings("Spaces per indent 1", 'div\n    div #innerDiv', '<div><div id="innerDiv"></div></div>');
    
    Macdom.setup.spacesPerIndent = 3;
    TestStrings("Spaces per indent 2", 'div\n   div #innerDiv', '<div><div id="innerDiv"></div></div>');

    Macdom.setup.spacesPerIndent = 2;
    TestStrings("Spaces per indent 3", 'div\n  div #innerDiv', '<div><div id="innerDiv"></div></div>');

    Macdom.setup.spacesPerIndent = 1;
    TestStrings("Spaces per indent 4", 'div\n div #innerDiv', '<div><div id="innerDiv"></div></div>');
}());
