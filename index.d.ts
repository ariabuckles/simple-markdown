/**
 * Typings are current as of simple-markdown 0.3.1.
 */

export interface MarkdownStyles {
  [markdownElementKey: string]: Object;
}

export interface MarkdownBaseNode {
  type: string;
  cells?: MarkdownContent[][];
  items?: MarkdownContent[];
  header?: MarkdownContent[];
  level?: number;
  ordered?: boolean;
  target?: string;
}

export interface MarkdownContent extends MarkdownBaseNode {
  content: string;
}

export interface MarkdownNode extends MarkdownBaseNode {
  content: MarkdownContent[];
}

export type MarkdownState = {
  key?: string;
  inline?: boolean;
  withinText?: boolean;
};

export type MarkdownAST = MarkdownContent[] | MarkdownContent | string;

export type MarkdownOutput = (ast: MarkdownAST, state: MarkdownState) => JSX.Element;

export type RuleASTFunction = (ast: MarkdownAST, output: MarkdownOutput, state: MarkdownState) => JSX.Element | JSX.Element[];

export type RuleFunction = (node: MarkdownNode | MarkdownContent, output: MarkdownOutput, state: MarkdownState) => JSX.Element | JSX.Element[];

export interface MarkdownRules {
  [markdownElementKey: string]: {
    react: RuleFunction;
  };
}

export type DefaultReactOutput = (ast: MarkdownAST, state?: MarkdownState) => JSX.Element | JSX.Element[];
export type DefaultHtmlOutput = (ast: MarkdownAST, state?: MarkdownState) => Object[];
export type ReactFor = (outputFunction: RuleASTFunction) => DefaultReactOutput;
export type Parser = (source: string, state: MarkdownState) => MarkdownAST;
export type ImplicitParser = (source: string) => MarkdownAST;
export type ParseHelper = (parse: ImplicitParser, content: string, state: MarkdownState) => MarkdownAST;
export type RegExHelper = (regExp: RegExp) => (source: string, state: MarkdownState) => number[] | null;

export interface SimpleMarkdown {
  inlineRegex: RegExHelper;
  blockRegex: RegExHelper;
  anyScopeRegex: RegExHelper;
  parseInline: ParseHelper;
  parseBlock: ParseHelper;

  defaultRawParse: ImplicitParser;
  defaultBlockParse: ImplicitParser;
  defaultInlineParse: ImplicitParser;
  defaultImplicitParse: ImplicitParser;

  defaultReactOutput: DefaultReactOutput;
  defaultHtmlOutput: DefaultHtmlOutput;

  preprocess: (source: string) => string;
  sanitizeUrl: (url: string) => string;
  unescapeUrl: (url: string) => string;

  // deprecated:
  defaultParse: ImplicitParser;
  outputFor: ReactFor;
  defaultOutput: DefaultReactOutput;

  defaultRules: MarkdownRules;
  reactFor: ReactFor;
  htmlFor: (outputFunction: RuleASTFunction) => DefaultHtmlOutput;
  ruleOutput: (rules: MarkdownRules, property: string) => RuleASTFunction;
  parserFor: (rules: MarkdownRules) => Parser;
}

declare const Markdown: SimpleMarkdown;
export default Markdown;
