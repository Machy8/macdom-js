# Macdom-js

[![Build Status](https://travis-ci.org/Machy8/Macdom-js.svg?branch=master)](https://travis-ci.org/Machy8/Macdom-js)
[![npm](https://img.shields.io/npm/v/macdom.svg?maxAge=2592000)](https://www.npmjs.com/package/Macdom)
[![license](https://img.shields.io/github/license/machy8/macdom-js.svg?maxAge=2592000)](https://github.com/Machy8/Macdom-js/blob/master/license.md)
[![Join the chat at https://gitter.im/Machy8/Macdom](https://badges.gitter.im/Machy8/Macdom.svg)](https://gitter.im/Machy8/Macdom?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Macdom html preprocessor - javascript version

- Works pretty mutch the same as the PHP version. Documentation comming soon.
- [PHP version documentation](https://github.com/Machy8/Macdom/wiki)
- **[Try it on CODEPEN](http://codepen.io/Machy8/pen/mPLdbg)** *(JavaScript version is always behind the PHP version so it may contain bugs and errors that have already been fixed in the PHP version)*

##Sample

**Macdom**
```` Slim
!5
html
head
	utf-8
	viewport
	favicon includes/favicon.ico
	title Macdom example
body
	h1 #title .titles .main-title Hello world
	nav
		@ a $http://www.[@].com $blank Link on -
		[google] .first-link Google
		[yahoo] Yahoo
		[github] Github	
	div #wrapper Some text <b>here</b>.
	https://www.code.jquery.com/jquery-1.12.0.min.js async
	
````

**Result**
```` html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<meta content="width=device-width" name="viewport">
		<link rel="shortcut icon" href="includes/favicon.ico">
		<title>Macdom example</title>
	</head>
	<body>
		<h1 id="title" class="titles main-title">Hello world</h1>
		<nav>
			<a target="blank" href="http://www.google.com" class="first-link">Link on - Google</a>
			<a target="blank" href="http://www.yahoo.com">Link on - Yahoo</a>
			<a target="blank" href="http://www.github.com">Link on - Github</a>
		</nav>
		<div id="wrapper">
			Some text <b>here</b>.
		</div>
		<script async="" type="text/javascript" src="https://www.code.jquery.com/jquery-1.12.0.min.js"></script>
	</body>
</html>
````

## Installation

````
npm install macdom
````
