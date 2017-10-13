export const parseInline = (parse, content, state) => {
  const isCurrentlyInline = state.inline || false;
  state.inline = true;
  const result = parse(content, state);
  state.inline = isCurrentlyInline;
  return result;
};

export const parseBlock = (parse, content, state) => {
  const isCurrentlyInline = state.inline || false;
  state.inline = false;
  const result = parse(`${content}\n\n`, state);
  state.inline = isCurrentlyInline;
  return result;
};

export const parseCaptureInline = (capture, parse, state) => ({
  content: parseInline(parse, capture[1], state),
});

export const ignoreCapture = () => {};
