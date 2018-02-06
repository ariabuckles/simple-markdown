import React from 'react';

import { blockRegex } from '../utils/regex';
import { parseCaptureInline, getHtmlTag } from '../utils';

const paragraph = {
  match: blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/),
  parse: parseCaptureInline,
  react: (node, output, state) => (
    <p key={state.key}>
      {output(node.content, state)}
    </p>
  ),
  html: (node, output, state) =>
    getHtmlTag('p', output(node.content, state)),
};

export default paragraph;
