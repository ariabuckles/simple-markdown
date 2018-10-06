## Advanced usage

If you're looking for a more custom use-case, it will help to cover some
fundamentals powering simple-markdown, so that we can extend on them. I
recommend continuing to read the next section! If you're looking for an
API reference or type reference, you can find that at the end of this
documentation!

But just as an example of what you can do with simple-markdown, here's
what an implementation of adding [`@handles`](#) / mentions
(like [`@ariabuckles`](https://github.com/ariabuckles))
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
            return '<a href="' + node.username + '">@' +
                node.username +
                '</a>';
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


