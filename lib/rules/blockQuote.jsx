import React from 'react';

import { blockRegex } from '../utils/regex';
import { getHtmlTag } from '../utils';

const blockQuote = {
  match: blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+\n{2,}/),
  parse(capture, parse, state) {
    const content = capture[0].replace(/^ *> ?/gm, '');
    return {
      content: parse(content, state),
    };
  },
  react(node, output, state) {
    return (
      <blockquote key={state.key}>
        {output(node.content, state)}
      </blockquote>
    );
  },
  html(node, output, state) {
    return getHtmlTag('blockquote', output(node.content, state));
  },
};

export default blockQuote;
