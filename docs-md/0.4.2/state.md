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


