import { blockRegex } from '../utils/regex';

const fence = {
  match: blockRegex(/^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n *)+\n/),
  parse: capture => ({
    type: 'codeBlock',
    lang: capture[2] || undefined,
    content: capture[3],
  }),
};

export default fence;
