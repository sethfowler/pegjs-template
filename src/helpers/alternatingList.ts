/**
 * An Iterable that alternates between a list of Iterables, yielding a value
 * from each one in turn, until all iterables in the list are exhausted.
 * The alternation order is the same as the order in which the Iterables
 * are passed to the constructor.
 */
export class AlternatingList<T> {
  constructor(private readonly _alternators: Iterable<T>[]) {
  }

  *[Symbol.iterator](): IterableIterator<T> {
    const iterators = this._alternators.map(a => a[Symbol.iterator]());
    let allDone;
    do {
      allDone = true;
      for (const iterator of iterators) {
        const { value, done } = iterator.next();
        allDone = allDone && !!done;
        if (done) { continue; }
        yield value;
      }
    } while (!allDone);
  }
}
