import { blockRegex } from '../utils';
import { parseInline } from '../utils/parse';

const lheading = {
  match: blockRegex(/^([^\n]+)\n *(=|-){3,} *(?:\n *)+\n/),
  parse: (capture, parse, state) => ({
    content: parseInline(parse, capture[1], state),
    level: capture[2] === '=' ? 1 : 2,
    type: 'heading',
  }),
};

export default lheading;
