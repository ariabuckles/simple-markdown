simple-markdown
===============

[![license](https://img.shields.io/github/license/khan/simple-markdown.svg)][LICENSE]
[![version](https://img.shields.io/npm/v/simple-markdown.svg)][npm]
[![downloads](https://img.shields.io/npm/dm/simple-markdown.svg)][npm]

simple-markdown is a markdown-like parser designed for simplicity
and extensibility.

[npm]: https://www.npmjs.com/package/simple-markdown
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
such as [`@mentions`](#) or issue number linking. Unfortunately, it's often
hard to extend many markdown parsers for use cases like these.
simple-markdown is designed to allow simple customization and extension.

At [Khan Academy][KhanAcademy], we use simple-markdown to format our exercises
and articles, because we need [markdown extensions][PerseusMarkdown] for math
text and interactive widgets.

[Discord][Discord] uses simple-markdown for text chat, including username/mention
linking and custom emoji rendering.

[KhanAcademy]: https://khanacademy.org
[PerseusMarkdown]: https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
[Discord]: https://discordapp.com

simple-markdown is [MIT licensed][LICENSE].

[LICENSE]: https://github.com/Khan/simple-markdown/blob/master/LICENSE

Getting started
===============

