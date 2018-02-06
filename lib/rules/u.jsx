import React from 'react';

import { getHtmlTag, parseCaptureInline } from '../utils';
import { inlineRegex } from '../utils/regex';

const u = {
  match: inlineRegex(/^__([\s\S]+?)__(?!_)/),
  quality: capture => capture[0].length,
  parse: parseCaptureInline,
  react: (node, output, state) => (
    <u key={state.key}>
      {output(node.content, state)}
    </u>
  ),
  html: (node, output, state) =>
    getHtmlTag('u', output(node.content, state)),
};

export default u;
