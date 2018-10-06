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


