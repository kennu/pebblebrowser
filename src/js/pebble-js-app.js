function limitText(text) {
  return (text || '').slice(0, 100);
}

function ackHandler(event) {
  //console.log('MSG ACK:', event.data.transactionId);
  advanceMsgQueue();
}

function nakHandler(event) {
  console.log('MSG NAK:', event.data.transactionId, event.data.error.code);
}

var msgQueue = [];

function sendMsgQueue() {
  if (msgQueue.length > 0) {
    Pebble.sendAppMessage(msgQueue[0], ackHandler, nakHandler);
  }
}

function advanceMsgQueue() {
  if (msgQueue.length > 0) {
    msgQueue.shift();
    //console.log('Shifted, now', msgQueue.length);
    sendMsgQueue();
  }
}

function queueMsg(msg) {
  msgQueue.push(msg);
  //console.log('Queued message', msg.linktag);
  if (msgQueue.length == 1) {
    sendMsgQueue();
  }
}

function parseContent(content) {
  content = content.replace(/<script.*?\/script>/g, '');
  //console.log('Parsing ' + content.slice(0, 1000), '...');
  tagStack = [];
  var currentTag = '';
  HTMLParser(content, {
    start: function(tag, attrs, unary) {
      //console.log('start:', tag);
      currentTag = tag;
      tagStack.push(tag);
    },
    end: function(tag) {
      //console.log('end:', tag);
      if (tagStack.length > 0) {
        currentTag = tagStack.pop();
      } else {
        currentTag = '';
      }
    },
    chars: function(text) {
      text = text.trim();
      if (currentTag.match(/^html|head|base|link|meta|style|script|figure|figcaption|ins|del|img|iframe|embed|object|param|video|audio|source|track|canvas|maparea|svg|math|form|fieldset|legend|label|input|button|select|datalist|optgroup|option|textarea|keygen|output|progress|meter|details|summary|menuitem|menu$/)) {
        // Ignore these elements
      } else if (currentTag.match(/^title$/)) {
        if (text.length > 0) {
          queueMsg({title:limitText(text)});
        }
      } else if (currentTag.match(/^a$/)) {
        // Show link elements
        if (text.length > 0) {
          //console.log(currentTag, text);
          queueMsg({linktag:limitText(text)});
        }
      } else if (currentTag.match(/^noscript|body|section|nav|article|aside|h1|h2|h3|h4|h5|h6|header|footer|address|main|p|hr|pre|blockquote|ol|ul|li|dl|dt|dd|div$/)) {
        // Show block elements
        if (text.length > 0) {
          //console.log(currentTag, text);
          queueMsg({blocktag:limitText(text)});
        }
      } else if (currentTag.match(/^table|caption|colgroup|col|tbody|thead|tfoot|tr|td|th$/)) {
        // Show table elements
        if (text.length > 0) {
          //console.log(currentTag, text);
          queueMsg({tabletag:limitText(text)});
        }
      } else if (currentTag.match(/^em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr$/)) {
        // Show text elements
        if (text.length > 0) {
          //console.log(currentTag, text);
          queueMsg({texttag:limitText(text)});
        }
      }
    },
    comment: function(text) {
    }
  });
  queueMsg({endresponse: "1"});
}

function loadUrl(url) {
  var req = new XMLHttpRequest();
  req.open('GET', url);
  req.setRequestHeader('X-Mula-Prefetch', 'disable');
  req.onload = function(e) {
    //console.log('req.onload()', req.readyState, req.status);
    if (req.readyState == 4 && req.status == 200) {
      //Pebble.showSimpleNotificationOnPebble("Response", (req.responseText || '').slice(0, 100));
      //Pebble.showSimpleNotificationOnPebble("Response", (req.responseText || '').length);
      queueMsg({response:req.status.toString()});
      //console.log('Navigator:', navigator.userAgent);
      try {
        parseContent(req.responseText);
      }
      catch (e) {
        console.log('ERROR', e);
      }
    } else if (req.readyState == 4) {
      // Error
      queueMsg({error:req.status.toString()});
    }
  };
  req.send(null);
}

Pebble.addEventListener('ready', function(e) {
  //console.log('Application initialized!');
});

Pebble.addEventListener('appmessage', function(e) {
  //console.log('AppMsg:', JSON.stringify(e.payload));
  if (e.payload.request) {
    loadUrl(e.payload.request);
  }
});


/*
 * HTML5 Parser By Sam Blowes
 *
 * Designed for HTML5 documents
 *
 * Original code by John Resig (ejohn.org)
 * http://ejohn.org/blog/pure-javascript-html-parser/
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */

(function () {

	// Regular Expressions for parsing tags and attributes
	var startTag = /^<([-A-Za-z0-9_]+)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		endTag = /^<\/([-A-Za-z0-9_]+)[^>]*>/,
		attr = /([a-zA-Z_:][-a-zA-Z0-9_:.]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;

	// Empty Elements - HTML 5
	var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

	// Block Elements - HTML 5
	var block = makeMap("address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video");

	// Inline Elements - HTML 5
	var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

	// Elements that you can, intentionally, leave open
	// (and which close themselves)
	var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

	// Attributes that have their values filled in disabled="disabled"
	var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

	// Special Elements (can contain anything)
	var special = makeMap("script,style");

	var HTMLParser = this.HTMLParser = function (html, handler) {
		var index, chars, match, stack = [], last = html;
		stack.last = function () {
			return this[this.length - 1];
		};

		while (html) {
			chars = true;

			// Make sure we're not in a script or style element
			if (!stack.last() || !special[stack.last()]) {

				// Comment
				if (html.indexOf("<!--") == 0) {
					index = html.indexOf("-->");

					if (index >= 0) {
						if (handler.comment)
							handler.comment(html.substring(4, index));
						html = html.substring(index + 3);
						chars = false;
					}

          // <!doctype ...>
        } else if (html.indexOf("<!") == 0) {
          index = html.indexOf('>');
          if (index >= 0) {
            html = html.substring(index+1);
            chars = false;
          }

					// end tag
				} else if (html.indexOf("</") == 0) {
					match = html.match(endTag);

					if (match) {
						html = html.substring(match[0].length);
						match[0].replace(endTag, parseEndTag);
						chars = false;
					}

					// start tag
				} else if (html.indexOf("<") == 0) {
					match = html.match(startTag);

					if (match) {
						html = html.substring(match[0].length);
						match[0].replace(startTag, parseStartTag);
						chars = false;
					}
				}

				if (chars) {
					index = html.indexOf("<");

					var text = index < 0 ? html : html.substring(0, index);
					html = index < 0 ? "" : html.substring(index);

					if (handler.chars)
						handler.chars(text);
				}

			} else {
				html = html.replace(new RegExp("([\\s\\S]*?)<\/" + stack.last() + "[^>]*>"), function (all, text) {
					text = text.replace(/<!--([\s\S]*?)-->|<!\[CDATA\[([\s\S]*?)]]>/g, "$1$2");
					if (handler.chars)
						handler.chars(text);

					return "";
				});

				parseEndTag("", stack.last());
			}

			if (html == last)
				throw "Parse Error: " + html;
			last = html;
		}

		// Clean up any remaining tags
		parseEndTag();

		function parseStartTag(tag, tagName, rest, unary) {
			tagName = tagName.toLowerCase();

			if (block[tagName]) {
				while (stack.last() && inline[stack.last()]) {
					parseEndTag("", stack.last());
				}
			}

			if (closeSelf[tagName] && stack.last() == tagName) {
				parseEndTag("", tagName);
			}

			unary = empty[tagName] || !!unary;

			if (!unary)
				stack.push(tagName);

			if (handler.start) {
				var attrs = [];

				rest.replace(attr, function (match, name) {
					var value = arguments[2] ? arguments[2] :
						arguments[3] ? arguments[3] :
						arguments[4] ? arguments[4] :
						fillAttrs[name] ? name : "";

					attrs.push({
						name: name,
						value: value,
						escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
					});
				});

				if (handler.start)
					handler.start(tagName, attrs, unary);
			}
		}

		function parseEndTag(tag, tagName) {
			// If no tag name is provided, clean shop
			if (!tagName)
				var pos = 0;

				// Find the closest opened tag of the same type
			else
				for (var pos = stack.length - 1; pos >= 0; pos--)
					if (stack[pos] == tagName)
						break;

			if (pos >= 0) {
				// Close all the open elements, up the stack
				for (var i = stack.length - 1; i >= pos; i--)
					if (handler.end)
						handler.end(stack[i]);

				// Remove the open elements from the stack
				stack.length = pos;
			}
		}
	};

	this.HTMLtoXML = function (html) {
		var results = "";

		HTMLParser(html, {
			start: function (tag, attrs, unary) {
				results += "<" + tag;

				for (var i = 0; i < attrs.length; i++)
					results += " " + attrs[i].name + '="' + attrs[i].escaped + '"';
				results += ">";
			},
			end: function (tag) {
				results += "</" + tag + ">";
			},
			chars: function (text) {
				results += text;
			},
			comment: function (text) {
				results += "<!--" + text + "-->";
			}
		});

		return results;
	};

	this.HTMLtoDOM = function (html, doc) {
		// There can be only one of these elements
		var one = makeMap("html,head,body,title");

		// Enforce a structure for the document
		var structure = {
			link: "head",
			base: "head"
		};

		if (!doc) {
			if (typeof DOMDocument != "undefined")
				doc = new DOMDocument();
			else if (typeof document != "undefined" && document.implementation && document.implementation.createDocument)
				doc = document.implementation.createDocument("", "", null);
			else if (typeof ActiveX != "undefined")
				doc = new ActiveXObject("Msxml.DOMDocument");

		} else
			doc = doc.ownerDocument ||
				doc.getOwnerDocument && doc.getOwnerDocument() ||
				doc;

		var elems = [],
			documentElement = doc.documentElement ||
				doc.getDocumentElement && doc.getDocumentElement();

		// If we're dealing with an empty document then we
		// need to pre-populate it with the HTML document structure
		if (!documentElement && doc.createElement) (function () {
			var html = doc.createElement("html");
			var head = doc.createElement("head");
			head.appendChild(doc.createElement("title"));
			html.appendChild(head);
			html.appendChild(doc.createElement("body"));
			doc.appendChild(html);
		})();

		// Find all the unique elements
		if (doc.getElementsByTagName)
			for (var i in one)
				one[i] = doc.getElementsByTagName(i)[0];

		// If we're working with a document, inject contents into
		// the body element
		var curParentNode = one.body;

		HTMLParser(html, {
			start: function (tagName, attrs, unary) {
				// If it's a pre-built element, then we can ignore
				// its construction
				if (one[tagName]) {
					curParentNode = one[tagName];
					if (!unary) {
						elems.push(curParentNode);
					}
					return;
				}

				var elem = doc.createElement(tagName);

				for (var attr in attrs)
					elem.setAttribute(attrs[attr].name, attrs[attr].value);

				if (structure[tagName] && typeof one[structure[tagName]] != "boolean")
					one[structure[tagName]].appendChild(elem);

				else if (curParentNode && curParentNode.appendChild)
					curParentNode.appendChild(elem);

				if (!unary) {
					elems.push(elem);
					curParentNode = elem;
				}
			},
			end: function (tag) {
				elems.length -= 1;

				// Init the new parentNode
				curParentNode = elems[elems.length - 1];
			},
			chars: function (text) {
				curParentNode.appendChild(doc.createTextNode(text));
			},
			comment: function (text) {
				// create comment node
			}
		});

		return doc;
	};

	function makeMap(str) {
		var obj = {}, items = str.split(",");
		for (var i = 0; i < items.length; i++)
			obj[items[i]] = true;
		return obj;
	}
})();
