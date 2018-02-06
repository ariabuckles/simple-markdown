import React from 'react';

import { getHtmlTag, parseCaptureInline } from '../utils';
import { inlineRegex } from '../utils/regex';

const strong = {
  match: inlineRegex(/^\*\*([\s\S]+?)\*\*(?!\*)/),
  quality: capture => capture[0].length + 0.1,
  parse: parseCaptureInline,
  react: (node, output, state) => (
    <strong key={state.key}>
      {output(node.content, state)}
    </strong>
  ),
  html: (node, output, state) =>
    getHtmlTag('strong', output(node.content, state)),
};

export default strong;
