'use client';

export function MdToolbar({ tid, value, onChange }: { tid: string; value: string; onChange: (v: string) => void }) {
  const ins = (before: string, after: string, ph: string) => {
    const ta = document.getElementById(tid) as HTMLTextAreaElement;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.substring(s, e) || ph;
    onChange(value.substring(0, s) + before + sel + after + value.substring(e));
    setTimeout(() => { ta.focus(); const pos = s + before.length; ta.setSelectionRange(pos, pos + sel.length); }, 0);
  };
  const bc = 'px-2 py-1 font-mono text-[10px] border rounded transition hover:opacity-70 cursor-pointer';
  const bs = { color: 'var(--foreground)', borderColor: 'var(--border-color)' };
  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      <button type="button" className={bc} style={bs} onClick={() => ins('**','**','bold')}><strong>B</strong></button>
      <button type="button" className={bc} style={bs} onClick={() => ins('*','*','italic')}><em>I</em></button>
      <button type="button" className={bc} style={bs} onClick={() => ins('[','](url)','text')}>Link</button>
      <button type="button" className={bc} style={bs} onClick={() => ins('## ','','Heading')}>H2</button>
      <button type="button" className={bc} style={bs} onClick={() => ins('- ','','item')}>List</button>
      <button type="button" className={bc} style={bs} onClick={() => ins('> ','','quote')}>Quote</button>
    </div>
  );
}
