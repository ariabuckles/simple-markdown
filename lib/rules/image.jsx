import React from 'react';

import { getHtmlTag } from '../utils';
import { inlineRegex } from '../utils/regex';
import { sanitizeUrl, unescapeUrl } from '../utils/urls';

const LINK_INSIDE = '(?:\\[[^\\]]*\\]|[^\\]]|\\](?=[^\\[]*\\]))*';
const LINK_HREF_AND_TITLE =
        "\\s*<?((?:[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['\"]([\\s\\S]*?)['\"])?\\s*";

const image = {
  match: inlineRegex(new RegExp(`^!\\[(${LINK_INSIDE})\\]\\(${LINK_HREF_AND_TITLE}\\)`)),
  parse: capture => ({
    alt: capture[1],
    target: unescapeUrl(capture[2]),
    title: capture[3],
  }),
  react: (node, output, state) => (
    <img
      key={state.key}
      src={sanitizeUrl(node.target)}
      title={node.title}
      alt={node.alt}
    />
  ),
  html: node =>
    getHtmlTag('img', '', {
      src: sanitizeUrl(node.target),
      alt: node.alt,
      title: node.title,
    }, false),
};

export default image;
