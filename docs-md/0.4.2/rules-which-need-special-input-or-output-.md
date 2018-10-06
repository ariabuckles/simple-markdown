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

