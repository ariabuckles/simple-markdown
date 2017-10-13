// predefine regexes so we don't have to create them inside functions
// sure, regex literals should be fast, even inside functions, but they
// aren't in all browsers.
const TABLE_HEADER_TRIM = /^ *| *\| *$/g;
const TABLE_ALIGN_TRIM = /^ *|\| *$/g;

const TABLE_CELLS_TRIM = /(?: *\| *)?\n$/;
const NPTABLE_CELLS_TRIM = /\n$/;
const PLAIN_TABLE_ROW_TRIM = /^ *\| *| *\| *$/g;
const TABLE_ROW_SPLIT = / *\| */;

const TABLE_RIGHT_ALIGN = /^ *-+: *$/;
const TABLE_CENTER_ALIGN = /^ *:-+: *$/;
const TABLE_LEFT_ALIGN = /^ *:-+ *$/;

function parseTableAlignCapture(alignCapture) {
  if (TABLE_RIGHT_ALIGN.test(alignCapture)) {
    return 'right';
  } else if (TABLE_CENTER_ALIGN.test(alignCapture)) {
    return 'center';
  } else if (TABLE_LEFT_ALIGN.test(alignCapture)) {
    return 'left';
  }

  return null;
}

function parseTableHeader(capture, parse, state) {
  const headerText = capture[1]
    .replace(TABLE_HEADER_TRIM, '')
    .split(TABLE_ROW_SPLIT);
  return headerText.map(text =>
    parse(text, state),
  );
}

function parseTableAlign(capture) {
  const alignText = capture[2]
    .replace(TABLE_ALIGN_TRIM, '')
    .split(TABLE_ROW_SPLIT);

  return alignText.map(parseTableAlignCapture);
}

function parseTableCells(capture, parse, state) {
  const rowsText = capture[3]
    .replace(TABLE_CELLS_TRIM, '')
    .split('\n');

  return rowsText.map((rowText) => {
    const cellText = rowText
      .replace(PLAIN_TABLE_ROW_TRIM, '')
      .split(TABLE_ROW_SPLIT);
    return cellText.map(text =>
      parse(text, state),
    );
  });
}

function parseNpTableCells(capture, parse, state) {
  const rowsText = capture[3]
    .replace(NPTABLE_CELLS_TRIM, '')
    .split('\n');

  return rowsText.map((rowText) => {
    const cellText = rowText.split(TABLE_ROW_SPLIT);
    return cellText.map(text =>
      parse(text, state),
    );
  });
}

export function parseTable(capture, parse, state) {
  state.inline = true;
  const header = parseTableHeader(capture, parse, state);
  const align = parseTableAlign(capture, parse, state);
  const cells = parseTableCells(capture, parse, state);
  state.inline = false;

  return {
    type: 'table',
    header,
    align,
    cells,
  };
}

export function parseNpTable(capture, parse, state) {
  state.inline = true;
  const header = parseTableHeader(capture, parse, state);
  const align = parseTableAlign(capture, parse, state);
  const cells = parseNpTableCells(capture, parse, state);
  state.inline = false;

  return {
    type: 'table',
    header,
    align,
    cells,
  };
}

export const NPTABLE_REGEX = /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/;
