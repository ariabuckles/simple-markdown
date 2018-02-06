import _ from 'lodash';
import React from 'react';

import { parseTable } from '../utils/tables';
import { blockRegex } from '../utils/regex';
import { getHtmlTag } from '../utils';

const table = {
  match: blockRegex(/^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/),
  parse: parseTable,
  react(node, output, state) {
    const getStyle = (colIndex) => {
      if (node.align[colIndex] == null) return {};

      return {
        textAlign: node.align[colIndex],
      };
    };

    return (
      <table key={state.key}>
        <thead>
          <tr>
            {_.map(node.header, (content, i) => (
              <th key={i} style={getStyle(i)} scope="col">
                {output(content, state)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {_.map(node.cells, (row, r) => (
            <tr key={r}>
              {_.map(row, (content, c) => (
                <td key={c} style={getStyle(c)}>
                  {output(content, state)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  html(node, output, state) {
    const getStyle = (colIndex) => {
      if (node.align[colIndex] == null) return '';

      return `text-align:${node.align[colIndex]};`;
    };

    const headers = _.map(node.header, (content, i) =>
      getHtmlTag('th', output(content, state), {
        style: getStyle(i),
        scope: 'col',
      }),
    ).join('');

    const rows = _.map(node.cells, (row) => {
      const cols = _.map(row, (content, c) =>
        getHtmlTag('td', output(content, state), { style: getStyle(c) }),
      ).join('');

      return getHtmlTag('tr', cols);
    }).join('');

    const thead = getHtmlTag('thead', getHtmlTag('tr', headers));
    const tbody = getHtmlTag('tbody', rows);

    return getHtmlTag('table', thead + tbody);
  },
};

export default table;
