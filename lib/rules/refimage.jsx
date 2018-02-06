import { parseRef } from '../utils';
import { inlineRegex } from '../utils/regex';

const LINK_INSIDE = '(?:\\[[^\\]]*\\]|[^\\]]|\\](?=[^\\[]*\\]))*';

const refimage = {
  match: inlineRegex(new RegExp(`^!\\[(${LINK_INSIDE})\\]\\s*\\[([^\\]]*)\\]`)),
  parse: (capture, parse, state) =>
    parseRef(capture, state, {
      type: 'image',
      alt: capture[1],
    }),
};

export default refimage;
