import _ from 'lodash';
import React from 'react';

import { getHtmlTag } from '../utils';

const LIST_BULLET = '(?:[*+-]|\\d+\\.)';
const LIST_ITEM_PREFIX = `( *)(${LIST_BULLET}) +`;
const LIST_ITEM_PREFIX_R = new RegExp(`^${LIST_ITEM_PREFIX}`);
const BLOCK_END_R = /\n{2,}$/;
const LIST_LOOKBEHIND_R = /^$|\n *$/;
const LIST_R = new RegExp(`^( *)(${LIST_BULLET}) [\\s\\S]+?(?:\n{2,}(?! )(?!\\1${LIST_BULLET} )\\n*|\\s*\n*$)`);
const LIST_ITEM_R = new RegExp(`${LIST_ITEM_PREFIX}[^\\n]*(?:\\n(?!\\1${LIST_BULLET} )[^\\n]*)*(\n|$)`, 'gm');
const LIST_BLOCK_END_R = BLOCK_END_R;
const LIST_ITEM_END_R = / *\n+$/;

const list = {
  match(source, state, prevCapture) {
    // We only want to break into a list if we are at the start of a
    // line. This is to avoid parsing "hi * there" with "* there"
    // becoming a part of a list.
    // You might wonder, "but that's inline, so of course it wouldn't
    // start a list?". You would be correct! Except that some of our
    // lists can be inline, because they might be inside another list,
    // in which case we can parse with inline scope, but need to allow
    // nested lists inside this inline scope.
    const isStartOfLine = LIST_LOOKBEHIND_R.test(prevCapture);
    const isListBlock = state._list || !state.inline; // eslint-disable-line no-underscore-dangle

    if (isStartOfLine && isListBlock) {
      return LIST_R.exec(source);
    }

    return null;
  },
  parse(capture, parse, state) {
    const bullet = capture[2];
    const ordered = bullet.length > 1;
    const start = ordered ? +bullet : undefined;
    const items = capture[0]
      .replace(LIST_BLOCK_END_R, '\n')
      .match(LIST_ITEM_R);

    let lastItemWasAParagraph = false;
    const itemContent = items.map((item, i) => {
      // We need to see how far indented this item is:
      const space = LIST_ITEM_PREFIX_R.exec(item)[0].length;
      // And then we construct a regex to "unindent" the subsequent
      // lines of the items by that amount:
      const spaceRegex = new RegExp(`^ {1,${space}}`, 'gm');

      // Before processing the item, we need a couple things
      const content = item
        // remove indents on trailing lines:
        .replace(spaceRegex, '')
        // remove the bullet:
        .replace(LIST_ITEM_PREFIX_R, '');

      // Handling "loose" lists, like:
      //
      //  * this is wrapped in a paragraph
      //
      //  * as is this
      //
      //  * as is this
      const isLastItem = (i === items.length - 1);
      const containsBlocks = content.indexOf('\n\n') !== -1;

      // Any element in a list is a block if it contains multiple
      // newlines. The last element in the list can also be a block
      // if the previous item in the list was a block (this is
      // because non-last items in the list can end with \n\n, but
      // the last item can't, so we just "inherit" this property
      // from our previous element).
      const thisItemIsAParagraph = containsBlocks ||
              (isLastItem && lastItemWasAParagraph);
      lastItemWasAParagraph = thisItemIsAParagraph;

      // backup our state for restoration afterwards. We're going to
      // want to set state._list to true, and state.inline depending
      // on our list's looseness.
      const oldStateInline = state.inline;
      const oldStateList = state._list; // eslint-disable-line no-underscore-dangle
      state._list = true; // eslint-disable-line

      // Parse inline if we're in a tight list, or block if we're in
      // a loose list.
      let adjustedContent;
      if (thisItemIsAParagraph) {
        state.inline = false; // eslint-disable-line
        adjustedContent = content.replace(LIST_ITEM_END_R, '\n\n');
      } else {
        state.inline = true; // eslint-disable-line
        adjustedContent = content.replace(LIST_ITEM_END_R, '');
      }

      const result = parse(adjustedContent, state);

      // Restore our state before returning
      state.inline = oldStateInline; // eslint-disable-line
      state._list = oldStateList; // eslint-disable-line
      return result;
    });

    return {
      items: itemContent,
      ordered,
      start,
    };
  },
  react(node, output, state) {
    if (node.ordered) {
      return (
        <ol start={node.start} key={state.key}>
          {_.map(node.items, (item, i) => (
            <li key={i}>
              {output(item, state)}
            </li>
          ))}
        </ol>
      );
    }

    return (
      <ul key={state.key}>
        {_.map(node.items, (item, i) => (
          <li key={i}>
            {output(item, state)}
          </li>
        ))}
      </ul>
    );
  },
  html(node, output, state) {
    const listItems = node.items.map(item => getHtmlTag('li', output(item, state))).join('');

    const listTag = node.ordered ? 'ol' : 'ul';
    const attributes = { start: node.start };

    return getHtmlTag(listTag, listItems, attributes);
  },
};

export default list;
