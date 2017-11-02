/**
 * Typings are current as of simple-markdown 0.3.1.
 */

//
// INTERFACES & TYPES
//

export type DefaultHtmlOutput = (ast: MarkdownAST, state?: MarkdownState) => Object[];
export type DefaultReactOutput = (ast: MarkdownAST, state?: MarkdownState) => JSX.Element | JSX.Element[];

export type MarkdownAST = MarkdownContent[] | MarkdownContent | string;
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

export type ImplicitParser = (source: string) => MarkdownAST;
export type ParseHelper = (parse: ImplicitParser, content: string, state: MarkdownState) => MarkdownAST;
export type Parser = (source: string, state: MarkdownState) => MarkdownAST;
export type RegExHelper = (regExp: RegExp) => (source: string, state: MarkdownState) => number[] | null;

export type MarkdownOutput = (ast: MarkdownAST, state: MarkdownState) => JSX.Element;
export interface MarkdownRules {
  [markdownElementKey: string]: {
    react: RuleFunction;
  };
}
export type RuleASTFunction = (ast: MarkdownAST, output: MarkdownOutput, state: MarkdownState) => JSX.Element | JSX.Element[];
export type RuleFunction = (node: MarkdownNode | MarkdownContent, output: MarkdownOutput, state: MarkdownState) => JSX.Element | JSX.Element[];

//
// EXPORTED FUNCTIONS
//

export const inlineRegex: RegExHelper;
export const blockRegex: RegExHelper;
export const anyScopeRegex: RegExHelper;
export const parseInline: ParseHelper;
export const parseBlock: ParseHelper;

export const defaultRawParse: ImplicitParser;
export const defaultBlockParse: ImplicitParser;
export const defaultInlineParse: ImplicitParser;
export const defaultImplicitParse: ImplicitParser;

export const defaultReactOutput: DefaultReactOutput;
export const defaultHtmlOutput: DefaultHtmlOutput;

export const preprocess: (source: string) => string;
export const sanitizeUrl: (url: string) => string;
export const unescapeUrl: (url: string) => string;

export const defaultParse: ImplicitParser;
export const outputFor: (outputFunction: RuleASTFunction) => DefaultReactOutput;
export const defaultOutput: DefaultReactOutput;

export const defaultRules: MarkdownRules;
export const reactFor: (outputFunction: RuleASTFunction) => DefaultReactOutput;
export const htmlFor: (outputFunction: RuleASTFunction) => DefaultHtmlOutput;
export const ruleOutput: (rules: MarkdownRules, property: string) => RuleASTFunction;
export const parserFor: (rules: MarkdownRules) => Parser;
