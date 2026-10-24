// صوت «كاتشينغ» عملة لطلب جديد — يُولَّد بالكود (بلا ملف صوت)
let ctx;

export function playCoin() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    // نغمتان سريعتان صاعدتان (B5 ← E6) مع رنين قصير
    [[988, 0, 0.09], [1319, 0.08, 0.5]].forEach(([freq, start, len]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + len + 0.02);
    });
  } catch { /* المتصفح منع الصوت قبل أي تفاعل — لا شيء */ }
}

// المتصفح يسمح بالصوت فقط بعد لمسة من المستخدم: نُجهّز الصوت عند أول لمسة
export function unlockAudio() {
  const unlock = () => {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch { /* */ }
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
}
