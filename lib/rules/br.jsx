import React from 'react';

import { anyScopeRegex } from '../utils/regex';

const br = {
  match: anyScopeRegex(/^ {2,}\n/),
  parse: () => ({}),
  react: (node, output, state) => (
    <br key={state.key} />
  ),
  html: () => '<br>',
};

export default br;
