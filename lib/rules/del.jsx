import React from 'react';

import { getHtmlTag, parseCaptureInline } from '../utils';
import { inlineRegex } from '../utils/regex';

const del = {
  match: inlineRegex(/^~~(?=\S)([\s\S]*?\S)~~/),
  parse: parseCaptureInline,
  react: (node, output, state) => (
    <del key={state.key}>
      {output(node.content, state)}
    </del>
  ),
  html: (node, output, state) =>
    getHtmlTag('del', output(node.content, state)),
};

export default del;
