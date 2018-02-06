import _ from 'lodash';

// Creates a match function for a block scoped element from a regex
export function blockRegex(regex) {
  const match = (source, state) => {
    if (state.inline) {
      return null;
    }

    return regex.exec(source);
  };
  match.regex = regex;
  return match;
}

// Returns a closed HTML tag.
// tagName: Name of HTML tag (eg. "em" or "a")
// content: Inner content of tag
// attributes: Optional extra attributes of tag as an object of key-value pairs
//   eg. { "href": "http://google.com" }. Falsey attributes are filtered out.
// isClosed: boolean that controls whether tag is closed or not (eg. img tags).
//   defaults to true
export function getHtmlTag(tagName, content, attributes, isClosed) {
  attributes = attributes || {}; // eslint-disable-line no-param-reassign
  isClosed = typeof isClosed !== 'undefined' ? isClosed : true; // eslint-disable-line no-param-reassign

  let attributeString = '';
  _.map(attributes, (value, attr) => {
    if (
      Object.prototype.hasOwnProperty.call(attributes, attr) &&
      attributes[attr]
    ) {
      attributeString += ` ${attr}="${attributes[attr]}"`;
    }
  });

  const unclosedTag = `<${tagName + attributeString}>`;
  if (isClosed) {
    return `${unclosedTag + content}</${tagName}>`;
  }

  return unclosedTag;
}


// Parse some content with the parser `parse`, with state.inline
// set to true. Useful for block elements; not generally necessary
// to be used by inline elements (where state.inline is already true.
export function parseInline(parse, content, state) {
  const isCurrentlyInline = state.inline || false;
  state.inline = true; // eslint-disable-line no-param-reassign
  const result = parse(content, state);
  state.inline = isCurrentlyInline; // eslint-disable-line no-param-reassign
  return result;
}

export function parseCaptureInline(capture, parse, state) {
  return {
    content: parseInline(parse, capture[1], state),
  };
}

export function parseRef(capture, state, refNode) {
  const ref = (capture[2] || capture[1])
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // We store information about previously seen defs on
  // state._defs (_ to deconflict with client-defined
  // state). If the def for this reflink/refimage has
  // already been seen, we can use its target/source
  // and title here:
  if (state._defs && state._defs[ref]) { // eslint-disable-line no-underscore-dangle
    const def = state._defs[ref]; // eslint-disable-line no-underscore-dangle
    // `refNode` can be a link or an image. Both use
    // target and title properties.
    refNode.target = def.target; // eslint-disable-line no-param-reassign
    refNode.title = def.title; // eslint-disable-line no-param-reassign
  }

  // In case we haven't seen our def yet (or if someone
  // overwrites that def later on), we add this node
  // to the list of ref nodes for that def. Then, when
  // we find the def, we can modify this link/image AST
  // node :).
  // I'm sorry.
  state._refs = state._refs || {}; // eslint-disable-line
  state._refs[ref] = state._refs[ref] || []; // eslint-disable-line
  state._refs[ref].push(refNode); // eslint-disable-line

  return refNode;
}
