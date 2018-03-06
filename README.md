simple-markdown
===============

simple-markdown is a markdown-like parser designed for simplicity
and extensibility.

[Change log](https://github.com/Khan/simple-markdown/releases)

Philosophy
==========

Most markdown-like parsers aim for [speed][marked] or
[edge case handling][CommonMark].
simple-markdown aims for extensibility and simplicity.
It has no external dependencies, at is 5 KB after minification and gzipping,
and is a single ES5-compatable js file, which can be included via `require`
or a global variable.

[marked]: https://github.com/chjj/marked
[CommonMark]: https://github.com/jgm/CommonMark

Many websites using markdown-like languages have custom extensions,
such as `@`mentions or issue number linking. Unfortunately, it's often
hard to extend many markdown parsers for use cases like these.
simple-markdown is designed to allow simple customization and extension.

At Khan Academy, we use simple-markdown to format
over half of our math exercises, because we need
[markdown extensions][PerseusMarkdown] for math text and
interactive widgets.

[Discord][Discord] uses simple-markdown for text chat, including username/mention
linking and custom emoji rendering.

[PerseusMarkdown]: https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
[Discord]: https://discordapp.com

simple-markdown is [MIT licensed][LICENSE].

[LICENSE]: https://github.com/Khan/simple-markdown/blob/master/LICENSE

Getting started
===============

## Setup

To run these examples in node or a browserify/webpack environment,
you should run `npm install` in the simple-markdown folder or
`npm install simple-markdown` in your project's folder.
Then you can acquire the `SimpleMarkdown` variable with:

```javascript
    var SimpleMarkdown = require("simple-markdown");
```


## Basic usage

simple-markdown has some convenience functions if you don't need to
do much customization on the parsing or rendering ('outputting').

```javascript
    // For Html applications:
    SimpleMarkdown.markdownToHtml('Hi!')
    => '<div class="paragraph">Hi!</div>'

    // For React applications:
    <SimpleMarkdown.ReactMarkdown source={"Hi!"} />
    => <ReactMarkdown><div>Hi!</div></ReactMarkdown>
    // or
    SimpleMarkdown.markdownToReact('Hi!')
    => [<div class="paragraph">Hi!</div>]

```


## Advanced usage

If you're looking for a more custom use-case, it will help to cover some
fundamentals powering simple-markdown, so that we can extend on them. I
recommend continuing to read the next section! If you're looking for an
API reference or type reference, you can find that at the end of this
documentation!

But just as an example of what you can do with simple-markdown, here's
what an implementation of adding `@` handles / mentions
(like [@ariabuckles](https://github.com/ariabuckles))
looks like:

```javascript
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    mention: {
        order: SimpleMarkdown.rules.text.order - 0.5,
        match: function(source) {
            return /^@(\w+)/.exec(source);
        },
        parse: function(capture) {
            return {
                username: capture[1]
            };
        },
        react: function(node) {
            return <a href={"https://github.com/" + node.username}>
                @{node.username}
            </a>;
        },
        html: function(node, recurseOutput) {
            return '<a href="' + node.username + '">@' + node.username + '</a>';
        },
    },
};

var parse = SimpleMarkdown.parserFor(rules);
var htmlOutput = SimpleMarkdown.outputFor(rules, 'html');
var reactOutput = SimpleMarkdown.outputFor(rules, 'react');

var markdownToHtml = function(source) {
    return htmlOutput(parse(source));
};
var markdownToReact = function(source) {
    return reactOutput(parse(source));
};
```


------------------------------------------------------------------------------

*The rest of this guide covers advanced usage, and is only necessary if
you're making your own extensions. If so, bravo and read on!*

------------------------------------------------------------------------------


Concepts
========

To customize how simple-markdown works, we'll need to first cover some
concepts simple-markdown uses internally.


## Parsed Content Tree (AST) : `var parsedContentTree`

A parsed content tree is a representation of the parsed markdown as a JSON tree
structure. simple-markdown uses parsed content trees for intermediate
representation: after parsing the markdown, but before rendering/outputting
it to react/html. Let's look at an example:

```markdown
This paragraph has some *emphasized text*.
```

The parsed content tree for the above markdown is:

```javascript
var parsedContentTree = SimpleMarkdown.defaultBlockParse(
    "This paragraph has some *emphasized text*."
);
=> [
    {
        "type": "paragraph"
        "content": [
            {
                "type": "text"
                "content": "This paragraph has some ",
            },
            {
                "type": "em"
                "content": [
                    {
                        "type": "text"
                        "content": "emphasized text",
                    }
                ],
            },
            {
                "type": "text"
                "content": ".",
            }
        ],
    }
]
```

It's not important to be familiar with the details of the above tree
structure, but it is important that a parsed content tree is what
`parse` returns


## Parser : `function parse(source, state) => parsedContentTree`

A parser is a function that takes a markdown string and returns a syntax tree.
(*parsers also accept an optional `state` parameter, which can be used to pass
information through the parsing to custom parse rules.*)

simple-markdown has some pre-built parsers for you, or provides you ways
to build your own custom ones:

```javascript
// Parse the markdown `source` string as block elements
var parsedContentTree = SimpleMarkdown.defaultBlockParse(source)

// Parse the markdown `source` as a single line, with no wrapping <div>
var parsedContentTree = SimpleMarkdown.defaultInlineParse(source)
```


## Outputter : `function output(parsedContentTree, state) => JSX / HTML`

An outputter / output function is a function that takes a syntax tree and
returns react nodes or html (or a custom output format)

Again, simple-markdown has some pre-built outputters:

```javascript
// Turn a syntax tree into react nodes for rendering with react
var jsx = SimpleMarkdown.defaultReactOutput(parsedContentTree)

// Turn a syntax tree into an html string for rendering directly via html
var html = SimpleMarkdown.defaultHtmlOutput(parsedContentTree)
```


## Rules : `var rules = {...}`

Rules are a set of syntax rules supported by a markdown parser/outputter,
such as `paragraphs`, `# headings`, `**bold (strong) text**`, `[links][1]`, etc.

Rules specify what syntax is parsed, and how it is parsed.

simple-markdown comes with a set of rules implementing Github-Flavoured
Markdown, which is recommended as a starting base for any rules object you
define:

```javascript
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    // ... (rule customizations go here)
});
```

As in the above example, [Object.assign][Object_assign] or
[_.extend][underscore_extend] is recommended for creating custom rules.
You should not need to mutate `SimpleMarkdown.defaultRules`.

[Object_assign]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
[underscore_extend]: http://underscorejs.org/#extend


## State: `var state = {...}`

`state` is an optional parameter to parsers and outputters which is passed
to each parse/output rule. It is a plain javascript object which may be
modified by the rules as parsing or outputting is running. This allows
giving extra runtime information to rules, as well as extracting information
gained during parsing/outputting.

simple-markdown uses state to pass around some internal information, and you
can add custom information to it for powerful extensions, which is covered
under the *Advanced Extensions* section later.

The following public fields on `state` can be used to interact with
simple-markdown:

```
state.inline  // true if inside a context where block rules are not permitted

state.disableAutoBlockNewlines  // setting this to true turns off the automatic
                                // addition of '\n\n' for block parsing

state.key  // the suggested react key for the current node
           // use this for the react key when implementing a custom rule
```

simple-markdown reserves all fields beginning with `_` on `state` for future
internal use. Currently, the following are used:

```
state._defs  // used for link/image url definitions ([1]: http://example.com)
state._refs  // used for references to url definitions ([link][1])
state._list  // used for parsing tight lists
```


Extensions
==========

## Extension fundamentals

Extensions add or remove functionality from default simple-markdown by
customizing what rules the parser and outputter use. Very much of the
parser and outputter's functionality can be controlled via custom
rules. Rules specify what syntax is parsed, how it is parsed, and how
it is output (to react/jsx, html, or another format).

To customize rules, we want to create a new `rules` object, generally
including some or all of the default simple-markdown rules, and potentially
some of our own. I recommend using [Object.assign][Object_assign] or
[_.extend][underscore_extend] to create this rules object based on
simple-markdown's default rules (`SimpleMarkdown.defaultRules`):

```javascript
// Note how we copy the rules to a new empty object, since
// Object.assign mutates the first paramter:
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    // any new rules would go here
});
```

As a simple example, it is easy to remove support for a specific syntax rule
from simple-markdown. For example, you might decide that your website should
just show `*`s and `_`s instead of trying to transform them into bold and
italics (okay, I admit this is unlikely, but some of us do enjoy plain text!).
To do this, we can simply make a copy of the rules object and remove the `em`
(emphasis/italics) rule, `strong` (bold) rule, and `u` (underline) rule:

```javascript
// first make a copy of the rules:
var rules = Object.assign({}, SimpleMarkdown.defaultRules);
// then remove the hr rule:
delete rules.em;
delete rules.strong;
delete rules.u;

// Perhaps more canonically, we can remove the rule purely using
// Object.assign:
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    em: null,
    strong: null,
    u: null,
});
```

Then, we need to build our parser and outputter from our new rules
object. We can do this with `SimpleMarkdown.parserFor` and
`SimpleMarkdown.outputFor`.

```javascript
var parse = SimpleMarkdown.parserFor(rules);
var output = SimpleMarkdown.outputFor(rules, 'html');
// alternatively, if using react:
// var output = SimpleMarkdown.outputFor(rules, 'react');
```

Now, to do some parsing and outputting without hr support, we can
use our new `parse` and `output` functions:

```javascript
var parsedContentTree = parse('look, no more *italics*!');
=> [ { type: 'paragraph', content: [ [Object], [Object], [Object], [Object], [Object] ] } ]
var html = output(parsedContentTree);
=> '<div class="paragraph">look, no more *italics*!</div>'

// Or, we might want to group those operations together in a single function:
var markdownToHtml = function(source, state) {
    var parsedContentTree = parse(source, state);
    var html = output(parsedContentTree, state);
    return html;
};
```


## Adding rules with extensions

On the other hand, if we want to add support for a new syntax to our
markdown parser, we'll need to write our own rule.

A rule is an object consisting of [at least] the following fields:

 * **`order`**`: <number>` :
   a number specifying the order/precedence of a rule relative to
   other rules. Rules with lower order numbers will be processed
   first. If you have two rules that both match markdown text
   starting with the same character, it can matter which one is
   processed first.
   `order` should be unique among the rules, and to facilitate that,
   `SimpleMarkdown.defaultRules` are all integers starting at 0,
   so that extensions can base their rule order off of orders of
   pre-existing rules, i.e.
   `order: SimpleMarkdown.rules.text.order - 0.5`
   will place a rule immediately before `text`, which is always the
   last simple-markdown rule, as it matches anything unmatched by
   earlier rules.

 * **`match`**`: function(source) => capture` :
   a function which takes the markdown source beginning from the current parse
   position, and returns a capture: an array-like object with the element at
   index 0 set to the full text from the source which matches the rule. The
   common way to do this is to return the result of a call to `.exec` on a
   regex (which must begin with `^`):
   `return /^\@(\w+)/.exec(source);`.
   Other fields on this object, such as indexes 1+ for parenthetical regex
   captures, may be used to provide more detailed information about this match
   to the other functions for this rule.

 * **`parse`**`: function(capture) => node` :
   a function which takes the result of
   `match` (an array-like capture probably the result of calling `.exec` on
   a regex), and returns a parseTreeContent node: an object containing
   information about this block of syntax. For example, here is a node for
   the link: `[link text](http://example.com)`
   
   ```
   {
       "type": "link",
       "content": [
           {
               "type": "text"
               "content": "link text",
           }
       ],
       "target": "http://example.com"
   }
   ```

   Note two semi-special fields on this object:
   First, `type` specifies the name
   of the rule that matched it. Idiomatically this field is omitted and
   simple-markdown will populate it for you, and use it to determine
   which `parse` function a given node should be processed by.
   Second, `content` is typically a parse tree of the text content of
   the node, if such content exists.

 * **`react`**`: function(node) => jsx` :
   a function which takes the result of the `parse` field (above) for this
   rule and returns react elements (jsx) as the final output of this
   bit of markdown to render.
   This field is only necessary if you are using simple-markdown to output
   to react. If you are using html or a different format altogether, it
   isn't required.

 * **`html`**`: function(node) => htmlString` :
   a function which takes the result of the `parse` field (above) for this
   rule and returns an html string as the final output of this bit of
   markdown to turn into html.
   This field is only necessary if you are using simple-markdown to output
   to html.

The above covers the fundamental properties of a rule. More detailed information
on the above fields, their optional parameters, and the optional field
`quality`, can be found in the advanced extensions portion of this documentation
and in the API reference at the end of this documentation.


Let's add support for `@` handles / user mentions. We'll write our own
rule for this, and call it `mention` (though the name is arbitrary, it
just needs to not conflict with any other rule name)

```javascript
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    mention: {
        order: SimpleMarkdown.rules.text.order - 0.5,

        match: function(source) {
            // This regex matches @handles at the current source position (^)
            return /^@(\w+)/.exec(source);
        },

        parse: function(capture) {
            // capture is the result from `/^@(\w+)/.exec(source)` in `match`
            // capture[1] is the (\w+) name group.
            // We just return an object representing what this node is
            return {
                type: 'mention',  // optional; inferred if omitted
                username: capture[1]
            };
        },

        react: function(node) {
            // node is the object returned by `parse`

            // Let's just make the link now!
            return <a href={"https://github.com/" + node.username>
                @{node.username}
            </a>;
        },

        html: function(node, recurseOutput) {
            // node is the object returned by `parse`

            // This time in html~
            return '<a href="' + node.username + '">@' + node.username + '</a>';
        },
    },
});
```

Once we have our new rules object, we can create the full parser and outputter
with `SimpleMarkdown.parserFor` and `SimpleMarkdown.outputFor`:


## Rules which contain other markdown : using `recursiveParse / recursiveOutput`

Some rules you might want to add will contain other markdown content
themselves. For example, the bold and italics (technically, strong and em)
rules are used for formatting text, and that text might have other markdown
constructions, like a link: `*italic text with a [link](http://example.com)*`.

In order to support rules like this, our `parse` and `output` rule fields
will need to parse and output the nested markdown, in addition to any
formatting.

Let's say we wanted to implement Reddit's `^`, which raises text into a
superscript. It supports two forms:

`^word` : raises a word into a superscript

`^(multiple words)` : raises multiple words into a superscript

Both of these formats support nested markdown. For example, you can
nest superscripts using `^higher^higher^and^higher`, or you can
add italics inside a multiple word superscript: `^(some *italic* text)`.

To implement this nesting, we'll use the recursive parameters
`recursiveParse` and `recursiveOutput`. These are the second parameters
passed to each `parse` and output (`react` / `html`) rules, and tell
simple-markdown to recursively parse or output some content as markdown.

Let's take a look at what it looks like in action:

```javascript
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    superscript: {
        order: SimpleMarkdown.defaultRules.text.order - 0.5,

        match: function(source) {
            if (!state.inline) {
                return null;
            }
            // This regex matches @handles at the current source position (^)
            // match a `^` followed by either non-whitespace, non-()s, or
            // a ( followed by non `)`s followed by a `)`
            return /^\^(?:([^\s\(\)]+)|\(([^\)]+)\))/.exec(source);
        },

        parse: function(capture, recursiveParse) {
            return {
                // simple-markdown automatically sets type to 'superscript',
                // as that's the name of this rule

                // we want to parse the parenthesized group of the capture
                // as markdown as well, so we pass it to `recursiveParse`
                content: recursiveParse(capture[1] || capture[2]),
            };
        },

        react: function(node, recursiveOutput) {
            // node is the object returned by `parse`

            // output a superscript tag around the markdown output for
            // the node's parsed content
            return <sup>
                {recurseOutput(node.content)}
            </sup>;
        },

        html: function(node, recurseOutput) {
            // This time in html~
            return '<sup>' + recurseOutput(node.content) + '</sup>';
        },
    },
});
```

## Rules which need special input or output : using `state`

Some rules require more context than is available strictly from the
markdown source. For example, if we wanted to build a footnote
syntax for citations/references, we might want to automatically number
the footnotes so that they don't require manually changing if we
add a new footnote.

For example, let's examine the following potential syntax:

```
This is some text ^[This is a footnote]
```

which we'd like to render as:

> This is some text¹
> 
> ¹ This is a footnote

What number footnote we are on isn't something we can extract from
the syntax of `^[]`. It's based on the number of previous footnotes
we've seen while parsing. To determine that, we're going to have to
use a third parameter to `parse` : `state`.

In addition to `capture` and `recurseParse`, simple-markdown will
pass the parameter `state` to each rule's `parse` field. `state` is
a plain, mutable javascript object which rules may modify, as explained
in [the concepts section above][state_section].


[state_section]: #state


# TODO:

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


Adding a simple extension
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


Basic parsing/output API
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


Extension Overview
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

Extension API
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


Extension rules helper functions
================================

*Coming soon*


Quirks
======

Because of its design goals of simplicity and extensibility, simple-markdown
has a few quirks you may run into:

### Empty lines required between blocks

Many markdown parsers allow blocks to be placed on adjacent lines, as long
as they are different types of block. For example:

`````markdown
Paragraph
```
code
```
`````

renders as `<p>Paragraph</p><pre><code>code</code></pre>`.

Because simple-markdown supports custom block syntaxes, each block element
needs to know for itself when it ends. So paragraphs end when they see an
empty line, as \`\`\` is not special syntax to them. To get the above to
render as expected in simple-markdown, you just need to have a blank line
between the paragraph and code:

`````markdown
Paragraph

```
code
```
`````

I know this is often inconvenient. It's possible to make exceptions to this
rule via customization. For example, to make `### headings` support a new
block on the next line, as in issue #30, you can customize the heading rule:

```javascript
var SimpleMarkdown = require("simple-markdown");

var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    heading: Object.assign({}, SimpleMarkdown.defaultRules.heading, {
        match: SimpleMarkdown.blockRegex(
            // The following regex matches:
            // spaces,
            // followed by 1 to 6 `#`s,
            // followed by spaces,
            // followed by non-newline characters,
            // followed by optional closing `#`s,
            // followed by optional empty lines (in defaultRules this is non-optional),
            // followed by a final newline denoting the end of the rule

            /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n *)*\n/
        ),
    }),
});

var parser = SimpleMarkdown.parserFor(rules);
var reactOutput = SimpleMarkdown.outputFor(rules, 'react');

var markdownToReact = function(source) {
    return outputReact(parse(source));
};

var markdownToHtml = function(source) {
    return outputHtml(parser(source));
};
```

[nobr]: https://github.com/Benjamin-Dobell/react-native-markdown-view/pull/6


### Outputs div html nodes instead of p html nodes

By default, simple-markdown outputs `<div class="paragraph">` nodes instead
of `p` nodes, because
[`p` nodes cannot contain block level elements][no_div_in_p],
which can lead to difficult bugs and react crashes when simple-markdown
is customized.

Like almost everything else in simple-markdown, this can be changed via
an extension. To make simple-markdown output `p` tags, you can use:

```javascript
var SimpleMarkdown = require("simple-markdown");

var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    paragraph: Object.assign({}, SimpleMarkdown.defaultRules.paragraph, {
        react: (node, output, state) => {
            return <p key={state.key}>{output(node.content, state)}</p>;
        }
    }),
};

var parse = SimpleMarkdown.parserFor(rules);
var outputReact = SimpleMarkdown.outputFor(rules, 'react');
var outputHtml = SimpleMarkdown.outputFor(rules, 'html');

var markdownToReact = function(source) {
    return outputReact(parse(source));
};

var markdownToHtml = function(source) {
    return outputHtml(parser(source));
};
```

[no_div_in_p]: https://stackoverflow.com/questions/8397852/why-p-tag-cant-contain-div-tag-inside-it


LICENSE
=======

MIT. See the LICENSE file for text.



Misc.
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
