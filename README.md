# pegjs-template
Build [PEG.js](https://pegjs.org) grammars using template strings.

# Usage

Use the `pegGrammar` function exported by this library as a template tag
function and interpolate your semantic actions in as functions. If you're using
the library from TypeScript, you'll need to provide a type parameter for
`pegGrammar`; this is the type of the AST that your parser returns.

Semantic action functions must have this type:

```ts
type PEGAction = (context: PEGActionContext, ...labels: any[]) => any;
```

The first argument to your semantic action will be a `PEGActionContext` object
containing the standard PEG.js helpers:

```ts
export type PEGActionContext = {
  text(): string;
  location(): PEG.SourceLocation;
  options: Record<string, any>;
};
```

The remaining arguments are the semantic values for the labeled expressions in
the current rule. Note that, while the context argument can be named anything,
the label argument names must match the label names in the grammar exactly!

One more limitation to be aware of: this library parses the argument list of the
semantic action functions using a simple regular expression. Don't try to get
fancy with destructuring or rest parameters in the argument list; they won't
work the way you expect.

An example's worth a thousand words, so here's the arithmetic grammar example
from the PEG.js docs, rewritten to use this library:

```ts
import { pegGrammar } from 'pegjs-template';

const parser = pegGrammar<number>`
// Simple Arithmetics Grammar
// ==========================
//
// Accepts expressions like "2 * (3 + 4)" and computes their value.

Expression
  = head:Term tail:(_ ("+" / "-") _ Term)* ${(_, head, tail) => {
      return tail.reduce(function(result, element) {
        if (element[1] === "+") { return result + element[3]; }
        if (element[1] === "-") { return result - element[3]; }
      }, head);
    }}

Term
  = head:Factor tail:(_ ("*" / "/") _ Factor)* ${(_, head, tail) => {
      return tail.reduce(function(result, element) {
        if (element[1] === "*") { return result * element[3]; }
        if (element[1] === "/") { return result / element[3]; }
      }, head);
    }}

Factor
  = "(" _ expr:Expression _ ")" ${(_, expr) => expr}
  / Integer

Integer "integer"
  = _ [0-9]+ ${(ctx) => parseInt(ctx.text(), 10)}

_ "whitespace"
  = [ \t\n\r]*
`;

parser.parse('2 * (3 + 4)');  // Returns '14'.
