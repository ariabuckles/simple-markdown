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


