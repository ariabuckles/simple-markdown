import React from 'react';

import { getHtmlTag, blockRegex, parseInline } from '../utils';

const heading = {
  match: blockRegex(/^ *(#{1,6}) *([^\n]+?) *#* *(?:\n *)+\n/),
  parse(capture, parse, state) {
    return {
      level: capture[1].length,
      content: parseInline(parse, capture[2], state),
    };
  },
  react(node, output, state) {
    const Node = `h${node.level}`;
    return (
      <Node key={state.key}>
        {output(node.content, state)}
      </Node>
    );
  },
  html(node, output, state) {
    return getHtmlTag(`h${node.level}`, output(node.content, state));
  },
};

export default heading;
