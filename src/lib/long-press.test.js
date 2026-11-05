import { describe, expect, it, vi } from 'vitest';
import { longPress } from './long-press';

const ev = (x = 0, y = 0) => ({ clientX: x, clientY: y });

describe('longPress', () => {
  it('holding fires onLong and the following click is swallowed', () => {
    vi.useFakeTimers();
    const onLong = vi.fn(); const onClick = vi.fn();
    const h = longPress({ onLong, onClick, ms: 450 });
    h.onPointerDown(ev()); vi.advanceTimersByTime(460); h.onPointerUp(); h.onClick();
    expect(onLong).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
  it('a quick tap is a normal click', () => {
    vi.useFakeTimers();
    const onLong = vi.fn(); const onClick = vi.fn();
    const h = longPress({ onLong, onClick, ms: 450 });
    h.onPointerDown(ev()); vi.advanceTimersByTime(100); h.onPointerUp(); h.onClick();
    expect(onLong).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
  it('scrolling (moving the finger) cancels the long press', () => {
    vi.useFakeTimers();
    const onLong = vi.fn();
    const h = longPress({ onLong, onClick: () => {}, ms: 450 });
    h.onPointerDown(ev(0, 0)); h.onPointerMove(ev(0, 30)); vi.advanceTimersByTime(500);
    expect(onLong).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
