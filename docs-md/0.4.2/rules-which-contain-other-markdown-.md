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


Let's add support for [`@handles`](#) / user mentions. We'll write our own rule
for this, and call it `mention` (the name is arbitrary, it just needs to not
  conflict with any other rule name)

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
            return '<a href="' + node.username + '">@' +
                node.username +
                '</a>';
        },
    },
});
```

Once we have our new rules object, we can create the full parser and outputter
with `SimpleMarkdown.parserFor` and `SimpleMarkdown.outputFor`:

```javascript
    var parse = SimpleMarkdown.parserFor(rules);
    var output = SimpleMarkdown.outputFor(rules, 'html');
    // alternatively, if using react:
    // var output = SimpleMarkdown.outputFor(rules, 'react');

    var markdownToHtml = function(source, state) {
        var parsedContentTree = parse(source, state);
        return output(parsedContentTree, state);
    };
```

Now, to do some parsing and outputting without em/strong/u support, we can
use our new `parse` and `output` functions:

```javascript
var parsedContentTree = parse('look, no more *italics*!');
=> [{ type: 'paragraph', content: [...] }]
var html = output(parsedContentTree);
=> '<div class="paragraph">look, no more *italics*!</div>'

// Or, we might want to group those operations together in a single function:
var markdownToHtml = function(source, state) {
    var parsedContentTree = parse(source, state);
    var html = output(parsedContentTree, state);
    return html;
};
```



