import React from 'react';

import { getHtmlTag } from '../utils';
import { inlineRegex } from '../utils/regex';

const em = {
  match: inlineRegex(
    new RegExp(
      // only match _s surrounding words.
      '^\\b_' +
      '((?:__|\\\\[\\s\\S]|[^\\\\_])+?)_' +
      '\\b' +
      // Or match *s:
      '|' +
      // Only match *s that are followed by a non-space:
      '^\\*(?=\\S)(' +
      // Match at least one of:
      //  - `**`: so that bolds inside italics don't close the
      //          italics
      //  - whitespace: followed by a non-* (we don't
      //          want ' *' to close an italics--it might
      //          start a list)
      //  - non-whitespace, non-* characters
      '(?:\\*\\*|\\s+(?:[^\\*\\s]|\\*\\*)|[^\\s\\*])+?' +
      // followed by a non-space, non-* then *
      ')\\*(?!\\*)',
    ),
  ),
  quality: capture => capture[0].length + 0.2,
  parse: (capture, parse, state) => ({
    content: parse(capture[2] || capture[1], state),
  }),
  react: (node, output, state) => (
    <em key={state.key}>
      {output(node.content, state)}
    </em>
  ),
  html: (node, output, state) =>
    getHtmlTag('em', output(node.content, state)),
};

export default em;
