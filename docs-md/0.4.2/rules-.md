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


