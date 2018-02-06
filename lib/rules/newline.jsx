import { blockRegex } from '../utils/regex';

const newline = {
  match: blockRegex(/^(?:\n *)*\n/),
  parse: () => ({}),
  react: () => '\n',
  html: () => '\n',
};

export default newline;
