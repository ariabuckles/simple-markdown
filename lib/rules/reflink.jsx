import { parseRef } from '../utils';
import { inlineRegex } from '../utils/regex';

const LINK_INSIDE = '(?:\\[[^\\]]*\\]|[^\\]]|\\](?=[^\\[]*\\]))*';

const reflink = {
  match: inlineRegex(new RegExp(
    // The first [part] of the link
    `^\\[(${LINK_INSIDE})\\]` +
    // The [ref] target of the link
    '\\s*\\[([^\\]]*)\\]',
  )),
  parse: (capture, parse, state) =>
    parseRef(capture, state, {
      type: 'link',
      content: parse(capture[1], state),
    }),
};

export default reflink;
