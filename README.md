# pegjs-template
Build [PEG.js](https://pegjs.org) grammars using template strings.

PEG.js grammars are normally just strings; semantic actions are specified using
JavaScript embedded in the string. This library allows you to write semantic
actions using real JavaScript functions. This has several advantages:
- Syntax highlighting works.
- Code completion and other code intelligence features work.
- Semantic actions can be written in TypeScript, allowing them to be type
  checked.
- Semantic actions can easily reference variables or APIs defined outside the
  grammar, without any awkward workarounds like passing them in via the context.

In addition, `pegjs-template` allows you to write partial grammars. These are
small grammars that can be merged together to make a complete grammar. This
allows you to make your grammars modular and factor out shared code so that it
can be reused in multiple grammars.

`pegjs-template` is a better way to write PEG.js grammars!

# Basic usage

Use the `pegGrammar` function exported by this library as a template tag
function and interpolate your semantic actions in as functions. If you're using
the library from TypeScript, you'll need to provide a type parameter for
`pegGrammar`; this is the type of the AST that your parser returns.

Semantic action functions must have this type:

```ts
type Action = (context: ActionContext, ...labels: any[]) => any;
```

The first argument to your semantic action will be an `ActionContext` object
containing the standard PEG.js helpers:

```ts
export type PEGActionContext = {
  /** @returns the text matched by the current rule. */
  text(): string;

  /** @returns the source range matched by the current rule. */
  location(): SourceLocation;

  /** Throw an exception indicating that 'expected' was expected but not found. */
  expected(expected: string, location?: SourceLocation): never;

  /** Throw an exception with the error message 'message'. */
  error(message: string, location?: SourceLocation): never;

  /** Options passed to the parser. */
  options: Record<string, any>;
};
```

The remaining arguments are the semantic values for the labeled expressions in
the current rule. Note that, while the context argument can be named anything,
the label argument names must match the label names in the grammar exactly!

One limitation to be aware of: this library parses the argument list of your
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
```

# Partial grammars

You can create a partial grammar using the `pegPartialGrammar` function exported
by this library. It's also a template tag function that works just like
`pegGrammar`, except that instead of returning a parser it returns a
`PartialGrammar` object.

You can interpolate `PartialGrammar` objects into other grammars using either
`pegGrammar` or `pegPartialGrammar`. The result is just like you interpolated
the source code into the grammar as text, except that any semantic action
functions you defined in JavaScript come along for the ride. This makes it easy
to combine smaller grammars into larger grammars while retaining all the
benefits of defining your semantic actions in JavaScript.

# Generate options

`pegGrammar` automatically calls PEG.js's `generate()` function for you to
generate a parser from your grammar. This means that you can't provide options
to `generate()` in the usual way. Normally the defaults are fine, but if you do
need to provide options - for example, to enable tracing - you can use
`pegGenerateOptions()`. This function accepts the same options argument that
`generate()` does. It returns a `GenerateOptions` object that you can
interpolate into your grammar using `pegGrammar` or `pegPartialGrammar`. This
doesn't change the grammar source code itself, but the options will be
recognized and passed to `generate()` as you'd expect.

There is one limitation: you can only interpolate one `GenerateOptions` object
into your grammar. `pegGrammar` will throw an exception if you try to include
more than one.
