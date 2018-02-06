import _ from 'lodash';

import autolink from './autolink';
import blockQuote from './blockQuote';
import br from './br';
import codeBlock from './codeBlock';
import def from './def';
import del from './del';
import em from './em';
import escape from './escape';
import fence from './fence';
import heading from './heading';
import hr from './hr';
import image from './image';
import inlineCode from './inlineCode';
import lheading from './lheading';
import link from './link';
import list from './list';
import mailto from './mailto';
import newline from './newline';
import nptable from './nptable';
import paragraph from './paragraph';
import refimage from './refimage';
import reflink from './reflink';
import strong from './strong';
import table from './table';
import text from './text';
import u from './u';
import url from './url';

const rules = {
  heading,
  nptable,
  lheading,
  hr,
  codeBlock,
  fence,
  blockQuote,
  list,
  def,
  table,
  newline,
  paragraph,
  escape,
  autolink,
  mailto,
  url,
  link,
  image,
  reflink,
  refimage,
  em,
  strong,
  u,
  del,
  inlineCode,
  br,
  text,
};

let order = 0;
export default _.mapValues(rules, (value) => {
  const rule = value;
  rule.order = order;
  order += 1;
  return rule;
});
