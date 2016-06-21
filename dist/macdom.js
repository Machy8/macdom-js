/* Macdom-js Copyright (c) 2016 Vladimír Macháček | For the full copyright and license information, please view the file license.md that was distributed with this source code. */

(function () {

	"use strict";

	// Helpers definition

	var
		emptyStringArrayFilter = function (array) {
			var item,
				newArray = [];

			for (item of array) {
				if(item.trim().length) newArray.push(item);
			}

			return newArray;
		},

		ltrim = function (txt) {
			return txt ? txt.replace(/^\s+/, "") : txt;
		},

		inArray = function (needle, haystack, returnKey) {
			var key = haystack.indexOf(needle);

			if (returnKey)
				return key >= 0 ? key : 0;

			return key >= 0;
		},

		arrayKeyExists = function (key, haystack) {
			return haystack.hasOwnProperty(key);
		},

		matchAll = function (pattern, subject) {
			var match,
				matches = [];

			while (match = pattern.exec(subject)) {
				matches.push(match);
			}

			matches = matches.length ? matches : null;

			return matches;
		};

	RegExp.quote = function (str) {
		return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
	};

	/** Classes definition */
	var Compiler = {},
		Elements = {},
		Macros = {},
		Replicator = {},
		Setup;
		Macros.macros = {};

	Compiler.construct = function () {
		var inlineOpenTags, element, tag, reCloseTag,
			skipElements = Setup.skipElements || '',
			ncaSkipElements = ['script', 'style', 'textarea', 'code'];

			skipElements = skipElements.split(' ');

		this.AREA_TAG = 'SKIP';

		if (Setup.preferXhtml) Setup.closeSelfClosingTags = Setup.booleansWithValue = true;

		this.closeTags = [];
		this.outputQueue = [];
		this.outputStorage = '';
		this.prevOutput = [];
		this.inNoCompileArea = this.skipRow = false;
		this.noCompileAreaClosed = true;
		this.skippedElementLvl = null;
		this.ncaSkipElements = emptyStringArrayFilter(ncaSkipElements.concat(skipElements));
		this.ncaOpenTags = [this.AREA_TAG];
		this.ncaCloseTags = ['/' + this.AREA_TAG];
		inlineOpenTags = this.ncaSkipElements.join('|');
		this.ncaRegExpInlineTags = [new RegExp('\<(?:' + inlineOpenTags + ') *[^>]*\>.*\<\/(?:' + inlineOpenTags + ')\>')];
		this.ncaRegExpOpenTags = [new RegExp('\<(?:' + inlineOpenTags + ') *[^\>]*\>')];
		this.ncaRegExpCloseTags = [];

		for (element of this.ncaSkipElements) {
			this.ncaCloseTags.push('</' + element + '>');
			this.ncaOpenTags.push('<' + element + '>');
		}

		for (tag of this.ncaSkipElements) {
			reCloseTag = new RegExp('</'+tag+'>');
			this.ncaRegExpCloseTags.push(reCloseTag);
		}
	};

	Elements.construct = function () {

		this.addBooleanAttributes(Setup.addBooleanAttributes);
		this.changeQkAttributes(Setup.changeQkAttributes);
		this.removeBooleanAttributes(Setup.removeBooleanAttributes);
		this.addElements(Setup.addElements);
		this.removeElements(Setup.removeElements);
		this.addQkAttributes(Setup.addQkAttributes);

	};

	Macros.construct = function () {
		var macroKey, macros;

		if (Setup.addMacros) {
			macros = Setup.addMacros;

			for (macroKey in macros) {
				this.addMacro(macroKey, macros[macroKey]);
			}
		}

		this.removeMacros(Setup.removeMacros);

	};

	Replicator.construct = function () {
		this.REG_EXP_A = /\[(.*?)\]/g;
		this.REG_EXP_B = /\[@\]/;
		this.REG_EXP_B_g = /\[@\]/g;
		this.REG_EXP_C = /^@([\S]*)/;
		this.REG_EXP_D = /^\/@([\S]*)/;
		this.register = {};
	};

	Compiler.compile = function (content) {
		var ln, lvl, element, noCompileAreaTag, compilationAllowed, replicatorResult, processElement, txt, attributes, isJsCssLink, isJsCss, attr, type, macro;

		if (!content) return '';

		for (ln of content.split("\n")) {
			lvl = this.getLnLvl(ln);
			element = this.getElement(ln);
			noCompileAreaTag = this.detectNoCompileArea(ln, element, lvl);
			compilationAllowed = !this.inNoCompileArea && !this.skipRow && this.noCompileAreaClosed;

			if (noCompileAreaTag || compilationAllowed && !ln) continue;

			if (Setup.structureHtmlSkeleton) {
				lvl = inArray(element, ['head', 'body']) ? 1 : lvl + 1;
				if (element === 'html') lvl = 0;
			}

			if (compilationAllowed && ln && !Elements.findElement(element)) {
				ln = ln.replace(/\|$/, '');
				replicatorResult = Replicator.detect(lvl, element, ln);

				if (replicatorResult['toReplicate']) {
					ln = replicatorResult['toReplicate'];
					element = this.getElement(ln);
				}

				if (replicatorResult['clearLn']) ln = element = null;
			}

			processElement = compilationAllowed && Elements.findElement(element);
			txt = this.getLnTxt(ln, compilationAllowed, processElement);

			if (processElement) {
				attributes = this.processLn(txt);
				this.addOpenTag(element, lvl, attributes);

			} else if (txt) {
				this.addCloseTags(lvl);
				isJsCssLink = this.getElement(txt);
				isJsCss = isJsCssLink.match(/\.((?:css|js))$/);

				if (compilationAllowed && isJsCss) {
					if (isJsCss[1] === "css") {
						element = "link";
						attr = "href";
						type = 'rel="stylesheet" type="text/css"';

					} else {
						element = "script";
						attr = "src";
						type = 'type="text/javascript"';

					}

					txt = this.getLnTxt(txt, true, true);
					txt = ' ' + type + ' ' + attr + '="' + isJsCssLink + '"' + txt;
					attributes = this.processLn(txt);
					attributes['txt'] = null;
					this.addOpenTag(element, lvl, attributes);

				} else {
					macro = compilationAllowed && Macros.findMacro(element);
					content = macro ? Macros.replace(element, txt) : txt;
					type = macro ? 'macro' : 'text';
					this.addToQueue(type, content, lvl);
				}
			}
		}

		this.addCloseTags();
		this.composeContent();

		return this.outputStorage;
	};

	Compiler.getElement = function (ln) {
		var element = ln.trim().split(" ");

		return element[0];
	};

	Compiler.getLnTxt = function (ln, clean, elementExists) {
		var element, re,
			clean = clean || false,
			elementExists = elementExists || false,
			find = [new RegExp(' *' + this.AREA_TAG + '(?:-CONTENT)?')],
			txt = ltrim(ln);

		if (elementExists) {
			txt = txt.split(' ').slice(1).join(' ');
			txt = ' ' + txt;
		}

		if (clean) find.push(/^\|/);

		if (txt) {
			for(re of find) {
				txt = txt.replace(re, '');
			}
		}

		return txt;
	};

	Compiler.getLnLvl = function (ln) {
		var spaces, tabulators,
			method = Setup.indentMethod,
			matches = ln.match(/^\s+/) || null,
			whites = matches ? matches[0] : "",
			re = new RegExp(" {" + Setup.spacesPerIndent + "}", "g");

		spaces = method === 'spaces' || method === 'combined' ? whites.match(re) : 0;
		spaces = spaces ? spaces.length : 0;

		tabulators = method === 'tabs' || method === 'combined' ? whites.match(/\t/g) : 0;
		tabulators = tabulators ? tabulators.length : 0;

		if (method === 'combined') tabulators *= 2;

		return spaces + tabulators;
	};

	Compiler.addCloseTags = function (lvl) {
		var i,
			lvl = lvl || 0,
			lastTag = this.closeTags.length;

		for (i = lastTag - 1; i >= 0; i--) {
			if (lvl > this.closeTags[i][0]) break;

			this.addToQueue('closeTag', this.closeTags[i][1], this.closeTags[i][0]);
			lastTag = i;

		}

		this.closeTags.splice(lastTag, this.closeTags.length);
	};

	Compiler.addOpenTag = function (element, lvl, attributes) {
		var usedKeys, withoutKey, newAttr, paramKey, selfClosing, type, closeTag, txt, attribute,
			elementSettings = Elements.findElement(element, true),
			openTag = '<' + element,
			sQkAttributes = elementSettings['qkAttributes'],
			qkAttributes = attributes['qkAttributes'];

		if (sQkAttributes && qkAttributes) {
			usedKeys = [];
			withoutKey = 0;

			for (attribute of qkAttributes) {
				newAttr = null;

				if (attribute['key']) {
					paramKey = attribute['key'] - 1;

					if (arrayKeyExists(paramKey, sQkAttributes)) {
						newAttr = sQkAttributes[paramKey] + '="' + attribute['value'] + '"';
						usedKeys.push(paramKey);
					}

				} else if (!inArray(withoutKey, usedKeys) && arrayKeyExists(withoutKey, sQkAttributes)) {
					newAttr = sQkAttributes[withoutKey] + '="' + attribute['value'] + '"';
					withoutKey++;
				}

				openTag += newAttr ? ' ' + newAttr : '';
			}
		}

		// Add html and boolean attributes
		openTag += attributes['htmlAttributes'] + attributes['booleanAttributes'];

		// Close the open tag, add close tags if needed
		selfClosing = elementSettings['paired'] || !Setup.closeSelfClosingTags ? '' : ' /';
		openTag += selfClosing + '>';
		this.addCloseTags(lvl);
		type = elementSettings['paired'] ? 'openTag' : 'inlineTag';
		this.addToQueue(type, openTag, lvl);

		// If the tag is paired add its close tag to the storage
		if (elementSettings['paired']) {
			txt = attributes['txt'];

			if (txt) {
				this.addToQueue('text', txt, lvl);
			}

			closeTag = '</' + element + '>';
			this.closeTags.push([lvl, closeTag]);
		}
	};

	Compiler.processLn = function (txt) {
		var value, i, classes, newHref, htmlAttributes, htmlClsSelector, re, reAll, idSelector, attribute, matches,
			txt2array, match, paramVal, clsSelectors, qkAttributes, booleanAttributes, paramKey, txtFromTag2End;

		// Store the text from the first tag to the end of the line
		re = / <[\w-]+ .*$/;
		txtFromTag2End = '';
		if (match = txt.match(re)) {
			txt = txt.replace(re, '');
			txtFromTag2End += match[0];
		}

		// Replace -*= for data-*=
		re = / -([\w-]+)+=/g;
		matches = matchAll(re, txt);
		if (matches) {
			for (match of matches) {
				re = new RegExp('-' + match[1] + '=');
				txt = txt.replace(re, ' data-' + match[1] + '=');
			}
		}

		// Get all html attributes
		re = / [\w:-]+="[^"]*"| [\w:-]+='[^']*'| [\w:-]+=\S+/g;
		matches = matchAll(re, txt);
		htmlAttributes = '';
		if (matches) {
			txt = txt.replace(re, '');
			htmlAttributes = matches.join("");
		}

		// Get the id selector
		re = / #(\S+)/;
		idSelector = txt.match(re);
		if (idSelector && !htmlAttributes.match(/ id="[^"]+"|  id='[^']+'| id=[\S]+/)) htmlAttributes += ' id="' + idSelector[1] + '"';
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
		re = / class="([^"]+)+"| class='([^']+)+'| class=([\S]+)+/;
		htmlClsSelector = htmlAttributes.match(re);
		if (clsSelectors && htmlClsSelector) {
			for (i = 1; i < htmlClsSelector.length; i++) {
				if (htmlClsSelector[i]) {
					htmlClsSelector = htmlClsSelector[i];
					break;
				}
			}
			htmlAttributes = htmlAttributes.replace(re, ' class="' + htmlClsSelector + ' ' + clsSelectors + '"');

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
		txt = this.getLnTxt(txt, true) + txtFromTag2End;

		// Split the txt to an array in oder to get the boolean attributes
		txt2array = txt.split(' ');
		booleanAttributes = '';
		for (attribute of txt2array) {
			if (Elements.isBoolean(attribute)) {
				txt = txt.replace(attribute, '');
				booleanAttributes += ' ' + attribute;
				booleanAttributes += Setup.booleansWithValue ? '="' + attribute + '"' : '';

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

	Compiler.detectNoCompileArea = function (txt, element, lvl) {
		var areaClosed, matchedTag, tag, re, tagDetected, txt2array,
			skipContent = false,
			skipRow = false,
			skipTagClose = '/' + this.AREA_TAG;

		txt = txt.trim();

		if (this.skipRow) this.skipRow = this.inNoCompileArea = false;

		areaClosed = !this.inNoCompileArea;

		if (areaClosed) {
			txt2array = txt.split(' ');

			if (txt2array[txt2array.length-1] === this.AREA_TAG && txt2array.length > 1) {
				skipRow = true;

			} else if (txt2array[txt2array.length-1] === this.AREA_TAG + '-CONTENT') {
				skipContent = true;
			}
		}

		if (inArray(element, this.ncaSkipElements) && (this.skippedElementLvl === null || this.skippedElementLvl !== null && lvl <= this.skippedElementLvl) || skipContent) {
			this.skippedElementLvl = lvl;

		} else if (this.skippedElementLvl !== null && lvl > this.skippedElementLvl || skipRow) {
			this.skipRow = true;

		} else {
			this.skippedElementLvl = null;
		}

		if (!this.skippedElementLvl) {
			if (inArray(txt.trim(), this.ncaOpenTags)) {
				this.inNoCompileArea = true;

			} else if (inArray(txt.trim(), this.ncaCloseTags)) {
				this.inNoCompileArea = false;

			} else {
				matchedTag = false;

				if (!this.inNoCompileArea) {
					for (tag of this.ncaRegExpInlineTags) {
						if (txt.match(tag)) {
							matchedTag = this.skipRow = true;
							break;
						}
					}
				}

				if (!matchedTag && !this.inNoCompileArea) {
					for (tag of this.ncaRegExpOpenTags) {
						if (txt.match(tag)) {
							matchedTag = this.inNoCompileArea = true;
							break;
						}
					}
				}

				if (!matchedTag && this.inNoCompileArea) {
					for (tag of this.ncaRegExpCloseTags) {
						if (txt.match(tag)) {
							this.skipRow = true;
							this.inNoCompileArea = false;
							break;
						}
					}
				}
			}
		}

		tagDetected = txt === this.AREA_TAG || txt === skipTagClose;

		// Set and return
		this.noCompileAreaClosed = areaClosed;
		return tagDetected;
	};


	Compiler.addToQueue = function (type, content, lvl) {
		var formatting = !this.inNoCompileArea && !this.skipRow,
			lastKey = this.outputQueue.length - 1,
			contentArr = {
				type: type,
				content: content,
				lvl: lvl,
				formatting: formatting
			};

		if (type === 'text' && Setup.compressText && formatting && arrayKeyExists(lastKey, this.outputQueue) && this.outputQueue[lastKey]['type'] === 'text' && this.outputQueue[lastKey]['formatting']) {
			this.outputQueue[lastKey]['content'] += content;
			return;
		}

		this.outputQueue.push(contentArr);

		if (type !== 'text') this.composeContent();
	};

	Compiler.composeContent = function () {
		var contentKey, contentArr, lvl, nextOutputKey, nextOutputType, trio, method, indentation, lnBreak;
		for (contentKey in this.outputQueue) {
			contentArr = this.outputQueue[contentKey];

			if (!Setup.compressCode) {
				lvl = contentArr['lvl'];
				nextOutputKey = contentKey + 1;
				nextOutputType = arrayKeyExists(nextOutputKey, this.outputQueue) ? this.outputQueue[nextOutputKey]['type'] : '';

				// WTF condition for output formatting
				trio = ['openTag', 'inlineTag', 'macro'];

				if (typeof this.prevOutput['type'] !== 'undefined' && (!this.prevOutput['formatting'] || inArray(this.prevOutput['type'], ['closeTag', 'inlineTag', 'macro']) || inArray(contentArr['type'], trio)
					|| contentArr['type'] === 'closeTag' && (this.prevOutput['type'] === 'text' && (!Setup.compressText || this.prev2OutputType !== 'openTag'))
					|| contentArr['type'] === 'text' && (!Setup.compressText || Setup.compressText && (!contentArr['formatting'] || this.prevOutput['type'] === 'openTag' && inArray(nextOutputType, trio))))
				) {
					if (contentArr['formatting'] && contentArr['type'] === 'text') {
						if (!Setup.compressText && lvl === this.prevOutput['lvl'] && this.prevOutput['type'] === 'openTag') {
							lvl++;

						} else if (Setup.compressText && (this.prevOutput['type'] === 'text' && this.prevOutput['formatting'] || this.prevOutput['type'] === 'openTag')) {
							lvl = this.prevOutput['lvl'] + 1;
						}
					}
					lvl += Setup.structureHtmlSkeleton && lvl > 0 ? -1 : 0;
					method = Setup.outputIndentation === 'spaces' ? '    ' : "\t";
					indentation = method.repeat(lvl);
					lnBreak = Setup.compressCode ? '' : "\n";
					this.outputStorage += lnBreak + indentation;
				}
				this.prev2OutputType = this.prevOutput['type'];
				this.prevOutput = contentArr;
			}
			this.outputStorage += contentArr['content'];
		}
		this.outputQueue = [];
	};

	Replicator.detect = function (lvl, element, txt) {
		var deregLn, regLn, re, regLnKey,
			key = element.match(this.REG_EXP_C),
			clearLn = false,
			replacement = null;

		if (key) {
			clearLn = true;
			txt = ltrim(txt).replace(key[0], '');
			regLnKey = arrayKeyExists(1, key) ? key[1] : null;
			this.registerLvl(regLnKey, lvl, txt);
		}

		deregLn = element.match(this.REG_EXP_D);
		if (!deregLn && !key) {

			regLn = this.isRegistered(lvl, element);

			if (regLn['ln']) {
				re = new RegExp(RegExp.quote(element));

				if (regLn['key']) txt = txt.replace(re, '');

				replacement = this.synchronizeLines(txt, regLn['ln']);
			}

		} else if (deregLn) {
			clearLn = true;
			this.deregisterLvl(lvl, deregLn[1]);
		}

		return {
			clearLn: clearLn,
			toReplicate: replacement
		}
	};

	Replicator.synchronizeLines = function (ln, regLn) {
		var clear, match,
			matches = matchAll(this.REG_EXP_A, ln);

		if (matches) {
			for (match of matches) {
				regLn = regLn.replace(this.REG_EXP_B, match[1]);
				ln = ln.replace(match[0], '');
			}
		}

		ln = ltrim(ln.replace(this.REG_EXP_A, ''));
		clear = regLn.replace(this.REG_EXP_B, '');

		return (clear + ln).trim();
	};

	Replicator.deregisterLvl = function (lvl, ln) {
		var selected = ln ? lvl + '-' + ln : lvl + '-x';

		if (arrayKeyExists(selected, this.register)) delete this.register[selected];
	};

	Replicator.isRegistered = function (lvl, el) {
		var ln = null,
			key = false;

		if (arrayKeyExists(lvl + '-' + el, this.register)) {
			ln = this.register[lvl + '-' + el];
			key = true;

		} else if (arrayKeyExists(lvl + '-x', this.register)) {
			ln = this.register[lvl + '-x'];
		}

		return {
			ln: ln,
			key: key
		};
	};

	Replicator.registerLvl = function (key, lvl, ln) {
		var registerId = key ? lvl + '-' + key : lvl + '-x';
		this.register[registerId] = ln;
	};

	Macros.replace = function (macro, ln) {
		ln = ln.split(' ').slice(1).join(' ');

		return this.macros[macro](ln);
	};

	Macros.findMacro = function (macro) {
		return arrayKeyExists(macro, this.macros);
	};

	Macros.addMacro = function (macroId, fn) {

		if (!arrayKeyExists(macroId, this.macros)) this.macros[macroId] = fn;
	};

	Macros.removeMacros = function (macros) {
		if (typeof macros === 'string' && macros.trim().length) {
			var macro;
			macros = macros.split(" ");

			for (macro of macros) {
				if (arrayKeyExists(macro, this.macros)) delete this.macros[macro];
			}
		}
	};

	Elements.isBoolean = function (attribute) {
		return inArray(attribute, this.booleanAttributes);
	};

	Elements.findElement = function (el, returnSettings) {
		var result = false;

		if (inArray(el, this.elements)) result = returnSettings ? this.getElementSettings(el) : true;

		return result;
	};

	Elements.getElementSettings = function (el) {
		var s,
			qkAttributes = null,
			paired = true,
			settings = this.elementsSettings;

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

	Elements.addBooleanAttributes = function (attributes) {
		if (typeof attributes === "string" && attributes.trim().length) {
			attributes = attributes.split(" ");

			this.booleanAttributes = emptyStringArrayFilter(this.booleanAttributes.concat(attributes));
		}
	};

	Elements.removeBooleanAttributes = function (attributes) {
		if (typeof attributes === "string" && attributes.trim().length) {
			var attributeKey, attribute;
			attributes = attributes.split(" ");

			for (attribute of attributes) {
				attributeKey = inArray(attribute, this.booleanAttributes, true);

				if (attributeKey >= 0) delete this.booleanAttributes[attributeKey];
			}
		}
	};

	Elements.addElements = function (elements) {
		if (typeof elements === "object" && Object.keys(elements).length) {
			var elementKey, elementSettings;

			for (elementKey in elements) {
				elementSettings = elements[elementKey];

				if (elementSettings) this.elementsSettings[elementKey] = elementSettings;

				this.elements.push(elementKey);
			}
		}
	};

	Elements.removeElements = function (elements) {
		if (typeof elements === "string" && elements.trim().length) {
			var elementKey, element;

			elements = elements.split(" ");

			for (element of elements) {
				elementKey = inArray(element, this.elements, true);

				if (elementKey >= 0) delete this.elements[elementKey];

				delete this.elementsSettings[element];
			}
		}
	};

	Elements.changeQkAttributes = function (elements) {
		if (typeof elements === "object" && Object.keys(elements).length) {
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
		}
	};

	Elements.addQkAttributes = function (elements) {
		var i, element, newAttributes, attributes;
		if(typeof elements === 'object' && Object.keys(elements).length) {
			for (element of Object.keys(elements)) {
				attributes = elements[element];

				if (!arrayKeyExists(element, this.elementsSettings)) this.elementsSettings[element] = [];

				if (!arrayKeyExists('qkAttributes', this.elementsSettings[element])) this.elementsSettings[element]['qkAttributes'] = [];

				if (arrayKeyExists(element, this.elementsSettings)) {
					newAttributes = attributes.split(' ');
					this.elementsSettings[element]['qkAttributes'] = this.elementsSettings[element]['qkAttributes'].concat(newAttributes);
				}
			}
		}
	};

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

	Elements.booleanAttributes = [
		'allowfullscreen',
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
		'spellcheck'
	];

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
			unpaired: true,
			qkAttributes: ['href']
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

	Macros.addMacro("!5", function () {
		return '<!DOCTYPE html>';
	});

	Macros.addMacro('!Doctype', function (line) {
		return '<!DOCTYPE ' + line + '>';
	});

	Macros.addMacro('utf-8', function () {
		return '<meta charset="utf-8">';
	});

	Macros.addMacro('charset', function (line) {
		return '<meta charset="' + line + '">';
	});

	Macros.addMacro('keywords', function (line) {
		return '<meta name="keywords" content="' + line + '">';
	});

	Macros.addMacro('description', function (line) {
		return '<meta name="description" content="' + line + '">';
	});

	Macros.addMacro('author', function (line) {
		return '<meta name="author" content="' + line + '">';
	});

	Macros.addMacro('viewport', function (line) {
		var viewport = '<meta name="viewport" content="';
		viewport += line.trim() ? line : 'width=device-width, initial-scale=1';
		viewport += '">';
		return viewport;
	});

	Macros.addMacro('index-follow', function (line) {
		return '<meta name="robots" content="index, follow">';
	});

	Macros.addMacro('no-index-follow', function (line) {
		return '<meta name="robots" content="noindex, nofollow">';
	});

	Macros.addMacro('fb', function (line) {
		var splitLine = line.split(" "),
			selected = splitLine[0],
			content = (line.replace(selected, '')).trim();

		return '<meta property="og:' + selected + '" content="' + content + '">';
	});

	Macros.addMacro('tw', function (line) {
		var splitLine = line.split(" "),
			selected = splitLine[0],
			content = (line.replace(selected, '')).trim();

		return '<meta name="twitter:' + selected + '" content="' + content + '">';
	});

	Macros.addMacro('css', function (line) {
		return '<link rel="stylesheet" type="text/css" href="' + line + '">';
	});

	Macros.addMacro('favicon', function (line) {
		return '<link rel="shortcut icon" href="' + line + '">';
	});

	Macros.addMacro('js', function (line) {
		return '<script type="text/javascript" src="' + line + '"></script>';
	});

	Macros.addMacro('js-async', function (line) {
		return '<script type="text/javascript" src="' + line + '" async></script>';
	});

	Macros.addMacro('//', function (line) {
		return '<!--' + line + '-->';
	});

	Macros.addMacro('/*', function (line) {
		return '<!--';
	});

	Macros.addMacro('*/', function (line) {
		return '-->';
	});

	window.Macdom = {
		setup: {
			addBooleanAttributes: '',
			addElements: {},
			addMacros: {},
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
		},

		compile: function (content) {

			if (!content) return '';

			// Construct
			Setup = this.setup;
			Compiler.construct();
			Elements.construct();
			Macros.construct();
			Replicator.construct();

			// Run compiler
			return Compiler.compile(content)
		}
	};
}());