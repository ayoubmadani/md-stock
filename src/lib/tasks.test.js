import { describe, expect, it } from 'vitest';
import { dueState, forDay, localNowTime, quickDays, splitTasks, swipeCommits } from './tasks';

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
  it('a task due today whose hour has passed is overdue', () => {
    expect(dueState({ dueDate: today, dueTime: '09:00' }, today, '10:30')).toBe('overdue');
    expect(dueState({ dueDate: today, dueTime: '18:00' }, today, '10:30')).toBe('today');
    expect(dueState({ dueDate: today }, today, '23:59')).toBe('today');
  });
  it('quick days: the next 7 days, the first three named relatively', () => {
    const d = quickDays(today);
    expect(d).toHaveLength(7);
    expect(d.map((x) => x.date)).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(d.map((x) => x.rel)).toEqual(['today', 'tomorrow', 'after_tomorrow', null, null, null, null]);
  });
  it('a swipe commits past 80px either way (RTL or LTR)', () => {
    expect(swipeCommits(30)).toBe(false);
    expect(swipeCommits(-79)).toBe(false);
    expect(swipeCommits(85)).toBe(true);
    expect(swipeCommits(-120)).toBe(true);
  });
  it('local time HH:MM', () => {
    expect(localNowTime(new Date(2026, 9, 27, 7, 5))).toBe('07:05');
  });
  it('day filter: only tasks due that day; no day = all', () => {
    const l = [{ id: 1, dueDate: '2026-10-27' }, { id: 2, dueDate: '2026-10-28' }, { id: 3, dueDate: null }];
    expect(forDay(l, '2026-10-28').map((x) => x.id)).toEqual([2]);
    expect(forDay(l, null)).toHaveLength(3);
  });
  it('"other" filter: tasks outside the 7 quick days (no date, overdue, later)', () => {
    const l = [{ id: 1, dueDate: '2026-10-27' }, { id: 2, dueDate: '2026-11-20' }, { id: 3, dueDate: null }, { id: 4, dueDate: '2026-10-20' }];
    expect(forDay(l, 'other', quickDays(today)).map((x) => x.id)).toEqual([2, 3, 4]);
  });
});
