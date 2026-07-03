import { vi, type Mock } from 'vitest';

/**
 * Minimal mock of the Drizzle query builder used by the API services.
 *
 * Drizzle queries are chainable *thenables*: `await db.select().from().where()`
 * resolves the built query. A plain `mockReturnThis()` object is not enough
 * because awaiting a non-thenable resolves to the object itself. Here every
 * chain method returns the chain, and the chain implements `.then()` resolving
 * to configurable rows.
 *
 * Each root call (`select` / `insert` / `update` / `delete`) consumes the next
 * result from a FIFO queue, so tests can script services that run several
 * queries in a row. When the queue is empty the chain resolves to `[]`.
 */

const CHAIN_METHODS = [
  'from',
  'where',
  'innerJoin',
  'leftJoin',
  'orderBy',
  'groupBy',
  'limit',
  'offset',
  'values',
  'set',
  'returning',
] as const;

type ChainMethod = (typeof CHAIN_METHODS)[number];

export type DbChain = PromiseLike<unknown[]> & Record<ChainMethod, Mock>;

export interface DbMock {
  db: {
    select: Mock;
    insert: Mock;
    update: Mock;
    delete: Mock;
    execute: Mock;
    /** Runs the callback against the same mock: queued results keep flowing. */
    transaction: Mock;
  };
  /** Root chains in creation order, to assert on `.values()`, `.set()`, etc. */
  chains: DbChain[];
  /** Queues rows for upcoming root queries, in execution order. */
  enqueue: (...rowSets: unknown[][]) => void;
}

function createChain(rows: unknown[]): DbChain {
  const chain: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (
    onFulfilled?: ((value: unknown[]) => unknown) | null,
    onRejected?: ((reason: unknown) => unknown) | null,
  ) => Promise.resolve(rows).then(onFulfilled, onRejected);
  return chain as DbChain;
}

/**
 * Builds a db mock. Results are consumed one per root query, in order:
 * `createDbMock([rowA], [rowB, rowC])` makes the first query resolve to
 * `[rowA]` and the second to `[rowB, rowC]`. Writes without `.returning()`
 * consume a slot too (pass `[]` as placeholder).
 */
export function createDbMock(...initialResults: unknown[][]): DbMock {
  const queue: unknown[][] = [...initialResults];
  const chains: DbChain[] = [];
  const root = () => {
    const chain = createChain(queue.shift() ?? []);
    chains.push(chain);
    return chain;
  };
  const db = {
    select: vi.fn(root),
    insert: vi.fn(root),
    update: vi.fn(root),
    delete: vi.fn(root),
    execute: vi.fn(() => Promise.resolve(undefined)),
    transaction: vi.fn(),
  };
  db.transaction.mockImplementation((fn: (tx: typeof db) => unknown) => Promise.resolve(fn(db)));
  return {
    db,
    chains,
    enqueue: (...rowSets: unknown[][]) => queue.push(...rowSets),
  };
}
