// شارة مصدر الطلب (فيسبوك، تيك توك، غوغل…) — التلميح يعرض الحملة والإعلان
const META = {
  facebook: ['FB', '#1877F2'], instagram: ['IG', '#E1306C'], tiktok: ['TT', '#111111'], google: ['G', '#EA4335'],
  youtube: ['YT', '#FF0000'], snapchat: ['SC', '#E6C200'], whatsapp: ['WA', '#25D366'], bing: ['B', '#008373'],
  twitter: ['X', '#111111'], direct: ['↗', '#64748B'], other: ['•', '#94A3B8'],
};

export function SourceBadge({ source }) {
  if (!source?.channel) return null;
  const [short, color] = META[source.channel] ?? META.other;
  const tip = [source.channel, source.campaign, source.content, source.ref].filter(Boolean).join(' · ');
  return <span title={tip} className="shrink-0 px-1.5 rounded text-[10px] font-black text-white" style={{ backgroundColor: color }}>{short}</span>;
}
