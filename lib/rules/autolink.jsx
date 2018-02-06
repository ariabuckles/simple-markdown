import { inlineRegex } from '../utils/regex';

const autolink = {
  match: inlineRegex(/^<([^ >]+:\/[^ >]+)>/),
  parse: capture => ({
    type: 'link',
    content: [{
      type: 'text',
      content: capture[1],
    }],
    target: capture[1],
  }),
};

export default autolink;
