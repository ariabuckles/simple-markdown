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
export function getHtmlTag(tagName, content, rawAttributes, rawIsClosed) {
  const attributes = rawAttributes || {};
  const isClosed = typeof rawIsClosed !== 'undefined' ? rawIsClosed : true;

  let attributeString = '';
  _.map(attributes, (attr) => {
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
export function parseInline(parse, content, rawState) {
  const state = _.cloneDeep(rawState);
  const isCurrentlyInline = state.inline || false;
  state.inline = true;
  const result = parse(content, state);
  state.inline = isCurrentlyInline;
  return result;
}
