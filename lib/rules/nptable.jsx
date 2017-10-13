import { blockRegex } from '../utils';
import { NPTABLE_REGEX, parseNpTable } from '../utils/tables';

const nptable = {
  match: blockRegex(NPTABLE_REGEX),
  // For perseus-markdown temporary backcompat:
  regex: NPTABLE_REGEX,
  parse: parseNpTable,
};

export default nptable;
