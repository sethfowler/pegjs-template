import PEG from 'pegjs';

/** Context functions and metadata which are available in all PEG.js actions. */
export type PEGActionContext = {
  /** The text matched by the current rule. */
  text(): string;

  /** The source range matched by the current rule. */
  location(): PEG.SourceLocation;

  /** Options passed to the parser. */
  options: Record<string, any>;
};

/**
 * A PEG.js semantic action.
 * @param context - Context functions and metadata; see
 * {@link PEGActionContext}.
 * @param labels - Any number of arguments corresponding to labels in the
 * grammar. The names must match the labels exactly.
 * @returns the result of the semantic action.
 */
export type PEGAction = (context: PEGActionContext, ...labels: any[]) => any;

/**
 * A template string tag function that generates a PEG.js grammar. All
 * interpolated expressions must be functions of type {@link PEGAction}.
 */
export function pegGrammar<T>(
  templateStrings: TemplateStringsArray,
  ...actions: PEGAction[]
): PEG.GeneratedParser<T> {
  type ActionData = {
    name: string;
    args: string[];
    contextArg: string;
  };

  const actionMap: { [name: string]: PEGAction } = {};
  const actionData: ActionData[] = [];
  actions.forEach((action: PEGAction, index:number) => {
    if (typeof action !== 'function') {
      throw new Error(`Interpolated expression must be a function: '${action}'.`);
    }

    // Concoct a name for this action so we can provide it to PEG.js via the
    // grammar context.
    const name = `action${index}`;
    actionMap[name] = action;

    // Parse the source code of the action and extract the function arguments.
    // We'll use the same arguments at the call site in the generated grammar.
    const actionSource = action.toString();
    const matchFunctionArgs = actionSource.match(/\(([^)]*)\)/);
    if (!matchFunctionArgs) {
      throw new Error(`Couldn't determine function arguments: '${actionSource}'.`);
    }
    const args = matchFunctionArgs[1].trim().split(',');
    const contextArg = args[0].trim();

    actionData.push({ name, args, contextArg });
  });

  const grammarComponents = [...templateStrings];
  let grammar = '';
  while (grammarComponents.length > 0) {
    grammar += grammarComponents.shift();

    if (actionData.length === 0) { continue; }
    const next = actionData.shift()!;

    if (next.contextArg === '') {
      // As a special case, don't bother constructing the context object if the
      // caller doesn't use it.
      grammar += `{
        return ${next.name}();
      }`;
    } else {
      grammar += `{
        const ${next.contextArg} = { text, location, options };
        return ${next.name}(${next.args.join(',')});
      }`;
    }
  }

  return PEG.generate(grammar, {
    output: 'parser',
    context: actionMap,
  }) as PEG.GeneratedParser<T>;
}
