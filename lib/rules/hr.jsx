import React from 'react';

import { ignoreCapture } from '../utils/parse';
import { blockRegex } from '../utils/regex';

const hr = {
  match: blockRegex(/^( *[-*_]){3,} *(?:\n *)+\n/),
  parse: () => ({}),
  react: (node, output, state) => <hr key={state.key} />,
  html: () => '<hr>',
};

export default hr;
