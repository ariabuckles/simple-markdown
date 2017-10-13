/* @flow */

/**
 * Simple-Markdown
 * ===============
 *
 * Simple-Markdown's primary goal is to be easy to adapt. It aims
 * to be compliant with John Gruber's [Markdown Syntax page][1],
 * but compatiblity with other markdown implementations' edge-cases
 * will be sacrificed where it conflicts with simplicity or
 * extensibility.
 *
 * If your goal is to simply embed a standard markdown implementation
 * in your website, simple-markdown is probably not the best library
 * for you (although it should work). But if you have struggled to
 * customize an existing library to meet your needs, simple-markdown
 * might be able to help.
 *
 * Many of the regexes and original logic has been adapted from
 * the wonderful [marked.js](https://github.com/chjj/marked)
 *
 * LICENSE (MIT):
 * New code copyright (c) 2014 Khan Academy.
 *
 * Portions adapted from marked.js copyright (c) 2011-2014
 * Christopher Jeffrey (https://github.com/chjj/).
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function () {
  const CR_NEWLINE_R = /\r\n?/g;
  const TAB_R = /\t/g;
  const FORMFEED_R = /\f/g;
  // Turn various crazy whitespace into easy to process things
  const preprocess = function (source) {
    return source.replace(CR_NEWLINE_R, '\n')
      .replace(FORMFEED_R, '')
      .replace(TAB_R, '    ');
  };

  /**
 * Creates a parser for a given set of rules, with the precedence
 * specified as a list of rules.
 *
 * @rules: an object containing
 * rule type -> {match, order, parse} objects
 * (lower order is higher precedence)
 * (Note: `order` is added to defaultRules after creation so that
 *  the `order` of defaultRules in the source matches the `order`
 *  of defaultRules in terms of `order` fields.)
 *
 * @returns The resulting parse function, with the following parameters:
 *   @source: the input source string to be parsed
 *   @state: an optional object to be threaded through parse
 *     calls. Allows clients to add stateful operations to
 *     parsing, such as keeping track of how many levels deep
 *     some nesting is. For an example use-case, see passage-ref
 *     parsing in src/widgets/passage/passage-markdown.jsx
 */
  const parserFor = function (rules) {
    // Sorts rules in order of increasing order, then
    // ascending rule name in case of ties.
    const ruleList = Object.keys(rules);
    ruleList.forEach((type) => {
      const order = rules[type].order;
      if ((typeof order !== 'number' || !isFinite(order)) &&
                typeof console !== 'undefined') {
        console.warn(
          `simple-markdown: Invalid order for rule \`${type}\`: ${
            order}`,
        );
      }
    });

    ruleList.sort((typeA, typeB) => {
      const orderA = rules[typeA].order;
      const orderB = rules[typeB].order;

      // First sort based on increasing order
      if (orderA !== orderB) {
        return orderA - orderB;

        // Then based on increasing unicode lexicographic ordering
      } else if (typeA < typeB) {
        return -1;
      } else if (typeA > typeB) {
        return 1;
      }
      // Rules should never have the same name,
      // but this is provided for completeness.
      return 0;
    });

    var nestedParse = function (source, state) {
      const result = [];
      state = state || {};
      // We store the previous capture so that match functions can
      // use some limited amount of lookbehind. Lists use this to
      // ensure they don't match arbitrary '- ' or '* ' in inline
      // text (see the list rule for more information).
      let prevCapture = '';
      while (source) {
        let i = 0;
        while (i < ruleList.length) {
          const ruleType = ruleList[i];
          const rule = rules[ruleType];
          var capture;
          if (rule.match) {
            capture = rule.match(source, state, prevCapture);
          } else {
            capture = rule.regex.exec(source);
          }
          if (capture) {
            const currCaptureString = capture[0];
            source = source.substring(currCaptureString.length);
            const parsed = rule.parse(capture, nestedParse, state);
            // We maintain the same object here so that rules can
            // store references to the objects they return and
            // modify them later. (oops sorry! but this adds a lot
            // of power--see reflinks.)
            if (Array.isArray(parsed)) {
              Array.prototype.push.apply(result, parsed);
            } else {
              // We also let rules override the default type of
              // their parsed node if they would like to, so that
              // there can be a single output function for all links,
              // even if there are several rules to parse them.
              if (parsed.type == null) {
                parsed.type = ruleType;
              }
              result.push(parsed);
            }

            prevCapture = currCaptureString;
            break;
          }
          i++;
        }

        // TODO(aria): Write tests for this
        if (i === ruleList.length) {
          throw new Error(
            `could not find rule to match content: ${source}`,
          );
        }
      }
      return result;
    };

    const outerParse = function (source, state) {
      return nestedParse(preprocess(source), state);
    };
    return outerParse;
  };

  // Creates a match function for an inline scoped element from a regex
  const inlineRegex = function (regex) {
    const match = function (source, state) {
      if (state.inline) {
        return regex.exec(source);
      }
      return null;
    };
    match.regex = regex;
    return match;
  };

  // Creates a match function for a block scoped element from a regex
  const blockRegex = function (regex) {
    const match = function (source, state) {
      if (state.inline) {
        return null;
      }
      return regex.exec(source);
    };
    match.regex = regex;
    return match;
  };

  // Creates a match function from a regex, ignoring block/inline scope
  const anyScopeRegex = function (regex) {
    const match = function (source, state) {
      return regex.exec(source);
    };
    match.regex = regex;
    return match;
  };

  const reactFor = function (outputFunc) {
    var nestedOutput = function (ast, state) {
      state = state || {};
      if (Array.isArray(ast)) {
        const oldKey = state.key;
        const result = [];

        // map nestedOutput over the ast, except group any text
        // nodes together into a single string output.
        let lastWasString = false;
        for (let i = 0; i < ast.length; i++) {
          state.key = i;
          const nodeOut = nestedOutput(ast[i], state);
          const isString = (typeof nodeOut === 'string');
          if (isString && lastWasString) {
            result[result.length - 1] += nodeOut;
          } else {
            result.push(nodeOut);
          }
          lastWasString = isString;
        }

        state.key = oldKey;
        return result;
      }
      return outputFunc(ast, nestedOutput, state);
    };
    return nestedOutput;
  };

  const htmlFor = function (outputFunc) {
    var nestedOutput = function (ast, state) {
      state = state || {};
      if (Array.isArray(ast)) {
        return ast.map(node => nestedOutput(node, state)).join('');
      }
      return outputFunc(ast, nestedOutput, state);
    };
    return nestedOutput;
  };

  const TYPE_SYMBOL =
    (typeof Symbol === 'function' && Symbol.for &&
     Symbol.for('react.element')) ||
    0xeac7;

  const EMPTY_PROPS = {};

  const sanitizeUrl = function (url) {
    if (url == null) {
      return null;
    }
    try {
      const prot = decodeURIComponent(url)
        .replace(/[^A-Za-z0-9/:]/g, '')
        .toLowerCase();
      if (prot.indexOf('javascript:') === 0) {
        return null;
      }
    } catch (e) {
      // decodeURIComponent sometimes throws a URIError
      // See `decodeURIComponent('a%AFc');`
      // http://stackoverflow.com/questions/9064536/javascript-decodeuricomponent-malformed-uri-exception
      return null;
    }
    return url;
  };

  const UNESCAPE_URL_R = /\\([^0-9A-Za-z\s])/g;

  const unescapeUrl = function (rawUrlString) {
    return rawUrlString.replace(UNESCAPE_URL_R, '$1');
  };

  // Parse some content with the parser `parse`, with state.inline
  // set to true. Useful for block elements; not generally necessary
  // to be used by inline elements (where state.inline is already true.
  const parseInline = function (parse, content, state) {
    const isCurrentlyInline = state.inline || false;
    state.inline = true;
    const result = parse(content, state);
    state.inline = isCurrentlyInline;
    return result;
  };
  const parseBlock = function (parse, content, state) {
    const isCurrentlyInline = state.inline || false;
    state.inline = false;
    const result = parse(`${content}\n\n`, state);
    state.inline = isCurrentlyInline;
    return result;
  };

  const parseCaptureInline = function (capture, parse, state) {
    return {
      content: parseInline(parse, capture[1], state),
    };
  };
  const ignoreCapture = function () { return {}; };

  // recognize a `*` `-`, `+`, `1.`, `2.`... list bullet
  const LIST_BULLET = '(?:[*+-]|\\d+\\.)';
  // recognize the start of a list item:
  // leading space plus a bullet plus a space (`   * `)
  const LIST_ITEM_PREFIX = `( *)(${LIST_BULLET}) +`;
  const LIST_ITEM_PREFIX_R = new RegExp(`^${LIST_ITEM_PREFIX}`);
  // recognize an individual list item:
  //  * hi
  //    this is part of the same item
  //
  //    as is this, which is a new paragraph in the same item
  //
  //  * but this is not part of the same item
  const LIST_ITEM_R = new RegExp(
    `${LIST_ITEM_PREFIX
    }[^\\n]*(?:\\n` +
    `(?!\\1${LIST_BULLET} )[^\\n]*)*(\n|$)`,
    'gm',
  );
  const BLOCK_END_R = /\n{2,}$/;
  // recognize the end of a paragraph block inside a list item:
  // two or more newlines at end end of the item
  const LIST_BLOCK_END_R = BLOCK_END_R;
  const LIST_ITEM_END_R = / *\n+$/;
  // check whether a list item has paragraphs: if it does,
  // we leave the newlines at the end
  const LIST_R = new RegExp(
    `^( *)(${LIST_BULLET}) ` +
    '[\\s\\S]+?(?:\n{2,}(?! )' +
    `(?!\\1${LIST_BULLET} )\\n*` +
    // the \\s*$ here is so that we can parse the inside of nested
    // lists, where our content might end before we receive two `\n`s
    '|\\s*\n*$)',
  );
  const LIST_LOOKBEHIND_R = /^$|\n *$/;

  const LINK_INSIDE = '(?:\\[[^\\]]*\\]|[^\\]]|\\](?=[^\\[]*\\]))*';
  const LINK_HREF_AND_TITLE =
        "\\s*<?((?:[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['\"]([\\s\\S]*?)['\"])?\\s*";
  const AUTOLINK_MAILTO_CHECK_R = /mailto:/i;

  const parseRef = function (capture, state, refNode) {
    const ref = (capture[2] || capture[1])
      .replace(/\s+/g, ' ')
      .toLowerCase();

    // We store information about previously seen defs on
    // state._defs (_ to deconflict with client-defined
    // state). If the def for this reflink/refimage has
    // already been seen, we can use its target/source
    // and title here:
    if (state._defs && state._defs[ref]) {
      const def = state._defs[ref];
      // `refNode` can be a link or an image. Both use
      // target and title properties.
      refNode.target = def.target;
      refNode.title = def.title;
    }

    // In case we haven't seen our def yet (or if someone
    // overwrites that def later on), we add this node
    // to the list of ref nodes for that def. Then, when
    // we find the def, we can modify this link/image AST
    // node :).
    // I'm sorry.
    state._refs = state._refs || {};
    state._refs[ref] = state._refs[ref] || [];
    state._refs[ref].push(refNode);

    return refNode;
  };

  const defaultRules = {
    heading: {
      match: blockRegex(/^ *(#{1,6}) *([^\n]+?) *#* *(?:\n *)+\n/),
      parse(capture, parse, state) {
        return {
          level: capture[1].length,
          content: parseInline(parse, capture[2], state),
        };
      },
      react(node, output, state) {
        return reactElement({
          type: `h${node.level}`,
          key: state.key,
          props: {
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag(`h${node.level}`, output(node.content, state));
      },
    },
    nptable: {
      match: blockRegex(TABLES.NPTABLE_REGEX),
      // For perseus-markdown temporary backcompat:
      regex: TABLES.NPTABLE_REGEX,
      parse: TABLES.parseNpTable,
    },
    lheading: {
      match: blockRegex(/^([^\n]+)\n *(=|-){3,} *(?:\n *)+\n/),
      parse(capture, parse, state) {
        return {
          type: 'heading',
          level: capture[2] === '=' ? 1 : 2,
          content: parseInline(parse, capture[1], state),
        };
      },
    },
    hr: {
      match: blockRegex(/^( *[-*_]){3,} *(?:\n *)+\n/),
      parse: ignoreCapture,
      react(node, output, state) {
        return reactElement({
          type: 'hr',
          key: state.key,
          props: EMPTY_PROPS,
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return '<hr>';
      },
    },
    codeBlock: {
      match: blockRegex(/^(?: {4}[^\n]+\n*)+(?:\n *)+\n/),
      parse(capture, parse, state) {
        const content = capture[0]
          .replace(/^ {4}/gm, '')
          .replace(/\n+$/, '');
        return {
          lang: undefined,
          content,
        };
      },
      react(node, output, state) {
        const className = node.lang ?
          `markdown-code-${node.lang}` :
          undefined;

        return reactElement({
          type: 'pre',
          key: state.key,
          props: {
            children: reactElement({
              type: 'code',
              props: {
                className,
                children: node.content,
              },
              $$typeof: TYPE_SYMBOL,
              _store: null,
            }),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        const className = node.lang ?
          `markdown-code-${node.lang}` :
          undefined;

        const codeBlock = htmlTag('code', node.content, {
          class: className,
        });
        return htmlTag('pre', codeBlock);
      },
    },
    fence: {
      match: blockRegex(/^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n *)+\n/),
      parse(capture, parse, state) {
        return {
          type: 'codeBlock',
          lang: capture[2] || undefined,
          content: capture[3],
        };
      },
    },
    blockQuote: {
      match: blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+\n{2,}/),
      parse(capture, parse, state) {
        const content = capture[0].replace(/^ *> ?/gm, '');
        return {
          content: parse(content, state),
        };
      },
      react(node, output, state) {
        return reactElement({
          type: 'blockquote',
          key: state.key,
          props: {
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag('blockquote', output(node.content, state));
      },
    },
    list: {
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
        const isListBlock = state._list || !state.inline;

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
          const oldStateList = state._list;
          state._list = true;

          // Parse inline if we're in a tight list, or block if we're in
          // a loose list.
          let adjustedContent;
          if (thisItemIsAParagraph) {
            state.inline = false;
            adjustedContent = content.replace(LIST_ITEM_END_R, '\n\n');
          } else {
            state.inline = true;
            adjustedContent = content.replace(LIST_ITEM_END_R, '');
          }

          const result = parse(adjustedContent, state);

          // Restore our state before returning
          state.inline = oldStateInline;
          state._list = oldStateList;
          return result;
        });

        return {
          ordered,
          start,
          items: itemContent,
        };
      },
      react(node, output, state) {
        const ListWrapper = node.ordered ? 'ol' : 'ul';

        return reactElement({
          type: ListWrapper,
          key: state.key,
          props: {
            start: node.start,
            children: node.items.map((item, i) => reactElement({
              type: 'li',
              key: i,
              props: {
                children: output(item, state),
              },
              $$typeof: TYPE_SYMBOL,
              _store: null,
            })),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        const listItems = node.items.map(item => htmlTag('li', output(item, state))).join('');

        const listTag = node.ordered ? 'ol' : 'ul';
        const attributes = {
          start: node.start,
        };
        return htmlTag(listTag, listItems, attributes);
      },
    },
    def: {
      // TODO(aria): This will match without a blank line before the next
      // block element, which is inconsistent with most of the rest of
      // simple-markdown.
      match: blockRegex(
        /^ *\[([^\]]+)\]: *<?([^\s>]*)>?(?: +["(]([^\n]+)[")])? *\n(?: *\n)?/,
      ),
      parse(capture, parse, state) {
        const def = capture[1]
          .replace(/\s+/g, ' ')
          .toLowerCase();
        const target = capture[2];
        const title = capture[3];

        // Look for previous links/images using this def
        // If any links/images using this def have already been declared,
        // they will have added themselves to the state._refs[def] list
        // (_ to deconflict with client-defined state). We look through
        // that list of reflinks for this def, and modify those AST nodes
        // with our newly found information now.
        // Sorry :(.
        if (state._refs && state._refs[def]) {
          // `refNode` can be a link or an image
          state._refs[def].forEach((refNode) => {
            refNode.target = target;
            refNode.title = title;
          });
        }

        // Add this def to our map of defs for any future links/images
        // In case we haven't found any or all of the refs referring to
        // this def yet, we add our def to the table of known defs, so
        // that future reflinks can modify themselves appropriately with
        // this information.
        state._defs = state._defs || {};
        state._defs[def] = {
          target,
          title,
        };

        // return the relevant parsed information
        // for debugging only.
        return {
          def,
          target,
          title,
        };
      },
      react() { return null; },
      html() { return null; },
    },
    table: {
      match: blockRegex(/^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/),
      parse: TABLES.parseTable,
      react(node, output, state) {
        const getStyle = function (colIndex) {
          return node.align[colIndex] == null ? {} : {
            textAlign: node.align[colIndex],
          };
        };

        const headers = node.header.map((content, i) => reactElement({
          type: 'th',
          key: i,
          props: {
            style: getStyle(i),
            scope: 'col',
            children: output(content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        }));

        const rows = node.cells.map((row, r) => reactElement({
          type: 'tr',
          key: r,
          props: {
            children: row.map((content, c) => reactElement({
              type: 'td',
              key: c,
              props: {
                style: getStyle(c),
                children: output(content, state),
              },
              $$typeof: TYPE_SYMBOL,
              _store: null,
            })),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        }));

        return reactElement({
          type: 'table',
          key: state.key,
          props: {
            children: [reactElement({
              type: 'thead',
              key: 'thead',
              props: {
                children: reactElement({
                  type: 'tr',
                  props: {
                    children: headers,
                  },
                  $$typeof: TYPE_SYMBOL,
                  _store: null,
                }),
              },
              $$typeof: TYPE_SYMBOL,
              _store: null,
            }), reactElement({
              type: 'tbody',
              key: 'tbody',
              props: {
                children: rows,
              },
              $$typeof: TYPE_SYMBOL,
              _store: null,
            })],
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        const getStyle = function (colIndex) {
          return node.align[colIndex] == null ? '' :
            `text-align:${node.align[colIndex]};`;
        };

        const headers = node.header.map((content, i) => htmlTag('th', output(content, state),
          { style: getStyle(i), scope: 'col' })).join('');

        const rows = node.cells.map((row) => {
          const cols = row.map((content, c) => htmlTag('td', output(content, state),
            { style: getStyle(c) })).join('');

          return htmlTag('tr', cols);
        }).join('');

        const thead = htmlTag('thead', htmlTag('tr', headers));
        const tbody = htmlTag('tbody', rows);

        return htmlTag('table', thead + tbody);
      },
    },
    newline: {
      match: blockRegex(/^(?:\n *)*\n/),
      parse: ignoreCapture,
      react(node, output, state) { return '\n'; },
      html(node, output, state) { return '\n'; },
    },
    paragraph: {
      match: blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/),
      parse: parseCaptureInline,
      react(node, output, state) {
        return reactElement({
          type: 'p',
          key: state.key,
          props: {
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag('div', output(node.content, state));
      },
    },
    escape: {
      // We don't allow escaping numbers, letters, or spaces here so that
      // backslashes used in plain text still get rendered. But allowing
      // escaping anything else provides a very flexible escape mechanism,
      // regardless of how this grammar is extended.
      match: inlineRegex(/^\\([^0-9A-Za-z\s])/),
      parse(capture, parse, state) {
        return {
          type: 'text',
          content: capture[1],
        };
      },
    },
    autolink: {
      match: inlineRegex(/^<([^ >]+:\/[^ >]+)>/),
      parse(capture, parse, state) {
        return {
          type: 'link',
          content: [{
            type: 'text',
            content: capture[1],
          }],
          target: capture[1],
        };
      },
    },
    mailto: {
      match: inlineRegex(/^<([^ >]+@[^ >]+)>/),
      parse(capture, parse, state) {
        const address = capture[1];
        let target = capture[1];

        // Check for a `mailto:` already existing in the link:
        if (!AUTOLINK_MAILTO_CHECK_R.test(target)) {
          target = `mailto:${target}`;
        }

        return {
          type: 'link',
          content: [{
            type: 'text',
            content: address,
          }],
          target,
        };
      },
    },
    url: {
      match: inlineRegex(/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/),
      parse(capture, parse, state) {
        return {
          type: 'link',
          content: [{
            type: 'text',
            content: capture[1],
          }],
          target: capture[1],
          title: undefined,
        };
      },
    },
    link: {
      match: inlineRegex(new RegExp(
        `^\\[(${LINK_INSIDE})\\]\\(${LINK_HREF_AND_TITLE}\\)`,
      )),
      parse(capture, parse, state) {
        const link = {
          content: parse(capture[1], state),
          target: unescapeUrl(capture[2]),
          title: capture[3],
        };
        return link;
      },
      react(node, output, state) {
        return reactElement({
          type: 'a',
          key: state.key,
          props: {
            target: '_blank',
            href: sanitizeUrl(node.target),
            title: node.title,
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        const attributes = {
          target: '_blank',
          href: sanitizeUrl(node.target),
          title: node.title,
        };

        return htmlTag('a', output(node.content, state), attributes);
      },
    },
    image: {
      match: inlineRegex(new RegExp(
        `^!\\[(${LINK_INSIDE})\\]\\(${LINK_HREF_AND_TITLE}\\)`,
      )),
      parse(capture, parse, state) {
        const image = {
          alt: capture[1],
          target: unescapeUrl(capture[2]),
          title: capture[3],
        };
        return image;
      },
      react(node, output, state) {
        return reactElement({
          type: 'img',
          key: state.key,
          props: {
            src: sanitizeUrl(node.target),
            alt: node.alt,
            title: node.title,
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        const attributes = {
          src: sanitizeUrl(node.target),
          alt: node.alt,
          title: node.title,
        };

        return htmlTag('img', '', attributes, false);
      },
    },
    reflink: {
      match: inlineRegex(new RegExp(
        // The first [part] of the link
        `^\\[(${LINK_INSIDE})\\]` +
            // The [ref] target of the link
            '\\s*\\[([^\\]]*)\\]',
      )),
      parse(capture, parse, state) {
        return parseRef(capture, state, {
          type: 'link',
          content: parse(capture[1], state),
        });
      },
    },
    refimage: {
      match: inlineRegex(new RegExp(
        // The first [part] of the link
        `^!\\[(${LINK_INSIDE})\\]` +
            // The [ref] target of the link
            '\\s*\\[([^\\]]*)\\]',
      )),
      parse(capture, parse, state) {
        return parseRef(capture, state, {
          type: 'image',
          alt: capture[1],
        });
      },
    },
    em: {
      match: inlineRegex(
        new RegExp(
          // only match _s surrounding words.
          '^\\b_' +
                '((?:__|\\\\[\\s\\S]|[^\\\\_])+?)_' +
                '\\b' +
                // Or match *s:
                '|' +
                // Only match *s that are followed by a non-space:
                '^\\*(?=\\S)(' +
                // Match at least one of:
                //  - `**`: so that bolds inside italics don't close the
                //          italics
                //  - whitespace: followed by a non-* (we don't
                //          want ' *' to close an italics--it might
                //          start a list)
                //  - non-whitespace, non-* characters
                '(?:\\*\\*|\\s+(?:[^\\*\\s]|\\*\\*)|[^\\s\\*])+?' +
                // followed by a non-space, non-* then *
                ')\\*(?!\\*)',
        ),
      ),
      parse(capture, parse, state) {
        return {
          content: parse(capture[2] || capture[1], state),
        };
      },
      react(node, output, state) {
        return reactElement({
          type: 'em',
          key: state.key,
          props: {
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag('em', output(node.content, state));
      },
    },
    strong: {
      match: inlineRegex(/^\*\*([\s\S]+?)\*\*(?!\*)/),
      parse: parseCaptureInline,
      react(node, output, state) {
        return reactElement({
          type: 'strong',
          key: state.key,
          props: {
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag('strong', output(node.content, state));
      },
    },
    u: {
      match: inlineRegex(/^__([\s\S]+?)__(?!_)/),
      parse: parseCaptureInline,
      react(node, output, state) {
        return reactElement({
          type: 'u',
          key: state.key,
          props: {
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag('u', output(node.content, state));
      },
    },
    del: {
      match: inlineRegex(/^~~(?=\S)([\s\S]*?\S)~~/),
      parse: parseCaptureInline,
      react(node, output, state) {
        return reactElement({
          type: 'del',
          key: state.key,
          props: {
            children: output(node.content, state),
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag('del', output(node.content, state));
      },
    },
    inlineCode: {
      match: inlineRegex(/^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/),
      parse(capture, parse, state) {
        return {
          content: capture[2],
        };
      },
      react(node, output, state) {
        return reactElement({
          type: 'code',
          key: state.key,
          props: {
            children: node.content,
          },
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return htmlTag('code', node.content);
      },
    },
    br: {
      match: anyScopeRegex(/^ {2,}\n/),
      parse: ignoreCapture,
      react(node, output, state) {
        return reactElement({
          type: 'br',
          key: state.key,
          props: EMPTY_PROPS,
          $$typeof: TYPE_SYMBOL,
          _store: null,
        });
      },
      html(node, output, state) {
        return '<br>';
      },
    },
    text: {
      // Here we look for anything followed by non-symbols,
      // double newlines, or double-space-newlines
      // We break on any symbol characters so that this grammar
      // is easy to extend without needing to modify this regex
      match: inlineRegex(
        /^[\s\S]+?(?=[^0-9A-Za-z\s\u00c0-\uffff]|\n\n| {2,}\n|\w+:\S|$)/,
      ),
      parse(capture, parse, state) {
        return {
          content: capture[0],
        };
      },
      react(node, output, state) {
        return node.content;
      },
      html(node, output, state) {
        return node.content;
      },
    },
  };

  Object.keys(defaultRules).forEach((type, i) => {
    defaultRules[type].order = i;
  });

  const ruleOutput = function (rules, property) {
    if (!property && typeof console !== 'undefined') {
      console.warn("simple-markdown ruleOutput should take 'react' or " +
            "'html' as the second argument.",
      );
    }

    // deprecated:
    property = property || 'react';

    const nestedRuleOutput = function (ast, outputFunc, state) {
      return rules[ast.type][property](ast, outputFunc, state);
    };
    return nestedRuleOutput;
  };

  const defaultRawParse = parserFor(defaultRules);
  const defaultBlockParse = function (source) {
    return defaultRawParse(`${source}\n\n`, {
      inline: false,
    });
  };
  const defaultInlineParse = function (source) {
    return defaultRawParse(source, {
      inline: true,
    });
  };
  const defaultImplicitParse = function (source) {
    return defaultRawParse(source, {
      inline: !(BLOCK_END_R.test(source)),
    });
  };

  const defaultReactOutput = reactFor(ruleOutput(defaultRules, 'react'));
  const defaultHtmlOutput = htmlFor(ruleOutput(defaultRules, 'html'));

  const SimpleMarkdown = {
    defaultRules,
    parserFor,
    ruleOutput,
    reactFor,
    htmlFor,

    inlineRegex,
    blockRegex,
    anyScopeRegex,
    parseInline,
    parseBlock,

    defaultRawParse,
    defaultBlockParse,
    defaultInlineParse,
    defaultImplicitParse,

    defaultReactOutput,
    defaultHtmlOutput,

    preprocess,
    sanitizeUrl,
    unescapeUrl,

    // deprecated:
    defaultParse: defaultImplicitParse,
    outputFor: reactFor,
    defaultOutput: defaultReactOutput,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleMarkdown;
  } else if (typeof global !== 'undefined') {
    global.SimpleMarkdown = SimpleMarkdown;
  } else {
    window.SimpleMarkdown = SimpleMarkdown;
  }
}());
