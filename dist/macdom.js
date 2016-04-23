/* Macdom-js Copyright (c) 2016 Vladimír Macháček | For the full copyright and license information, please view the file license.md that was distributed with this source code. */

(function () {

    "use strict";

    // Helpers definition

    /**
     * @param string txt
     * @returns {string}
     */
    var ltrim = function (txt) {
        return txt.replace(/^\s+/, "");
    };

    /**
     * @param string str
     * @returns {string}
     */
    RegExp.quote = function (str) {
        return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    };

    /**
     * @param string needle
     * @param array haystack
     * @returns {boolean}
     */
    var inArray = function (needle, haystack, returnKey) {
        var key = haystack.indexOf(needle);
        if (returnKey)
            return key >= 0 ? key : 0;
        return key >= 0;
    };

    /**
     * @param string|int key
     * @param string haystack
     * @returns {boolean}
     */
    var arrayKeyExists = function (key, haystack) {
        return haystack.hasOwnProperty(key);
    };

    /**
     * @param string subject
     * @param string pattern
     * @returns {array}
     */
    var matchAll = function (pattern, subject) {
        var match,
            matches = [];
        while (match = pattern.exec(subject)) {
            matches.push(match);
        }
        matches = matches.length ? matches : null;
        return matches;
    };

    /**
     * @param string re
     * @returns {RegExp}
     */
    var reG = function (re) {
        return new RegExp(re, 'g');
    };

    /** Classes definition */
    var Compiler = {},
        Elements = {},
        Macros = {},
        Replicator = {};
    Macros.macros = {};

    Compiler.construct = function (s) {
        this.AREA_TAG = 'SKIP';
        this.closeTags = [];
        this.codeStorage = "";
        this.inNoCompileArea = false;
        this.skipRow = false;
        this.noCompileAreaClosed = null;
        this.lnBreak = s.compressCode && s.compressCode === true ? "" : "\n";
        this.spacesPerIndent = s.spacesPerIndent || 4;
        this.structureHtmlSkeleton = typeof s.structureHtmlSkeleton !== "undefined" ? s.structureHtmlSkeleton : true;
        this.indentMethod = s.indentMethod || 3;
        this.ncaCloseTags = s.ncaCloseTags || [];
        this.ncaOpenTags = s.ncaOpenTags || [];
        this.ncaRegExpInlineTags = s.ncaRegExpInlineTags || [];
        this.ncaRegExpOpenTags = s.ncaRegExpOpenTags || [];
        this.ncaRegExpCloseTags = s.ncaRegExpCloseTags || [];
    };

    Elements.construct = function (s) {
        var attributes,
            that = Elements;

        if (s.addBooleanAttributes) {
            attributes = s.addBooleanAttributes.split(" ");
            this.booleanAttributes = this.booleanAttributes.concat(attributes);
        }

        if (s.changeQkAttributes) {
            Elements.changeQkAttributes(s.changeQkAttributes);
        }

        if (s.removeBooleanAttributes) {
            Elements.removeBooleanAttributes(s.removeBooleanAttributes);
        }

        if (s.addElements) {
            Elements.addElements(s.addElements);
        }

        if (s.removeElements) {
            Elements.removeElements(s.removeElements);
        }
    };

    Macros.construct = function (s) {
        var macroKey, macros,
            that = Macros;

        if (s.addMacros) {
            macros = s.addMacros;
            for (macroKey in macros) {
                that.addMacro(macroKey, macros[macroKey]);
            }
        }

        if (s.removeMacros) {
            that.removeMacros(s.removeMacros);
        }
    };

    Replicator.construct = function (s) {
        this.REG_EXP_A = /\[(.*?)\]/g;
        this.REG_EXP_B = /\[@\]/;
        this.REG_EXP_B_g = /\[@\]/g;
        this.REG_EXP_C = /^@([\S]*)/;
        this.REG_EXP_D = /^\/@([\S]*)/;
        this.SUFFIX = '-x';
        this.register = {};
    };

    /**
     * @param string content
     * @returns {string}
     */
    Compiler.compile = function (content) {

        var ln, lvl, txt, element, noCompileAreaTag, replicatorResult, clearedText, attributes, macro, macroExists, re,
            that = Compiler,
            lns = content.split(/\n/);

        for (ln of lns) {
            lvl = that.getLnLvl(ln);
            txt = that.getLnTxt(ln);
            element = that.getElement(ln);
            noCompileAreaTag = that.detectNoCompileArea(txt);

            if (that.structureHtmlSkeleton && element === "html") {
                lvl = 0;
            } else if (that.structureHtmlSkeleton && element !== "html") {
                lvl = inArray(element, ["html", "body"]) ? 1 : lvl + 1;
            }

            if (txt && !noCompileAreaTag && ltrim(txt).length && !that.inNoCompileArea && !that.skipRow && that.noCompileAreaClosed === null && !Elements.findElement(element, false) && !(txt.trim()).match(/^[<*]+/)) {
                replicatorResult = Replicator.detect(lvl, element, txt);
                if (replicatorResult['replicate']) {
                    txt = that.getLnTxt(replicatorResult['line']);
                    element = that.getElement(txt);
                }
                if (replicatorResult['clearLine']) {
                    txt = null;
                    element = false;
                }
            }

            if (Elements.findElement(element, false) && !that.inNoCompileArea && !that.skipRow) {
                clearedText = txt.replace(element, '');
                attributes = that.getLnAttributes(clearedText);
                that.addOpenTag(element, lvl, attributes);
            } else {
                if (txt) {
                    that.addCloseTags(lvl);
                    if (!that.inNoCompileArea && !noCompileAreaTag && !that.skipRow) {
                        macro = Macros.replace(element, txt);
                        macroExists = macro['exists'];
                        that.codeStorage += macroExists ? macro['replacement'] + that.lnBreak : txt + that.lnBreak;
                    } else if (that.inNoCompileArea || that.skipRow) {
                        that.codeStorage += !noCompileAreaTag ? that.lnBreak + txt + that.lnBreak : "";
                    }
                }
            }
        }

        that.addCloseTags(0);
        return that.codeStorage;
    };

    /**
     * @param string ln
     * @returns {int}
     */
    Compiler.getElement = function (ln) {
        var element = (ln.trim()).split(" ");
        return element[0];
    };

    /** @param string ln */
    Compiler.getLnTxt = function (ln) {
        return ltrim(ln);
    };

    /**
     * @param string ln
     * @returns {int}
     */
    Compiler.getLnLvl = function (ln) {
        var method, whites, spaces, tabulators, matches, re;

        method = this.indentMethod;
        matches = ln.match(/^\s+/) || null;
        whites = matches ? matches[0] : "";

        re = new RegExp(" {" + this.spacesPerIndent + "}", "g");
        spaces = method === 1 || method === 3 ? whites.match(re) : 0;
        spaces = spaces ? spaces.length : 0;

        tabulators = method === 2 || method === 3 ? whites.match(/\t/g) : 0;
        tabulators = tabulators ? tabulators.length : 0;
        if (method === 3) tabulators *= 2;

        return spaces + tabulators;
    };

    /** @param int lvl */
    Compiler.addCloseTags = function (lvl) {
        var lasTag = this.closeTags.length,
            length = lasTag,
            i;
        if (length > 0) {
            for (i = length - 1; i >= 0; i--) {
                if (lvl <= this.closeTags[i][0]) {
                    this.codeStorage += this.lnBreak + this.closeTags[i][1] + this.lnBreak;
                    lasTag = i;
                } else {
                    break;
                }
            }
            this.closeTags.splice(lasTag, this.closeTags.length);
        }
    };

    /**
     * @param string element
     * @param int lvl
     * @param object attributes
     */
    Compiler.addOpenTag = function (element, lvl, attributes) {
        var newAttr, paramKey, selfClosing, attribute, key, closeTag,
            usedKeys = [],
            withoutKey = 0,
            that = Compiler,
            elementSettings = Elements.findElement(element, true),
            openTag = "<" + element;

        if (elementSettings['qkAttributes'] && attributes['qkAttributes']) {
            for (attribute in attributes['qkAttributes']) {
                key = attribute;
                attribute = attributes["qkAttributes"][key];
                newAttr = null;
                if (attribute['key']) {
                    paramKey = attribute['key'] - 1;
                    if (typeof elementSettings['qkAttributes'][paramKey] !== 'undefined') {
                        newAttr = elementSettings['qkAttributes'][paramKey] + '="' + attribute['value'] + '"';
                        usedKeys.push(paramKey);
                    }
                } else if (!inArray(withoutKey, usedKeys) && arrayKeyExists(withoutKey, elementSettings['qkAttributes'])) {
                    newAttr = elementSettings['qkAttributes'][withoutKey] + '="' + attribute['value'] + '"';
                    withoutKey++;
                }
                openTag += newAttr ? ' ' + newAttr : "";
            }
        }

        // Add html and boolean attributes
        openTag += attributes['htmlAttributes'] + attributes['booleanAttributes'];

        // Close the open tag, add close tags if needed
        selfClosing = elementSettings['paired'] ? '' : ' /';
        openTag += selfClosing + '>' + that.lnBreak;
        that.addCloseTags(lvl);
        that.codeStorage += openTag;
        // If the tag is paired add its close tag to the storage
        if (elementSettings['paired']) {
            that.codeStorage += attributes['txt'] ? attributes['txt'] : "";
            closeTag = '</' + element + '>';
            that.closeTags.push([lvl, closeTag]);
        }
    };

    /**
     * @param string txt
     * @returns {{qkAttributes: Array, htmlAttributes: string, booleanAttributes: string, txt: string}}
     */
    Compiler.getLnAttributes = function getLnAttributes(txt) {
        var value, i, newHref, htmlAttributes, htmlClsSelector, re, reAll, idSelector, attribute, matches, txt2array, match, paramVal, clsSelectors, qkAttributes, booleanAttributes, paramKey, txtFromTag2End;

        // Store the text from the first tag to the end of the line
        re = /\<.*$/;
        txtFromTag2End = '';
        if (match = txt.match(re)) {
            txt = txt.replace(re, '');
            txtFromTag2End += match[0];
        }

        // Replace n$*; for n:href=""
        re = / n\$(.+);/;
        if (matches = txt.match(re)) {
            value = matches[1] || matches[2];
            newHref = ' n:href="' + value + '"';
            txt = txt.replace(re, newHref);
        }

        // Get all html attributes
        re = / [\w:-]+="[^"]*"| [\w:-]+=\S+/g;
        matches = matchAll(re, txt);
        htmlAttributes = '';

        if (matches) {
            txt = txt.replace(re, '');
            htmlAttributes = matches.join("");
        }

        // Get the id selector
        re = / #(\S+)/;
        idSelector = txt.match(re);
        if (idSelector && !htmlAttributes.match(/ id="[^"]+"| id=[\S]+/))
            htmlAttributes += ' id="' + idSelector[1] + '"';

        if (idSelector) {
            while (match = re.exec(txt)) {
                txt = txt.replace(re, '');
            }
        }

        // Get all class selectors
        re = / \.(\S+)/g;
        matches = matchAll(re, txt);
        clsSelectors = '';

        if (matches) {
            txt = txt.replace(re, '');
            for (match of matches) {
                clsSelectors += " " + match[1];
            }
            clsSelectors = ltrim(clsSelectors);
        }

        // Synchronize class selectors
        re = / class="([^"]+)+"| class=([\S]+)+/;
        htmlClsSelector = htmlAttributes.match(re);
        if (clsSelectors && htmlClsSelector) {
            htmlAttributes = htmlAttributes.replace(re, ' class="' + htmlClsSelector[1] + ' ' + clsSelectors + '"');
        } else if (clsSelectors) {
            htmlAttributes += ' class="' + clsSelectors + '"';

        }

        // Get all quick attributes
        re = / ([\d]+)?\$(?:([^$;"]+);|(\S+)+)/g;
        qkAttributes = [];
        matches = matchAll(re, txt);
        if (matches) {
            txt = txt.replace(re, '');
            for (i = 0; i < matches.length; i++) {
                attribute = matches[i];
                paramVal = attribute[attribute.length - 1] || attribute[attribute.length - 2];
                if (paramVal && paramVal.toLowerCase() !== 'null') {
                    // If quick attribute is without index
                    paramKey = !isNaN(parseFloat(attribute[1])) && isFinite(attribute[1]) ? attribute[1] : null;
                    qkAttributes.push({
                        key: paramKey,
                        value: paramVal
                    });
                }
            }
        }
        // Get the text
        txt = Compiler.getLnTxt(txt) + txtFromTag2End;

        // Split the txt to an array in oder to get the boolean attributes
        txt2array = txt.split(' ');
        booleanAttributes = '';
        for (attribute of txt2array) {
            if (Elements.isBoolean(attribute)) {
                txt = txt.replace(attribute, '');
                booleanAttributes += ' ' + attribute;
            } else {
                break;
            }
        }

        // Return all attributes
        return {
            qkAttributes: qkAttributes,
            htmlAttributes: htmlAttributes,
            booleanAttributes: booleanAttributes,
            txt: txt
        };
    };

    /**
     * @param string txt
     * @returns {boolean}
     */
    Compiler.detectNoCompileArea = function (txt) {
        var areaClosed, matchedTag, tag, re, tagDetected,
            that = Compiler,
            skipTagClose = '/' + that.AREA_TAG,
            openTags = ['<style>', '<script>', '<?php', '<?', that.AREA_TAG].concat(that.ncaOpenTags),
            closeTags = ['</style>', '</script>', '?>', skipTagClose].concat(that.ncaCloseTags),
            regExpInlineTags = [/^\s*\<(?:\?|php) .*\?\>/, /^\s*\<(?:script|style) *[^>]*\>.*\<\/(?:style|script)\>/].concat(that.ncaRegExpInlineTags),
            regExpOpenTags = [/^\s*\<(?:script|style) *[^>]*\>/].concat(that.ncaRegExpOpenTags),
            regExpCloseTags = [/.*\<\/(?:style|script)\>$/, /.*\?\>$/, skipTagClose].concat(that.ncaRegExpCloseTags);

        txt = txt.trim();

        if (that.skipRow)
            that.skipRow = that.inNoCompileArea = false;

        areaClosed = that.inNoCompileArea ? false : null;

        if (inArray(txt.trim(), openTags)) {
            that.inNoCompileArea = true;
        } else if (inArray(txt.trim(), closeTags)) {
            that.inNoCompileArea = false;
        } else {
            matchedTag = false;

            if (!that.inNoCompileArea) {
                for (tag of regExpInlineTags) {
                    if (txt.match(tag)) {
                        matchedTag = that.skipRow = true;
                        break;
                    }
                }
            }

            if (!matchedTag && !that.inNoCompileArea) {
                for (tag of regExpOpenTags) {
                    if (txt.match(tag)) {
                        matchedTag = that.inNoCompileArea = true;
                        break;
                    }
                }
            }

            if (!matchedTag && that.inNoCompileArea) {
                for (tag of regExpCloseTags) {
                    if (txt.match(tag)) {
                        that.skipRow = true;
                        that.inNoCompileArea = false;
                        break;
                    }
                }
            }
        }

        tagDetected = (txt === that.AREA_TAG || txt === skipTagClose);

        // Set and return
        that.noCompileAreaClosed = areaClosed;
        return tagDetected;
    };

    /**
     * @param int lvl
     * @param string element
     * @param string line
     * @returns {{replicate: boolean, clearLine: boolean, line: boolean}}
     */
    Replicator.detect = function (lvl, element, line) {
        var deregister, isRegistered, key,
            that = Replicator,
            replicate, clearLine = false,
            replacement = null,
            registrationLine = line.match(that.REG_EXP_C);
        if (registrationLine) {
            clearLine = true;
            line = line.replace(RegExp.quote(element), '');
        }
        deregister = that.deregisterLvl(lvl, element);
        if (!deregister && line.length) {
            isRegistered = that.isRegistered(lvl, element, line, registrationLine);
            if (isRegistered['registered'] && !registrationLine) {
                replicate = true;
                // If the first word on line is also the part of the key in the register
                key = isRegistered['key'];
                replacement = key === true
                    ? that.replicate(isRegistered['registerId'], line, element, key)
                    : that.replicate(isRegistered['registerId'], line, null, false);
            }
        } else {
            clearLine = true;
        }
        return {
            replicate: replicate,
            clearLine: clearLine,
            line: replacement
        };
    };

    /**
     * @param int registerId
     * @param string line
     * @param string element
     * @param boolean key
     * @returns {string}
     */
    Replicator.replicate = function (registerId, line, element, key) {
        var replicatedLine,
            that = Replicator,
            contentArrays = matchAll(that.REG_EXP_A, line);
        if (key)
            line = line.replace(RegExp.quote(element), '');
        replicatedLine = contentArrays
            ? that.synchronizeLines(line, registerId, contentArrays)
            : that.synchronizeLines(line, registerId, null);
        return replicatedLine;
    };

    /**
     * @param string line
     * @param string registerId
     * @param array matches
     * @returns {string}
     */
    Replicator.synchronizeLines = function (line, registerId, matches) {
        var exists, clear, match, re,
            that = Replicator,
            reB = that.REG_EXP_B,
            registeredLine = that.register[registerId];
        if (matches) {
            for (match of matches) {
                exists = registeredLine.match(reB);
                if (exists) {
                    registeredLine = registeredLine.replace(reB, match[1]);
                    line = ltrim(line.replace(match[0], ''));
                } else {
                    break;
                }
            }
        }
        re = that.REG_EXP_B_g;
        clear = registeredLine.replace(re, '');
        return (clear + line).trim();
    };

    /**
     * @param int lvl
     * @param string element
     * @returns {boolean}
     */
    Replicator.deregisterLvl = function (lvl, element) {
        var selected,
            that = Replicator,
            unregistered = false,
            match = element.match(that.REG_EXP_D);
        if (match) {
            selected = lvl + that.SUFFIX;
            if (match[1].length) {
                selected = lvl + '-' + match[1];
                if (that.register[selected]) {
                    delete that.register[selected];
                    unregistered = true;
                }
            } else if (that.register[selected]) {
                delete that.register[selected];
                unregistered = true;
            }
        }
        return unregistered;
    };

    /**
     * @param int lvl
     * @param string element
     * @param string line
     * @param string registrationLine
     * @returns {{registered: boolean, key: boolean, registerId: *}}
     */
    Replicator.isRegistered = function (lvl, element, line, registrationLine) {
        var registerLvl,
            that = Replicator,
            registered = false,
            key = false,
            registerId = null;

        if (!registrationLine) {
            if (arrayKeyExists(lvl + '-' + element, that.register)) {
                registered = key = true;
                registerId = lvl + '-' + element;
            } else if (arrayKeyExists(lvl + that.SUFFIX, that.register)) {
                registered = true;
                registerId = lvl + that.SUFFIX;
            }
        }
        if (!registered || registrationLine) {
            registerLvl = that.registerLvl(element, line, lvl);
            registered = registerLvl['registered'];
            registerId = registerLvl['registerId'];
        }
        return {
            registered: registered,
            key: key,
            registerId: registerId
        };
    };

    /**
     * @param string element
     * @param string line
     * @param int lvl
     * @returns {{registered: boolean, registerId: string}}
     */
    Replicator.registerLvl = function (element, line, lvl) {
        var that = Replicator,
            registered = false,
            registerId = null,
            matches = element.match(that.REG_EXP_C);
        if (matches) {
            registerId = lvl;
            registerId += matches[1] ? '-' + matches[1] : that.SUFFIX;
            that.register[registerId] = line;
            registered = true;
        }
        return {
            registered: registered,
            registerId: registerId
        };
    };

    /**
     * @param string macro
     * @param string ln
     * @returns {{exists: boolean, replacement: *}}
     */
    Macros.replace = function (macro, ln) {
        var line, re, macroFn,
            that = Macros,
            replacement = null,
            exists = false;
        if (that.macros[macro]) {
            re = new RegExp("^" + RegExp.quote(macro));
            line = ltrim(ln.replace(re, ''));
            replacement = that.macros[macro](line);
            exists = true;
        }
        return {
            exists: exists,
            replacement: replacement
        };
    };

    /**
     * @param string macroId
     * @param callable fn
     */
    Macros.addMacro = function (macroId, fn) {
        var that = Macros;

        if (!arrayKeyExists(macroId, that.macros))
            that.macros[macroId] = fn;
    };

    /** @param string macros */
    Macros.removeMacros = function (macros) {
        var macro;
        macros = macros.split(" ");
        for (macro of macros) {
            if (arrayKeyExists(macro, this.macros)) {
                delete this.macros[macro];
            }
        }
    };

    /**
     * @param attribute
     * @return boolean
     */
    Elements.isBoolean = function (attribute) {
        return inArray(attribute, Elements.booleanAttributes);
    };

    /**
     * @param string el
     * @param returnSettings
     * @returns {boolean}
     */
    Elements.findElement = function (el, returnSettings) {
        var result = false;
        if (inArray(el, Elements.elements))
            result = returnSettings ? Elements.getElementSettings(el) : true;
        return result;
    };

    /**
     * @param string el
     * @returns {{element: string, paired: boolean, qkAttributes: array}}
     */
    Elements.getElementSettings = function (el) {
        var s,
            qkAttributes = null,
            paired = true,
            settings = Elements.elementsSettings;
        if (arrayKeyExists(el, settings)) {
            s = settings[el];
            paired = !arrayKeyExists("unpaired", s);
            qkAttributes = arrayKeyExists("qkAttributes", s) ? s['qkAttributes'] : null;
        }

        return {
            element: el,
            paired: paired,
            qkAttributes: qkAttributes
        }
    };

    /** @param array $attributes */
    Elements.addBooleanAttributes = function (attributes) {
        if (attributes && typeof attributes === "string") {
            attributes = attributes.splice(" ");
            Elements.booleanAttributes.concat(attributes);
        }
    };

    /** @param array $attributes */
    Elements.removeBooleanAttributes = function (attributes) {
        var attributeKey, attribute;

        attributes = attributes.split(" ");
        for (attribute of attributes) {
            attributeKey = inArray(attribute, this.booleanAttributes, true);
            if (attributeKey >= 0) {
                delete this.booleanAttributes[attributeKey];
            }
        }
    };
    Elements.addElements = function (elements) {
        var elementKey, elementSettings;

        for (elementKey in elements) {
            elementSettings = elements[elementKey];
            if (elementSettings) {
                this.elementsSettings[elementKey] = elementSettings;
            }
            this.elements.push(elementKey);
        }
    };

    Elements.removeElements = function (elements) {
        var elements, elementKey, element;

        elements = elements.split(" ");
        for (element of elements) {
            elementKey = inArray(element, this.elements, true);
            if (elementKey >= 0)
                delete this.elements[elementKey];

            delete this.elementsSettings[element];
        }
    };

    Elements.changeQkAttributes = function (elements) {
        var attributes, attribute, newAttribute, attrKey, actAttribute, element, elementKey,
            removeAttributes = [];
        if (elements && typeof elements === "object") {
            for (elementKey in elements) {
                element = elementKey;
                attributes = elements[elementKey];
                for (attribute in attributes) {
                    actAttribute = attribute;
                    newAttribute = attributes[attribute];
                    if (arrayKeyExists(element, this.elementsSettings) && arrayKeyExists("qkAttributes", this.elementsSettings[element]) && inArray(actAttribute, this.elementsSettings[element]["qkAttributes"])) {
                        if (newAttribute) {
                            attrKey = inArray(actAttribute, this.elementsSettings[element]["qkAttributes"], true);
                            this.elementsSettings[element]["qkAttributes"][attrKey] = newAttribute;
                        } else {
                            removeAttributes.push(actAttribute);
                        }
                    }
                }
                if (removeAttributes) {
                    for (attribute of removeAttributes) {
                        attrKey = inArray(attribute, this.elementsSettings[element]["qkAttributes"], true);
                        delete this.elementsSettings[element]["qkAttributes"][attrKey];
                    }
                }
            }
        }
    };

    /** @type {string[]} */
    Elements.elements = [
        'a',
        'abbr',
        'address',
        'area',
        'article',
        'aside',
        'audio',
        'b',
        'base',
        'bdi',
        'bdo',
        'blockquote',
        'body',
        'br',
        'button',
        'canvas',
        'caption',
        'cite',
        'code',
        'col',
        'colgroup',
        'data',
        'datalist',
        'dd',
        'del',
        'dfn',
        'div',
        'dl',
        'dt',
        'element',
        'em',
        'embed',
        'fieldset',
        'figcaption',
        'figure',
        'footer',
        'form',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'head',
        'header',
        'hr',
        'html',
        'i',
        'iframe',
        'img',
        'input',
        'ins',
        'kbd',
        'label',
        'legend',
        'li',
        'link',
        'main',
        'map',
        'mark',
        'meta',
        'meter',
        'nav',
        'noframes',
        'noscript',
        'object',
        'ol',
        'optgroup',
        'option',
        'output',
        'p',
        'param',
        'pre',
        'progress',
        'q',
        'rp',
        'rt',
        'rtc',
        'ruby',
        's',
        'samp',
        'script',
        'section',
        'select',
        'shadow',
        'small',
        'source',
        'span',
        'strong',
        'style',
        'sub',
        'sup',
        'table',
        'tbody',
        'td',
        'template',
        'textarea',
        'tfoot',
        'th',
        'thead',
        'time',
        'title',
        'tr',
        'track',
        'u',
        'ul',
        'var',
        'video',
        'wbr',
        //Experimental and not standardized API elements
        'bgsound',
        'details',
        'dialog',
        'hgroup',
        'image',
        'menu',
        'menuitem',
        'multicol',
        'nobr',
        'picture',
        'summary'
    ];

    /** @type {string[]} */
    Elements.booleanAttributes = [
        'autofocus',
        'autoplay',
        'async',
        'contenteditable',
        'controls',
        'default',
        'defer',
        'disabled',
        'draggable',
        'formnovalidate',
        'hidden',
        'checked',
        'ismap',
        'loop',
        'multiple',
        'muted',
        'open',
        'readonly',
        'required',
        'selected',
        'spellcheck',
        'n:ifcontent'
    ];

    /** @type object */
    Elements.elementsSettings = {
        a: {
            qkAttributes: ['href', 'target', 'role']
        },
        abbr: {
            qkAttributes: ['title']
        },
        area: {
            unpaired: true
        },
        audio: {
            qkAttributes: ['src']
        },
        base: {
            unpaired: true
        },
        bdo: {
            qkAttributes: ['dir']
        },
        br: {
            unpaired: true
        },
        button: {
            qkAttributes: ['type', 'value']
        },
        canvas: {
            qkAttributes: ['width', 'height']
        },
        col: {
            unpaired: true,
            qkAttributes: ['span']
        },
        data: {
            qkAttributes: ['value']
        },
        embed: {
            unpaired: true,
            qkAttributes: ['src', 'type', 'width', 'height']
        },
        form: {
            qkAttributes: ['method']
        },
        hr: {
            unpaired: true
        },
        html: {
            qkAttributes: ['lang']
        },
        iframe: {
            qkAttributes: ['src', 'frameborder', 'width', 'height']
        },
        img: {
            unpaired: true,
            qkAttributes: ['src', 'alt']
        },
        input: {
            unpaired: true,
            qkAttributes: ['type', 'value', 'placeholder']
        },
        label: {
            qkAttributes: ['for']
        },
        link: {
            unpaired: true,
            qkAttributes: ['href', 'rel', 'title']
        },
        meta: {
            unpaired: true,
            qkAttributes: ['name', 'content']
        },
        object: {
            qkAttributes: ['data', 'type']
        },
        ol: {
            qkAttributes: ['type', 'start', 'reversed']
        },
        optgroup: {
            qkAttributes: ['label']
        },
        option: {
            qkAttributes: ['value']
        },
        param: {
            unpaired: true,
            qkAttributes: ['name', 'value']
        },
        progress: {
            qkAttributes: ['value', 'max']
        },
        q: {
            qkAttributes: ['cite']
        },
        script: {
            qkAttributes: ['src', 'type']
        },
        source: {
            unpaired: true,
            qkAttributes: ['src', 'type']
        },
        style: {
            qkAttributes: ['type']
        },
        td: {
            qkAttributes: ['rowspan', 'colspan']
        },
        textarea: {
            qkAttributes: ['placeholder']
        },
        track: {
            unpaired: true,
            qkAttributes: ['src', 'srclang', 'kind']
        },
        wbr: {
            unpaired: true
        },
        //Experimental and not standardized API elements
        menu: {
            qkAttributes: ['type', 'label']
        },
        menuitem: {
            qkAttributes: ['type']
        }
    };

    /** @return {string} */
    Macros.addMacro("!5", function () {
        return '<!DOCTYPE html>';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('!Doctype', function (line) {
        return '<!DOCTYPE ' + line + '>';
    });

    /**
     * @return string
     */
    Macros.addMacro('utf-8', function () {
        return '<meta charset="utf-8" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('charset', function (line) {
        return '<meta charset="' + line + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('keywords', function (line) {
        return '<meta name="Keywords" content="' + line + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('description', function (line) {
        return '<meta name="Description" content="' + line + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('author', function (line) {
        return '<meta name="Author" content="' + line + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('viewport', function (line) {
        return '<meta name="viewport" content="' + line + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('fb', function (line) {
        var splitLine = line.split(" "),
            selected = splitLine[0],
            content = (line.replace(selected, '')).trim();

        return '<meta property="og:' + selected + '" content="' + content + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('tw', function (line) {
        var splitLine = line.split(" "),
            selected = splitLine[0],
            content = (line.replace(selected, '')).trim();

        return '<meta name="twitter:' + selected + '" content="' + content + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('css', function (line) {
        return '<link rel="stylesheet" type="text/css" href="' + line + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('favicon', function (line) {
        return '<link rel="shortcut icon" href="' + line + '" />';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('js', function (line) {
        return '<script type="text/javascript" src="' + line + '"></script>';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('js-async', function (line) {
        return '<script type="text/javascript" src="' + line + '" async></script>';
    });

    /**
     * @param string line
     * @return string
     */
    Macros.addMacro('//', function (line) {
        return '<!--' + line + '-->';
    });

    /**
     * @return string
     */
    Macros.addMacro('/*', function (line) {
        return '<!--';
    });

    /**
     * @return string
     */
    Macros.addMacro('*/', function (line) {
        return '-->';
    });

    /**
     * @type {{setup: {}, compile: (Compiler.compile)}}
     */
    window.Macdom = {
        setup: {},
        compile: function (content) {

            if (!content) return;

            // Constructors
            Compiler.construct(this.setup);
            Elements.construct(this.setup);
            Macros.construct(this.setup);
            Replicator.construct(this.setup);

            if (this.setup.reset && this.setup.reset === true)
                this.setup = {};

            // Run compiler
            return Compiler.compile(content)
        }
    };
}());