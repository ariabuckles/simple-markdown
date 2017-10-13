import React from 'react';

import { blockRegex } from '../utils/regex';
import { getHtmlTag } from '../utils';

const codeBlock = {
  match: blockRegex(/^(?: {4}[^\n]+\n*)+(?:\n *)+\n/),
  parse(capture) {
    const content = capture[0].replace(/^ {4}/gm, '').replace(/\n+$/, '');

    return {
      lang: undefined,
      content,
    };
  },
  react(node, output, state) {
    const className = node.lang ? `markdown-code-${node.lang}` : undefined;

    return (
      <pre key={state.key}>
        <code className={className}>
          {node.content}
        </code>
      </pre>
    );
  },
  html(node) {
    const className = node.lang ? `markdown-code-${node.lang}` : undefined;
    const block = getHtmlTag('code', node.content, { class: className });

    return getHtmlTag('pre', block);
  },
};

export default codeBlock;
