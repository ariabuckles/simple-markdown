import React from 'react';

import { getHtmlTag } from '../utils';
import { inlineRegex } from '../utils/regex';
import { sanitizeUrl, unescapeUrl } from '../utils/urls';

const LINK_INSIDE = '(?:\\[[^\\]]*\\]|[^\\]]|\\](?=[^\\[]*\\]))*';
const LINK_HREF_AND_TITLE =
        "\\s*<?((?:[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['\"]([\\s\\S]*?)['\"])?\\s*";

const link = {
  match: inlineRegex(new RegExp(
    `^\\[(${LINK_INSIDE})\\]\\(${LINK_HREF_AND_TITLE}\\)`,
  )),
  parse: (capture, parse, state) => ({
    content: parse(capture[1], state),
    target: unescapeUrl(capture[2]),
    title: capture[3],
  }),
  react: (node, output, state) => (
    <a
      key={state.key}
      href={sanitizeUrl(node.target)}
      title={node.title}>
      {output(node.content, state)}
    </a>
  ),
  html: (node, output, state) =>
    getHtmlTag('a', output(node.content, state), {
      href: sanitizeUrl(node.target),
      title: node.title,
    }),
};

export default link;
