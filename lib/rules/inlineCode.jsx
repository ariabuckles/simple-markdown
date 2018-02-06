import React from 'react';

import { getHtmlTag } from '../utils';
import { inlineRegex } from '../utils/regex';

const inlineCode = {
  match: inlineRegex(/^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/),
  parse: capture => ({
    content: capture[2],
  }),
  react: (node, output, state) => (
    <code key={state.key}>
      {node.content}
    </code>
  ),
  html: node =>
    getHtmlTag('code', node.content),
};

export default inlineCode;
