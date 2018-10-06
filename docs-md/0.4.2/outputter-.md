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


