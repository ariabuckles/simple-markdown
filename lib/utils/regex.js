// Creates a match function for an inline scoped element from a regex
export const inlineRegex = (regex) => {
  const match = (source, state) => {
    if (state.inline) {
      return regex.exec(source);
    }
    return null;
  };
  match.regex = regex;
  return match;
};

// Creates a match function for a block scoped element from a regex
export const blockRegex = (regex) => {
  const match = (source, state) => {
    if (state.inline) {
      return null;
    }
    return regex.exec(source);
  };
  match.regex = regex;
  return match;
};

// Creates a match function from a regex, ignoring block/inline scope
export const anyScopeRegex = (regex) => {
  const match = source => regex.exec(source);
  match.regex = regex;
  return match;
};
