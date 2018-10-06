# ~~TODO:~~

Then let's get a basic markdown parser and outputter.
`SimpleMarkdown` provides default parsers/outputters for
generic markdown:

```javascript
    var mdParse = SimpleMarkdown.defaultBlockParse;
    var mdOutput = SimpleMarkdown.defaultOutput;
```

`mdParse` can give us a syntax tree:

```javascript
    var syntaxTree = mdParse("Here is a paragraph and an *em tag*.");
```

Let's inspect our syntax tree:

```javascript
    // pretty-print this with 4-space indentation:
    console.log(JSON.stringify(syntaxTree, null, 4));
    => [
        {
            "content": [
                {
                    "content": "Here is a paragraph and an ",
                    "type": "text"
                },
                {
                    "content": [
                        {
                            "content": "em tag",
                            "type": "text"
                        }
                    ],
                    "type": "em"
                },
                {
                    "content": ".",
                    "type": "text"
                }
            ],
            "type": "paragraph"
        }
    ]
```

Then to turn that into an array of React elements, we can
call `mdOutput`:

```javascript
    mdOutput(syntaxTree)
    => [ { type: 'div',
        key: null,
        ref: null,
        _owner: null,
        _context: {},
        _store: { validated: false, props: [Object] } } ]
```


~~Adding a simple extension~~
=========================

Let's add an underline extension! To do this, we'll need to create
a new rule and then make a new parser/outputter. The next section
will explain how all of these steps work in greater detail. (To
follow along with these examples, you'll also need
[underscore][underscore].)

[underscore]: http://underscorejs.org/

First, we create a new rule. We'll look for double underscores
surrounding text.

We'll put underlines right
before `em`s, so that `__` will be parsed before `_`
for emphasis/italics.

A regex to capture this would look something
like `/^__([\s\S]+?)__(?!_)/`. This matches `__`, followed by
any content until it finds another `__` not followed by a
third `_`.

```javascript
    var underlineRule = {
        // Specify the order in which this rule is to be run
        order: SimpleMarkdown.defaultRules.em.order - 0.5,
        
        // First we check whether a string matches
        match: function(source) {
            return /^__([\s\S]+?)__(?!_)/.exec(source);
        },
        
        // Then parse this string into a syntax node
        parse: function(capture, parse, state) {
            return {
                content: parse(capture[1], state)
            };
        },
        
        // Finally transform this syntax node into a
        // React element
        react: function(node, output) {
            return React.DOM.u(null, output(node.content));
        },

        // Or an html element:
        // (Note: you may only need to make one of `react:` or
        // `html:`, as long as you never ask for an outputter
        // for the other type.)
        html: function(node, output) {
            return '<u>' + output(node.content) + '</u>';
        },
    };
```

Then, we need to add this rule to the other rules:

```javascript
    var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
        underline: underlineRule
    });
```

Finally, we need to build our parser and outputters:

```javascript
    var rawBuiltParser = SimpleMarkdown.parserFor(rules);
    var parse = function(source) {
        var blockSource = source + "\n\n";
        return rawBuiltParser(blockSource, {inline: false});
    };
    // You probably only need one of these: choose depending on
    // whether you want react nodes or an html string:
    var reactOutput = SimpleMarkdown.outputFor(rules, 'react');
    var htmlOutput = SimpleMarkdown.outputFor(rules, 'html');
```

Now we can use our custom `parse` and `output` functions to parse
markdown with underlines!

```javascript
    var syntaxTree = parse("__hello underlines__");
    console.log(JSON.stringify(syntaxTree, null, 4));
    => [
        {
            "content": [
                {
                    "content": [
                        {
                            "content": "hello underlines",
                            "type": "text"
                        }
                    ],
                    "type": "underline"
                }
            ],
            "type": "paragraph"
        }
    ]
    
    reactOutput(syntaxTree)
    => [ { type: 'div',
        key: null,
        ref: null,
        _owner: null,
        _context: {},
        _store: { validated: false, props: [Object] } } ]

    htmlOutput(syntaxTree)

    => '<div class="paragraph"><u>hello underlines</u></div>'
```


~~Basic parsing/output API~~
========================

#### `SimpleMarkdown.defaultBlockParse(source)`

Returns a syntax tree of the result of parsing `source` with the
default markdown rules. Assumes a block scope.

#### `SimpleMarkdown.defaultInlineParse(source)`

Returns a syntax tree of the result of parsing `source` with the
default markdown rules, where `source` is assumed to be inline text.
Does not emit `<p>` elements. Useful for allowing inline markdown
formatting in one-line fields where paragraphs, lists, etc. are
disallowed.

#### `SimpleMarkdown.defaultImplicitParse(source)`

Parses `source` as block if it ends with `\n\n`, or inline if not.

#### `SimpleMarkdown.defaultReactOutput(syntaxTree)`

Returns React-renderable output for `syntaxTree`.

#### `SimpleMarkdown.defaultHtmlOutput(syntaxTree)`

Returns the html string output for `syntaxTree`


~~Extension Overview~~
==================

Elements in simple-markdown are generally created from rules.
For parsing, rules must specify `match` and `parse` methods.
For output, rules must specify a `react` or `html` method
(or both), depending on which outputter you create afterwards.

Let's build an example rule to recognize `@` handles, like @ariabuckles

```javascript
    atHandle: {
        match: function(source) {
            // `match` returns the result of a regex exec
            // such a regex should always begin with `^`, as it will
            // always be called to check whether the beginning of the
            // input matches the rule
            // This regex matches @handles at the current source position (^)
            return /^\@([a-zA-Z_]+)/.exec(source);
        },
        parse: function(capture) {
            // `parse` returns the AST node for this rule, given
            // `capture`, the result of a successful `match` call

            // capture[1] is the ([a-zA-Z_]+) name group from the `match` regex
            return {
                type: 'atHandle',
                username: capture[1]
            };
        },
        react: function(node) {
            // given an AST node from `parse`, how should we render it in react?
            // (Note: you don't need this if you are only rendering to html)

            return <a href={"https://github.com/" + node.username>
                @{node.username}
            </a>;
        },
        html: function(node, recurseOutput) {
            // or, how should we render this node in html
            // (Note: you don't need this if you are rendering to react)

            return '<a href="' + node.username + '">@' + node.username + '</a>';
        },
    },
```

By using the above rule, we can transform `@ariabuckles` into @ariabuckles

Let's look at those three methods in more detail.

#### `match(source, state, lookbehind)`

simple-markdown calls your `match` function to determine whether the
upcoming markdown source matches this rule or not.

`source` is the upcoming source, beginning at the current position of
parsing (source[0] is the next character).

`state` is a mutable state object to allow for more complicated matching
and parsing. The most common field on `state` is `inline`, which all of
the default rules set to true when we are in an inline scope, and false
or undefined when we are in a block scope.

`lookbehind` is the string previously captured at this parsing level, to
allow for lookbehind. For example, lists check that lookbehind ends with
`/^$|\n *$/` to ensure that lists only match at the beginning of a new
line.

If this rule matches, `match` should return an object, array, or
array-like object, which we'll call `capture`, where `capture[0]`
is the full matched source, and any other fields can be used in the
rule's `parse` function. The return value from `Regexp.prototype.exec`
fits this requirement, and the common use case is to return the result
of `someRegex.exec(source)`.

If this rule does not match, `match` should return null.

NOTE: If you are using regexes in your match function, your regex
should always begin with `^`. Regexes without leading `^`s can
cause unexpected output or infinite loops.

#### `parse(capture, recurseParse, state)`

`parse` takes the output of `match` and transforms it into a syntax
tree node object, which we'll call `node` here.

`capture` is the non-null result returned from match.

`recurseParse` is a function that can be called on sub-content and
state to recursively parse the sub-content. This returns an array.

`state` is the mutable state threading object, which can be examined
or modified, and should be passed as the third argument to any
`recurseParse` calls.

For example, to parse inline sub-content, you can add `inline: true`
to state, or `inline: false` to force block parsing (to leave the
parsing scope alone, you can just pass `state` with no modifications).
For example:

```javascript
    var innerText = capture[1];
    recurseParse(innerText, _.defaults({
        inline: true
    }, state));
```
    
`parse` should return a `node` object, which can have custom fields
that will be passed to `output`, below. The one reserved field is
`type`, which designates the type of the node, which will be used
for output. If no type is specified, simple-markdown will use the
current rule's type (the common case). If you have multiple ways
to parse a single element, it can be useful to have multiple rules
that all return nodes of the same type.

#### `react(node, recurseOutput, state)`

`react` takes a syntax tree `node` and transforms it into
React-renderable output.

`node` is the return value from `parse`, which has a type
field of the same type as the current rule, as well as any
custom fields created by `parse`.

`recurseOutput` is a function to recursively output sub-tree
nodes created by using `recurseParse` in `parse`.

`state` is the mutable state threading object, which can be
examined or modified, and should be passed as the second
argument to any recurseOutput calls.

The simple-markdown API contains several helper methods for
creating rules, as well as methods for creating parsers and
outputters from rules.

~~Extension API~~
=============

simple-markdown includes access to the default list of rules,
as well as several functions to allow you to create parsers and
outputters from modifications of those default rules, or even
from a totally custom rule list.

These functions are separated so that you can customize
intermediate steps in the parsing/output process, if necessary.

#### `SimpleMarkdown.defaultRules`

The default rules, specified as an object, where the keys are
the rule types, and the values are objects containing `order`,
`match`, `parse`, `react`, and `html` fields (these rules can
be used for both parsing and outputting).

#### `SimpleMarkdown.parserFor(rules)`

Takes a `rules` object and returns a parser for the rule types
in the rules object, in order of increasing `order` fields,
which must be present and a finite number for each rule.
In the case of order field ties, rules are ordered
lexicographically by rule name. Each of the rules in the `rules`
object must contain a `match` and a `parse` function.

#### `SimpleMarkdown.outputFor(rules, key)`

Takes a `rules` object, containing a set of rules, each with an
output function at the `key` index (either `'react'` or `'html'`,
unless you are custom output type), and returns an output
function that takes a tree returned by the parser.

#### Putting it all together

Given a set of rules, one can create a single function
that takes an input content string and outputs a
React-renderable as follows. Note that since many rules
expect blocks to end in `"\n\n"`, we append that to source
input manually, in addition to specifying `inline: false`
(`inline: false` is technically optional for all of the
default rules, which assume `inline` is false if it is
undefined).


~~Extension rules helper functions~~
================================

*Coming soon*


~~Misc.~~
=====

I haven't figured out where to put the following examples in the readme:

### Colored Links

For example, if you wanted to make each link a different colour, you could
do so using `state`. We haven't covered all the concepts in this example yet,
but it helps demonstrate some of how `state` can provide more power to your
parser/outputter:

```javascript
// Define an array of colours we want to use
var colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

// Define our parser/outputter's rules, basing them off
// of SimpleMarkdown.defaultRules:
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {

    // Create a modified link rule...
    link: Object.assign({}, SimpleMarkdown.defaultRules.link, {

        // ...with a custom output function:
        react: (node, output, state) => {

            // Store the number of links we've encountered so
            // far on the `state` object.
            if (state.linkCount === undefined) {
                // If this is our first link, we can start at 0
                state.linkCount = 0;
            } else {
                // otherwise, we can increment our link counter
                state.linkCount = state.linkCount + 1;
            }
            
            // Calculate what colour we want this specific link to be
            var color = colors[state.linkCount % colors.length];

            // Sanitize the url for this node.
            // (not relevant to this example, but important to do
            // for links, so it's included here!
            var href = SimpleMarkdown.sanitizeUrl(node.url);

            // Then return the react/jsx node for this link.
            // Note we're using the color variable from earlier for style.
            return <a href={href} style={{color: color}}>
                {output(node.content)}
            </a>;
        },
    },
});
```
