/**
 * Typings are current as of simple-markdown 0.3.1.
 */

//
// INTERFACES & TYPES
//

// FIXME
export type Capture = any;

export type Attr = string | number | boolean;

export interface SingleASTNode {
    type: string,
    [prop: string]: any,
};

export interface UnTypedASTNode {
    [prop: string]: any
};

export type ASTNode = SingleASTNode | Array<SingleASTNode>;

export type State = {[prop: string]: any};

export type ReactElement = React.ReactElement<any>;
export type ReactElements = React.ReactNode;

export type MatchFunction = (
    source: string,
    state: State,
    prevCapture: string
) => Capture | null;

export type Parser = (
    source: string,
    state?: State | null | undefined,
) => Array<SingleASTNode>;

export type ParseFunction = (
    capture: Capture,
    nestedParse: Parser,
    state: State,
) => (UnTypedASTNode | ASTNode);

export type SingleNodeParseFunction = (
    capture: Capture,
    nestedParse: Parser,
    state: State,
) => UnTypedASTNode;

export type Output<Result> = (
    node: ASTNode,
    state?: State | null | undefined
) => Result;

export type NodeOutput<Result> = (
    node: SingleASTNode,
    nestedOutput: Output<Result>,
    state: State
) => Result;

export type ArrayNodeOutput<Result> = (
    node: Array<SingleASTNode>,
    nestedOutput: Output<Result>,
    state: State
) => Result;

export type ReactOutput = Output<ReactElements>;
export type ReactNodeOutput = NodeOutput<ReactElements>;
export type HtmlOutput = Output<string>;
export type HtmlNodeOutput = NodeOutput<string>;

export interface ParserRule {
    readonly order: number,
    readonly match: MatchFunction,
    readonly quality?: (capture: Capture, state: State, prevCapture: string) => number,
    readonly parse: ParseFunction,
};

export interface SingleNodeParserRule {
    readonly order: number,
    readonly match: MatchFunction,
    readonly quality?: (capture: Capture, state: State, prevCapture: string) => number,
    readonly parse: SingleNodeParseFunction,
};

export interface ReactOutputRule {
    // we allow null because some rules are never output results, and that's
    // legal as long as no parsers return an AST node matching that rule.
    // We don't use ? because this makes it be explicitly defined as either
    // a valid function or null, so it can't be forgotten.
    readonly react: ReactNodeOutput | null,
};

export interface HtmlOutputRule = {
    readonly html: HtmlNodeOutput | null,
};

export interface ArrayRule {
    readonly react?: ArrayNodeOutput<ReactElements>,
    readonly html?: ArrayNodeOutput<string>,
    readonly [string]: ArrayNodeOutput<any>,
};

export interface ParserRules {
    readonly Array?: ArrayRule,
    readonly [type: string]: ParserRule,
};

export interface OutputRules<Rule> {
    readonly Array?: ArrayRule,
    readonly [type: string]: Rule
};
export interface Rules<OutputRule> {
    readonly Array?: ArrayRule,
    readonly [type: string]: ParserRule & OutputRule,
};
export interface ReactRules {
    readonly Array?: {
        readonly react: ArrayNodeOutput<ReactElements>,
    },
    readonly [type: string]: ParserRule & ReactOutputRule,
};
export interface HtmlRules {
    readonly Array?: {
        readonly html: ArrayNodeOutput<string>,
    },
    readonly [type: string]: ParserRule & HtmlOutputRule,
};

// We want to clarify our defaultRules types a little bit more so clients can
// reuse defaultRules built-ins. So we make some stronger guarantess when
// we can:
export interface NonNullReactOutputRule = {
    readonly react: ReactNodeOutput,
};
export interface ElementReactOutputRule = {
    readonly react: NodeOutput<ReactElement>,
};
export interface TextReactOutputRule = {
    readonly react: NodeOutput<string>,
};
export interface NonNullHtmlOutputRule = {
    readonly html: HtmlNodeOutput,
};

export type DefaultInRule = SingleNodeParserRule & ReactOutputRule & HtmlOutputRule;
export type TextInOutRule = SingleNodeParserRule & TextReactOutputRule & NonNullHtmlOutputRule;
export type LenientInOutRule = SingleNodeParserRule & NonNullReactOutputRule & NonNullHtmlOutputRule;
export type DefaultInOutRule = SingleNodeParserRule & ElementReactOutputRule & NonNullHtmlOutputRule;

export interface DefaultRules = {
    readonly Array: {
        readonly react: ArrayNodeOutput<ReactElements>,
        readonly html: ArrayNodeOutput<string>
    },
    readonly heading: DefaultInOutRule,
    readonly nptable: DefaultInRule,
    readonly lheading: DefaultInRule,
    readonly hr: DefaultInOutRule,
    readonly codeBlock: DefaultInOutRule,
    readonly fence: DefaultInRule,
    readonly blockQuote: DefaultInOutRule,
    readonly list: DefaultInOutRule,
    readonly def: LenientInOutRule,
    readonly table: DefaultInOutRule,
    readonly newline: TextInOutRule,
    readonly paragraph: DefaultInOutRule,
    readonly escape: DefaultInRule,
    readonly autolink: DefaultInRule,
    readonly mailto: DefaultInRule,
    readonly url: DefaultInRule,
    readonly link: DefaultInOutRule,
    readonly image: DefaultInOutRule,
    readonly reflink: DefaultInRule,
    readonly refimage: DefaultInRule,
    readonly em: DefaultInOutRule,
    readonly strong: DefaultInOutRule,
    readonly u: DefaultInOutRule,
    readonly del: DefaultInOutRule,
    readonly inlineCode: DefaultInOutRule,
    readonly br: DefaultInOutRule,
    readonly text: TextInOutRule,
};

export interface RefNode {
    type: string,
    content?: ASTNode,
    target?: string,
    title?: string,
};


