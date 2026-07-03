import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins independent classes', () => {
    expect(cn('px-2', 'text-sm')).toBe('px-2 text-sm');
  });

  it('resolves Tailwind conflicts in favour of the last class', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-status-amber', 'bg-status-green')).toBe('bg-status-green');
  });

  it('keeps non-conflicting utilities of the same family', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('ignores falsy values', () => {
    expect(cn('a', false, null, undefined, '', 0, 'b')).toBe('a b');
    expect(cn()).toBe('');
  });

  it('accepts conditional objects and nested arrays (clsx passthrough)', () => {
    expect(cn({ hidden: false, block: true }, ['mt-1', ['mb-2']])).toBe('block mt-1 mb-2');
    const active = false;
    expect(cn('base', active && 'active')).toBe('base');
  });
});
