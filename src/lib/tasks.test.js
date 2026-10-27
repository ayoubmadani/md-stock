import { describe, expect, it } from 'vitest';
import { dueState, splitTasks } from './tasks';

describe('store to-do', () => {
  const today = '2026-10-27';
  it('due state: overdue / today / tomorrow / later / none (done tasks are never overdue)', () => {
    expect(dueState({ dueDate: '2026-10-26' }, today)).toBe('overdue');
    expect(dueState({ dueDate: '2026-10-27' }, today)).toBe('today');
    expect(dueState({ dueDate: '2026-10-28' }, today)).toBe('tomorrow');
    expect(dueState({ dueDate: '2026-11-05' }, today)).toBe('later');
    expect(dueState({ dueDate: null }, today)).toBe('none');
    expect(dueState({ dueDate: '2026-10-01', done: true }, today)).toBe('none');
  });
  it('open tasks first (as the server sorted them), done ones apart', () => {
    const { open, done } = splitTasks([{ id: 1, done: false }, { id: 2, done: true }, { id: 3, done: false }]);
    expect(open.map((x) => x.id)).toEqual([1, 3]);
    expect(done.map((x) => x.id)).toEqual([2]);
  });
});
