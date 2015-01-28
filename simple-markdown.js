/* @flow */

/**
 * Simple-Markdown
 * ===============
 *
 * Simple-Markdown's primary goal is to be easy to adapt. It aims
 * to be compliant with John Gruber's [Markdown Syntax page][1],
 * but compatiblity with other markdown implementations' edge-cases
 * will be sacrificed where it conflicts with simplicity or
 * extensibility.
 *
 * If your goal is to simply embed a standard markdown implementation
 * in your website, simple-markdown is probably not the best library
 * for you (although it should work). But if you have struggled to
 * customize an existing library to meet your needs, simple-markdown
 * might be able to help.
 *
 * Many of the regexes and original logic has been adapted from
 * the wonderful [marked.js](https://github.com/chjj/marked)
 *
 * LICENSE (MIT):
 * New code copyright (c) 2014 Khan Academy.
 *
 * Portions adapted from marked.js copyright (c) 2011-2014
 * Christopher Jeffrey (https://github.com/chjj/).
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function() {

// Load dependencies from the global namespace or require them
var find = function(globalName) {
    if (typeof window !== "undefined" && window[globalName]) {
        return window[globalName];
    } else if (typeof global !== "undefined" && global[globalName]) {
        return global[globalName];
    } else {
        return undefined;
    }
};

var _ = find("_") || require("underscore");
var React = find("React") || require("react");

/**
 * Creates a parser for a given set of rules, with the precedence
 * specified as a list of rules.
 *
 * @rules: an object containing rule type -> {regex, parse} objects
 * @ruleList: an array of rule types, specifying the precedence rules
 *   are evaluated in (earlier in the array is higher precendence)
 *
 * @returns The resulting parse function, with the following parameters:
 *   @source: the input source string to be parsed
 *   @state: an optional object to be threaded through parse
 *     calls. Allows clients to add stateful operations to
 *     parsing, such as keeping track of how many levels deep
 *     some nesting is. For an example use-case, see passage-ref
 *     parsing in src/widgets/passage/passage-markdown.jsx
 */
var parserFor = function(rules, ruleList) {
    var nestedParse = function(source, state) {
        var result = [];
        state = state || {};
        // We store the previous capture so that match functions can
        // use some limited amount of lookbehind. Lists use this to
        // ensure they don't match arbitrary '- ' or '* ' in inline
        // text (see the list rule for more information).
        var prevCapture = "";
        while (source) {
            var i = 0;
            while (i < ruleList.length) {
                var ruleType = ruleList[i];
                var rule = rules[ruleType];
                var capture;
                if (rule.match) {
                    capture = rule.match(source, state, prevCapture);
                } else {
                    capture = rule.regex.exec(source);
                }
                if (capture) {
                    var currCaptureString = capture[0];
                    source = source.substring(currCaptureString.length);
                    var parsed = rule.parse(capture, nestedParse, state);
                    // We maintain the same object here so that rules can
                    // store references to the objects they return and
                    // modify them later. (oops sorry! but this adds a lot
                    // of power--see reflinks.)
                    // We also let rules override the default type of
                    // their parsed node if they would like to, so that
                    // there can be a single output function for all links,
                    // even if there are several rules to parse them.
                    if (parsed.type == null) {
                        parsed.type = ruleType;
                    }
                    result.push(parsed);

                    prevCapture = currCaptureString;
                    break;
                }
                i++;
            }

            // TODO(aria): Write tests for this
            if (i === ruleList.length) {
                throw new Error(
                    "could not find rule to match content: " + source
                );
            }
        }
        return result;
    };
    return nestedParse;
};

// Creates a match function for an inline scoped element from a regex
var inlineRegex = function(regex) {
    var match = function(source, state) {
        if (state.inline) {
            return regex.exec(source);
        } else {
            return null;
        }
    };
    match.regex = regex;
    return match;
};

// Creates a match function for a block scoped element from a regex
var blockRegex = function(regex) {
    var match = function(source, state) {
        if (state.inline) {
            return null;
        } else {
            return regex.exec(source);
        }
    };
    match.regex = regex;
    return match;
};

// Creates a match function from a regex, ignoring block/inline scope
var anyScopeRegex = function(regex) {
    var match = function(source, state) {
        return regex.exec(source);
    };
    match.regex = regex;
    return match;
};

var outputFor = function(outputFunc) {
    var nestedOutput = function(ast) {
        if (_.isArray(ast)) {
            return _.map(ast, nestedOutput);
        } else {
            return outputFunc(ast, nestedOutput);
        }
    };
    return nestedOutput;
};

var sanitizeUrl = function(url) {
    if (url == null) {
        return null;
    }
    try {
        var prot = decodeURIComponent(url)
            .replace(/[^A-Za-z0-9/:]/g, '')
            .toLowerCase();
        if (prot.indexOf('javascript:') === 0) {
            return null;
        }
    } catch (e) {
        // decodeURIComponent sometimes throws a URIError
        // See `decodeURIComponent('a%AFc');`
        // http://stackoverflow.com/questions/9064536/javascript-decodeuricomponent-malformed-uri-exception
        return null;
    }
    return url;
};

// Parse some content with the parser `parse`, with state.inline
// set to true. Useful for block elements; not generally necessary
// to be used by inline elements (where state.inline is already true.
var parseInline = function(parse, content, state) {
    var isCurrentlyInline = state.inline || false;
    state.inline = true;
    var result = parse(content, state);
    state.inline = isCurrentlyInline;
    return result;
};
var parseBlock = function(parse, content, state) {
    var isCurrentlyInline = state.inline || false;
    state.inline = false;
    var result = parse(content + "\n\n", state);
    state.inline = isCurrentlyInline;
    return result;
};

var parseCaptureInline = function(capture, parse, state) {
    return {
        content: parseInline(parse, capture[1], state)
    };
};
var ignoreCapture = function() { return {}; };

// recognize a `*` `-`, `+`, `1.`, `2.`... list bullet
var LIST_BULLET = "(?:[*+-]|\\d+\\.)";
// recognize the start of a list item:
// leading space plus a bullet plus a space (`   * `)
var LIST_ITEM_PREFIX = "( *)(" + LIST_BULLET + ") +";
var LIST_ITEM_PREFIX_R = new RegExp("^" + LIST_ITEM_PREFIX);
// recognize an individual list item:
//  * hi
//    this is part of the same item
//
//    as is this, which is a new paragraph in the same item
//
//  * but this is not part of the same item
var LIST_ITEM_R = new RegExp(
    LIST_ITEM_PREFIX +
    "[^\\n]*(?:\\n" +
    "(?!\\1" + LIST_BULLET + " )[^\\n]*)*(\n|$)",
    "gm"
);
var BLOCK_END_R = /\n{2,}$/;
// recognize the end of a paragraph block inside a list item:
// two or more newlines at end end of the item
var LIST_BLOCK_END_R = BLOCK_END_R;
var LIST_ITEM_END_R = / *\n+$/;
// check whether a list item has paragraphs: if it does,
// we leave the newlines at the end
var LIST_IS_MULTI_PARAGRAPH_R = /\n{2,}./;
var LIST_R = new RegExp(
    "^( *)(" + LIST_BULLET + ") " +
    "[\\s\\S]+?(?:\n{2,}(?! )" +
    "(?!\\1" + LIST_BULLET + " )\\n*" +
    // the \\s*$ here is so that we can parse the inside of nested
    // lists, where our content might end before we receive two `\n`s
    "|\\s*\n*$)"
);
var LIST_LOOKBEHIND_R = /^$|\n *$/;

var TABLES = (function() {
    // predefine regexes so we don't have to create them inside functions
    // sure, regex literals should be fast, even inside functions, but they
    // aren't in all browsers.
    var TABLE_HEADER_TRIM = /^ *| *\| *$/g;
    var TABLE_ALIGN_TRIM = /^ *|\| *$/g;

    var TABLE_CELLS_TRIM = /(?: *\| *)?\n$/;
    var NPTABLE_CELLS_TRIM = /\n$/;
    var PLAIN_TABLE_ROW_TRIM = /^ *\| *| *\| *$/g;
    var TABLE_ROW_SPLIT = / *\| */;

    var TABLE_RIGHT_ALIGN = /^ *-+: *$/;
    var TABLE_CENTER_ALIGN = /^ *:-+: *$/;
    var TABLE_LEFT_ALIGN = /^ *:-+ *$/;

    var parseTableAlignCapture = function(alignCapture) {
        if (TABLE_RIGHT_ALIGN.test(alignCapture)) {
            return "right";
        } else if (TABLE_CENTER_ALIGN.test(alignCapture)) {
            return "center";
        } else if (TABLE_LEFT_ALIGN.test(alignCapture)) {
            return "left";
        } else {
            return null;
        }
    };

    var parseTableHeader = function(capture, parse, state) {
        var headerText = capture[1]
            .replace(TABLE_HEADER_TRIM, "")
            .split(TABLE_ROW_SPLIT);
        return _.map(headerText, function(text) {
            return parse(text, state);
        });
    };

    var parseTableAlign = function(capture, parse, state) {
        var alignText = capture[2]
            .replace(TABLE_ALIGN_TRIM, "")
            .split(TABLE_ROW_SPLIT);

        return _.map(alignText, parseTableAlignCapture);
    };

    var parseTableCells = function(capture, parse, state) {
        var rowsText = capture[3]
            .replace(TABLE_CELLS_TRIM, "")
            .split("\n");

        return _.map(rowsText, function(rowText) {
            var cellText = rowText
                .replace(PLAIN_TABLE_ROW_TRIM, "")
                .split(TABLE_ROW_SPLIT);
            return _.map(cellText, function(text) {
                return parse(text, state);
            });
        });
    };

    var parseNpTableCells = function(capture, parse, state) {
        var rowsText = capture[3]
            .replace(NPTABLE_CELLS_TRIM, "")
            .split("\n");

        return _.map(rowsText, function(rowText) {
            var cellText = rowText.split(TABLE_ROW_SPLIT);
            return _.map(cellText, function(text) {
                return parse(text, state);
            });
        });
    };

    var parseTable = function(capture, parse, state) {
        state.inline = true;
        var header = parseTableHeader(capture, parse, state);
        var align = parseTableAlign(capture, parse, state);
        var cells = parseTableCells(capture, parse, state);
        state.inline = false;

        return {
            type: "table",
            header: header,
            align: align,
            cells: cells
        };
    };

    var parseNpTable = function(capture, parse, state) {
        state.inline = true;
        var header = parseTableHeader(capture, parse, state);
        var align = parseTableAlign(capture, parse, state);
        var cells = parseNpTableCells(capture, parse, state);
        state.inline = false;

        return {
            type: "table",
            header: header,
            align: align,
            cells: cells
        };
    };

    return {
        parseTable: parseTable,
        parseNpTable: parseNpTable,
        NPTABLE_REGEX: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/
    };
})();

var LINK_INSIDE = "(?:\\[[^\\]]*\\]|[^\\]]|\\](?=[^\\[]*\\]))*";
var LINK_HREF_AND_TITLE =
        "\\s*<?([^\\s]*?)>?(?:\\s+['\"]([\\s\\S]*?)['\"])?\\s*";
var AUTOLINK_MAILTO_CHECK_R = /mailto:/i;

var parseRef = function(capture, state, refNode) {
    var ref = (capture[2] || capture[1])
        .replace(/\s+/g, ' ')
        .toLowerCase();

    // We store information about previously seen defs on
    // state._defs (_ to deconflict with client-defined
    // state). If the def for this reflink/refimage has
    // already been seen, we can use its target/source
    // and title here:
    if (state._defs && state._defs[ref]) {
        _.extend(refNode, state._defs[ref]);
    }

    // In case we haven't seen our def yet (or if someone
    // overwrites that def later on), we add this node
    // to the list of ref nodes for that def. Then, when
    // we find the def, we can modify this link/image AST
    // node :).
    // I'm sorry.
    state._refs = state._refs || {};
    state._refs[ref] = state._refs[ref] || [];
    state._refs[ref].push(refNode);

    return refNode;
};

var defaultRules = {
    heading: {
        match: blockRegex(/^ *(#{1,6}) *([^\n]+?) *#* *(?:\n *)+\n/),
        parse: function(capture, parse, state) {
            return {
                level: capture[1].length,
                content: parseInline(parse, capture[2], state)
            };
        },
        output: function(node, output) {
            return React.DOM["h" + node.level](
                null,
                output(node.content)
            );
        }
    },
    nptable: {
        match: blockRegex(TABLES.NPTABLE_REGEX),
        // For perseus-markdown temporary backcompat:
        regex: TABLES.NPTABLE_REGEX,
        parse: TABLES.parseNpTable
    },
    lheading: {
        match: blockRegex(/^([^\n]+)\n *(=|-){3,} *(?:\n *)+\n/),
        parse: function(capture, parse, state) {
            return {
                type: "heading",
                level: capture[2] === '=' ? 1 : 2,
                content: parseInline(parse, capture[1], state)
            };
        }
    },
    hr: {
        match: blockRegex(/^( *[-*_]){3,} *(?:\n *)+\n/),
        parse: ignoreCapture,
        output: function() { return React.DOM.hr(null); }
    },
    codeBlock: {
        match: blockRegex(/^(?:    [^\n]+\n*)+(?:\n *)+\n/),
        parse: function(capture, parse, state) {
            var content = capture[0]
                .replace(/^    /gm, '')
                .replace(/\n+$/, '');
            return {
                lang: undefined,
                content: content
            };
        },
        output: function(node, output) {
            var className = node.lang ?
                "markdown-code-" + node.lang :
                undefined;
            return React.DOM.pre(null,
                React.DOM.code({className: className},
                    node.content
                )
            );
        }
    },
    fence: {
        match: blockRegex(/^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n *)+\n/),
        parse: function(capture, parse, state) {
            return {
                type: "codeBlock",
                lang: capture[2] || undefined,
                content: capture[3]
            };
        }
    },
    blockQuote: {
        match: blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+\n{2,}/),
        parse: function(capture, parse, state) {
            var content = capture[0].replace(/^ *> ?/gm, '');
            return {
                content: parse(content, state)
            };
        },
        output: function(node, output) {
            return React.DOM.blockquote(null, output(node.content));
        }
    },
    list: {
        match: function(source, state, prevCapture) {
            // We only want to break into a list if we are at the start of a
            // line. This is to avoid parsing "hi * there" with "* there"
            // becoming a part of a list.
            // You might wonder, "but that's inline, so of course it wouldn't
            // start a list?". You would be correct! Except that some of our
            // lists can be inline, because they might be inside another list,
            // in which case we can parse with inline scope, but need to allow
            // nested lists inside this inline scope.
            var isStartOfLine = LIST_LOOKBEHIND_R.test(prevCapture);
            var isListBlock = state._list || !state.inline;

            if (isStartOfLine && isListBlock) {
                return LIST_R.exec(source);
            } else {
                return null;
            }
        },
        parse: function(capture, parse, state) {
            var bullet = capture[2];
            var ordered = bullet.length > 1;
            var start = ordered ? +bullet : undefined;
            var items = capture[0]
                .replace(LIST_BLOCK_END_R, "\n")
                .match(LIST_ITEM_R);

            var lastItemWasAParagraph = false;
            var itemContent = _.map(items, function(item, i) {
                // We need to see how far indented this item is:
                var space = LIST_ITEM_PREFIX_R.exec(item)[0].length;
                // And then we construct a regex to "unindent" the subsequent
                // lines of the items by that amount:
                var spaceRegex = new RegExp("^ {1," + space + "}", "gm");

                // Before processing the item, we need a couple things
                var content = item
                         // remove indents on trailing lines:
                        .replace(spaceRegex, '')
                         // remove the bullet:
                        .replace(LIST_ITEM_PREFIX_R, '');

                // Handling "loose" lists, like:
                //
                //  * this is wrapped in a paragraph
                //
                //  * as is this
                //
                //  * as is this
                var isLastItem = (i === items.length - 1);
                var containsBlocks = content.indexOf("\n\n") !== -1;

                // Any element in a list is a block if it contains multiple
                // newlines. The last element in the list can also be a block
                // if the previous item in the list was a block (this is
                // because non-last items in the list can end with \n\n, but
                // the last item can't, so we just "inherit" this property
                // from our previous element).
                var thisItemIsAParagraph = containsBlocks ||
                        (isLastItem && lastItemWasAParagraph);
                lastItemWasAParagraph = thisItemIsAParagraph;

                var adjustedContent = content.replace(LIST_ITEM_END_R, "");
                if (thisItemIsAParagraph) {
                    return parse(adjustedContent + "\n\n", _.defaults({
                        inline: false,
                        _list: true
                    }, state));
                } else {
                    return parse(adjustedContent, _.defaults({
                        inline: true,
                        _list: true
                    }, state));
                }
            });

            return {
                ordered: ordered,
                start: start,
                items: itemContent
            };
        },
        output: function(node, output) {
            var ListWrapper = node.ordered ? "ol" : "ul";
            return React.DOM[ListWrapper]({
                start: node.start
            }, _.map(node.items, function(item) {
                    return React.DOM.li(null, output(item));
                })
            );
        }
    },
    def: {
        // TODO(aria): This will match without a blank line before the next
        // block element, which is inconsistent with most of the rest of
        // simple-markdown.
        match: blockRegex(
            /^ *\[([^\]]+)\]: *<?([^\s>]*)>?(?: +["(]([^\n]+)[")])? *\n(?: *\n)?/
        ),
        parse: function(capture, parse, state) {
            var def = capture[1]
                .replace(/\s+/g, ' ')
                .toLowerCase();
            var target = capture[2];
            var title = capture[3];
            var defAttrs = {
                target: target,
                title: title
            };

            // Look for previous links/images using this def
            // If any links/images using this def have already been declared,
            // they will have added themselves to the state._refs[def] list
            // (_ to deconflict with client-defined state). We look through
            // that list of reflinks for this def, and modify those AST nodes
            // with our newly found information now.
            // Sorry :(.
            if (state._refs && state._refs[def]) {
                _.each(state._refs[def], function(link) {
                    _.extend(link, defAttrs);
                });
            }

            // Add this def to our map of defs for any future links/images
            // In case we haven't found any or all of the refs referring to
            // this def yet, we add our def to the table of known defs, so
            // that future reflinks can modify themselves appropriately with
            // this information.
            state._defs = state._defs || {};
            state._defs[def] = defAttrs;

            // return the relevant parsed information
            // for debugging only.
            return _.extend({
                def: def
            }, defAttrs);
        },
        output: function() { return null; }
    },
    table: {
        match: blockRegex(/^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/),
        parse: TABLES.parseTable,
        output: function(node, output) {
            var getStyle = function(colIndex) {
                return node.align[colIndex] == null ? {} : {
                    textAlign: node.align[colIndex]
                };
            };

            var headers = _.map(node.header, function(content, i) {
                return React.DOM.th({style: getStyle(i)},
                    output(content)
                );
            });

            var rows = _.map(node.cells, function(row, r) {
                return React.DOM.tr(null,
                    _.map(row, function(content, c) {
                        return React.DOM.td({style: getStyle(c)},
                            output(content)
                        );
                    })
                );
            });

            return React.DOM.table(null,
                React.DOM.thead(null,
                    React.DOM.tr(null,
                        headers
                    )
                ),
                React.DOM.tbody(null,
                    rows
                )
            );
        }
    },
    newline: {
        match: blockRegex(/^(?:\n *)*\n/),
        parse: ignoreCapture,
        output: function(node, output) { return "\n"; }
    },
    paragraph: {
        match: blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/),
        parse: parseCaptureInline,
        output: function(node, output) {
            return React.DOM.div({className: "paragraph"}, output(node.content));
        }
    },
    escape: {
        // We don't allow escaping numbers, letters, or spaces here so that
        // backslashes used in plain text still get rendered. But allowing
        // escaping anything else provides a very flexible escape mechanism,
        // regardless of how this grammar is extended.
        match: inlineRegex(/^\\([^0-9A-Za-z\s])/),
        parse: function(capture, parse, state) {
            return {
                type: "text",
                content: capture[1]
            };
        }
    },
    autolink: {
        match: inlineRegex(/^<([^ >]+:\/[^ >]+)>/),
        parse: function(capture, parse, state) {
            return {
                type: "link",
                content: [{
                    type: "text",
                    content: capture[1]
                }],
                target: capture[1]
            };
        }
    },
    mailto: {
        match: inlineRegex(/^<([^ >]+@[^ >]+)>/),
        parse: function(capture, parse, state) {
            var address = capture[1];
            var target = capture[1];

            // Check for a `mailto:` already existing in the link:
            if (!AUTOLINK_MAILTO_CHECK_R.test(target)) {
                target = "mailto:" + target;
            }

            return {
                type: "link",
                content: [{
                    type: "text",
                    content: address
                }],
                target: target
            };
        }
    },
    url: {
        match: inlineRegex(/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/),
        parse: function(capture, parse, state) {
            return {
                type: "link",
                content: [{
                    type: "text",
                    content: capture[1]
                }],
                target: capture[1],
                title: undefined
            };
        }
    },
    link: {
        match: inlineRegex(new RegExp(
            "^\\[(" + LINK_INSIDE + ")\\]\\(" + LINK_HREF_AND_TITLE + "\\)"
        )),
        parse: function(capture, parse, state) {
            var link ={
                content: parse(capture[1], state),
                target: capture[2],
                title: capture[3]
            };
            return link;
        },
        output: function(node, output) {
            return React.DOM.a({
                href: sanitizeUrl(node.target),
                title: node.title
            }, output(node.content));
        }
    },
    image: {
        match: inlineRegex(new RegExp(
            "^!\\[(" + LINK_INSIDE + ")\\]\\(" + LINK_HREF_AND_TITLE + "\\)"
        )),
        parse: function(capture, parse, state) {
            var image = {
                alt: capture[1],
                target: capture[2],
                title: capture[3]
            };
            return image;
        },
        output: function(node, output) {
            return React.DOM.img({
                src: sanitizeUrl(node.target),
                alt: node.alt,
                title: node.title});
        }
    },
    reflink: {
        match: inlineRegex(new RegExp(
            // The first [part] of the link
            "^\\[(" + LINK_INSIDE + ")\\]" +
            // The [ref] target of the link
            "\\s*\\[([^\\]]*)\\]"
        )),
        parse: function(capture, parse, state) {
            return parseRef(capture, state, {
                type: "link",
                content: parse(capture[1], state)
            });
        }
    },
    refimage: {
        match: inlineRegex(new RegExp(
            // The first [part] of the link
            "^!\\[(" + LINK_INSIDE + ")\\]" +
            // The [ref] target of the link
            "\\s*\\[([^\\]]*)\\]"
        )),
        parse: function(capture, parse, state) {
            return parseRef(capture, state, {
                type: "image",
                alt: capture[1]
            });
        }
    },
    strong: {
        match: inlineRegex(/^\*\*([\s\S]+?)\*\*(?!\*)/),
        parse: parseCaptureInline,
        output: function(node, output) {
            return React.DOM.strong(null, output(node.content));
        }
    },
    u: {
        match: inlineRegex(/^__([\s\S]+?)__(?!_)/),
        parse: parseCaptureInline,
        output: function(node, output) {
            return React.DOM.u(null, output(node.content));
        }
    },
    em: {
        match: inlineRegex(
            new RegExp(
                // only match _s surrounding words.
                "^\\b_" +
                "((?:__|[\\s\\S])+?)_" +
                "\\b" +
                // Or match *s:
                "|" +
                // Only match *s that are followed by a non-space:
                "^\\*(?=\\S)(" +
                // Match any of:
                //  - `**`: so that bolds inside italics don't close the
                //          italics
                //  - whitespace: if it's not followed by a * (we don't
                //          want ' *' to close an italics--it might
                //          start a list)
                //  - non-whitespace, non-* characters
                "(?:\\*\\*|\\s+[^\\*\\s]|[^\\s\\*])+?" +
                // followed by a non-space, non-* then *
                "[^\\s\\*])\\*(?!\\*)"
            )
        ),
        parse: function(capture, parse, state) {
            return {
                content: parse(capture[2] || capture[1], state)
            };
        },
        output: function(node, output) {
            return React.DOM.em(null, output(node.content));
        }
    },
    del: {
        match: inlineRegex(/^~~(?=\S)([\s\S]*?\S)~~/),
        parse: parseCaptureInline,
        output: function(node, output) {
            return React.DOM.del(null, output(node.content));
        }
    },
    inlineCode: {
        match: inlineRegex(/^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/),
        parse: function(capture, parse, state) {
            return {
                content: capture[2]
            };
        },
        output: function(node, output) {
            return React.DOM.code(null, node.content);
        }
    },
    br: {
        match: anyScopeRegex(/^ {2,}\n/),
        parse: ignoreCapture,
        output: function() { return React.DOM.br(null); }
    },
    text: {
        // Here we look for anything followed by non-symbols,
        // double newlines, or double-space-newlines
        // We break on any symbol characters so that this grammar
        // is easy to extend without needing to modify this regex
        match: inlineRegex(
            /^[\s\S]+?(?=[^0-9A-Za-z\s\u00ff-\uffff]|\n\n| {2,}\n|\w+:|$)/
        ),
        parse: function(capture, parse, state) {
            return {
                content: capture[0]
            };
        },
        output: function(node, output) {
            return node.content;
        }
    }
};

var defaultPriorities = Object.keys(defaultRules);

var ruleOutput = function(rules) {
    var nestedRuleOutput = function(ast, outputFunc) {
        return rules[ast.type].output(ast, outputFunc);
    };
    return nestedRuleOutput;
};

var defaultRawParse = parserFor(defaultRules, defaultPriorities);
var defaultBlockParse = function(source) {
    return defaultRawParse(source + "\n\n", {
        inline: false
    });
};
var defaultInlineParse = function(source) {
    return defaultRawParse(source, {
        inline: true
    });
};
var defaultImplicitParse = function(source) {
    return defaultRawParse(source, {
        inline: !(BLOCK_END_R.test(source))
    });
};

var defaultOutput = outputFor(ruleOutput(defaultRules));

var SimpleMarkdown = {
    parserFor: parserFor,
    outputFor: outputFor,
    defaultRules: defaultRules,
    defaultPriorities: defaultPriorities,
    ruleOutput: ruleOutput,

    inlineRegex: inlineRegex,
    blockRegex: blockRegex,
    anyScopeRegex: anyScopeRegex,
    parseInline: parseInline,
    parseBlock: parseBlock,

    defaultRawParse: defaultRawParse,
    defaultBlockParse: defaultBlockParse,
    defaultInlineParse: defaultInlineParse,
    defaultImplicitParse: defaultImplicitParse,

    // deprecated:
    defaultParse: defaultImplicitParse,

    defaultOutput: defaultOutput,

    sanitizeUrl: sanitizeUrl
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SimpleMarkdown;
} else if (typeof global !== "undefined") {
    global.SimpleMarkdown = SimpleMarkdown;
} else {
    window.SimpleMarkdown = SimpleMarkdown;
}

})();
