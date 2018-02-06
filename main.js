/* @flow */

import defaultRules from './lib/rules';

var CR_NEWLINE_R = /\r\n?/g;
var TAB_R = /\t/g;
var FORMFEED_R = /\f/g
// Turn various crazy whitespace into easy to process things
var preprocess = function(source) {
    return source.replace(CR_NEWLINE_R, '\n')
            .replace(FORMFEED_R, '')
            .replace(TAB_R, '    ');
};

/**
 * Creates a parser for a given set of rules, with the precedence
 * specified as a list of rules.
 *
 * @rules: an object containing
 * rule type -> {match, order, parse} objects
 * (lower order is higher precedence)
 * (Note: `order` is added to defaultRules after creation so that
 *  the `order` of defaultRules in the source matches the `order`
 *  of defaultRules in terms of `order` fields.)
 *
 * @returns The resulting parse function, with the following parameters:
 *   @source: the input source string to be parsed
 *   @state: an optional object to be threaded through parse
 *     calls. Allows clients to add stateful operations to
 *     parsing, such as keeping track of how many levels deep
 *     some nesting is. For an example use-case, see passage-ref
 *     parsing in src/widgets/passage/passage-markdown.jsx
 */
var parserFor = function(rules) {
    // Sorts rules in order of increasing order, then
    // ascending rule name in case of ties.
    var ruleList = Object.keys(rules);
    ruleList.forEach(function(type) {
        var order = rules[type].order;
        if ((typeof order !== 'number' || !isFinite(order)) &&
                typeof console !== 'undefined') {
            console.warn(
                "simple-markdown: Invalid order for rule `" + type + "`: " +
                order
            );
        }
    });

    ruleList.sort(function(typeA, typeB) {
        var ruleA = rules[typeA];
        var ruleB = rules[typeB];
        var orderA = ruleA.order;
        var orderB = ruleB.order;

        // First sort based on increasing order
        if (orderA !== orderB) {
            return orderA - orderB;

        }

        var secondaryOrderA = ruleA.quality ? 0 : 1;
        var secondaryOrderB = ruleB.quality ? 0 : 1;

        if (secondaryOrderA !== secondaryOrderB) {
            return secondaryOrderA - secondaryOrderB;

        // Then based on increasing unicode lexicographic ordering
        } else if (typeA < typeB) {
            return -1;
        } else if (typeA > typeB) {
            return 1;

        } else {
            // Rules should never have the same name,
            // but this is provided for completeness.
            return 0;
        }
    });

    var nestedParse = function(source, state) {
        var result = [];
        state = state || {};
        // We store the previous capture so that match functions can
        // use some limited amount of lookbehind. Lists use this to
        // ensure they don't match arbitrary '- ' or '* ' in inline
        // text (see the list rule for more information).
        var prevCapture = "";
        while (source) {
            // store the best match, it's rule, and quality:
            var ruleType = null;
            var rule = null;
            var capture = null;
            var quality = NaN;

            // loop control variables:
            var i = 0;
            var currRuleType = ruleList[0];
            var currRule = rules[currRuleType];

            do {
                var currOrder = currRule.order;
                var currCapture = currRule.match(source, state, prevCapture);

                if (currCapture) {
                    var currQuality = currRule.quality ? currRule.quality(
                        currCapture,
                        state,
                        prevCapture
                    ) : 0;
                    // This should always be true the first time because
                    // the initial quality is NaN (that's why there's the
                    // condition negation).
                    if (!(currQuality <= quality)) {
                        ruleType = currRuleType;
                        rule = currRule;
                        capture = currCapture;
                        quality = currQuality;
                    }
                }

                // Move on to the next item.
                // Note that this makes `currRule` be the next item
                i++;
                currRuleType = ruleList[i];
                currRule = rules[currRuleType];

            } while (
                // keep looping while we're still within the ruleList
                currRule && (
                    // if we don't have a match yet, continue
                    !capture || (
                        // or if we have a match, but the next rule is
                        // at the same order, and has a quality measurement
                        // functions, then this rule must have a quality
                        // measurement function (since they are sorted before
                        // those without), and we need to check if there is
                        // a better quality match
                        currRule.order === currOrder &&
                        currRule.quality
                    )
                )
            );

            // TODO(aria): Write tests for this
            if (!capture) {
                throw new Error(
                    "could not find rule to match content: " + source
                );
            }

            var parsed = rule.parse(capture, nestedParse, state);
            // We maintain the same object here so that rules can
            // store references to the objects they return and
            // modify them later. (oops sorry! but this adds a lot
            // of power--see reflinks.)
            if (Array.isArray(parsed)) {
                Array.prototype.push.apply(result, parsed);
            }
            else {
                // We also let rules override the default type of
                // their parsed node if they would like to, so that
                // there can be a single output function for all links,
                // even if there are several rules to parse them.
                if (parsed.type == null) {
                    parsed.type = ruleType;
                }
                result.push(parsed);
            }

            prevCapture = capture[0];
            source = source.substring(prevCapture.length);
        }
        return result;
    };

    var outerParse = function(source, state) {
        return nestedParse(preprocess(source), state);
    };
    return outerParse;
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

var reactFor = function(outputFunc) {
    var nestedOutput = function(ast, state) {
        state = state || {};
        if (Array.isArray(ast)) {
            var oldKey = state.key;
            var result = [];

            // map nestedOutput over the ast, except group any text
            // nodes together into a single string output.
            var lastWasString = false;
            for (var i = 0; i < ast.length; i++) {
                state.key = '' + i;
                var nodeOut = nestedOutput(ast[i], state);
                var isString = (typeof nodeOut === "string");
                if (isString && lastWasString) {
                    result[result.length - 1] += nodeOut;
                } else {
                    result.push(nodeOut);
                }
                lastWasString = isString;
            }

            state.key = oldKey;
            return result;
        } else {
            return outputFunc(ast, nestedOutput, state);
        }
    };
    return nestedOutput;
};

var htmlFor = function(outputFunc) {
    var nestedOutput = function(ast, state) {
        state = state || {};
        if (Array.isArray(ast)) {
            return ast.map(function(node) {
                return nestedOutput(node, state);
            }).join("");
        } else {
            return outputFunc(ast, nestedOutput, state);
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

var UNESCAPE_URL_R = /\\([^0-9A-Za-z\s])/g;

var unescapeUrl = function(rawUrlString) {
    return rawUrlString.replace(UNESCAPE_URL_R, "$1");
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

var BLOCK_END_R = /\n{2,}$/;

Object.keys(defaultRules).forEach(function(type, i) {
    defaultRules[type].order = i;
});

var ruleOutput = function(rules, property) {
    if (!property && typeof console !== "undefined") {
        console.warn("simple-markdown ruleOutput should take 'react' or " +
            "'html' as the second argument."
        );
    }

    // deprecated:
    property = property || "react";

    var nestedRuleOutput = function(ast, outputFunc, state) {
        return rules[ast.type][property](ast, outputFunc, state);
    };
    return nestedRuleOutput;
};

var defaultRawParse = parserFor(defaultRules);
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

var defaultReactOutput = reactFor(ruleOutput(defaultRules, "react"));
var defaultHtmlOutput = htmlFor(ruleOutput(defaultRules, "html"));

var SimpleMarkdown = {
    defaultRules: defaultRules,
    parserFor: parserFor,
    ruleOutput: ruleOutput,
    reactFor: reactFor,
    htmlFor: htmlFor,

    inlineRegex: inlineRegex,
    blockRegex: blockRegex,
    anyScopeRegex: anyScopeRegex,
    parseInline: parseInline,
    parseBlock: parseBlock,

    defaultRawParse: defaultRawParse,
    defaultBlockParse: defaultBlockParse,
    defaultInlineParse: defaultInlineParse,
    defaultImplicitParse: defaultImplicitParse,

    defaultReactOutput: defaultReactOutput,
    defaultHtmlOutput: defaultHtmlOutput,

    preprocess: preprocess,
    sanitizeUrl: sanitizeUrl,
    unescapeUrl: unescapeUrl,

    // deprecated:
    defaultParse: defaultImplicitParse,
    outputFor: reactFor,
    defaultOutput: defaultReactOutput,
};

module.exports = SimpleMarkdown;
