import { inlineRegex } from '../utils/regex';

const url = {
  match: inlineRegex(/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/),
  parse: capture => ({
    type: 'link',
    content: [{
      type: 'text',
      content: capture[1],
    }],
    target: capture[1],
    title: undefined,
  }),
};

export default url;
