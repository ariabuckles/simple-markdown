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
// idiomatically, we can remove the rule purely using Object.assign:
var rules = Object.assign({}, SimpleMarkdown.defaultRules, {
    em: null,
    strong: null,
    u: null,
});

// Alternatively, we could copy then modify the rules:
var rules = Object.assign({}, SimpleMarkdown.defaultRules);
delete rules.em;
delete rules.strong;
delete rules.u;
```

Then, we need to build our parser and outputter from our new rules
object. We can do this with `SimpleMarkdown.parserFor` and
`SimpleMarkdown.outputFor`.

```javascript
var parse = SimpleMarkdown.parserFor(rules);
var output = SimpleMarkdown.outputFor(rules, 'html');
// var output = SimpleMarkdown.outputFor(rules, 'react'); // if using react
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


