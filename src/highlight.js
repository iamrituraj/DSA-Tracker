// Lightweight dependency-free Java/C# syntax highlighter shared by the solutions viewer and the LLD lab.
export const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KEYWORDS_SHARED = "abstract as assert async await base break case catch checked class const continue default delegate do else enum event explicit extends final finally fixed for foreach goto if implements import in instanceof interface internal is lock namespace native new out override package params partial private protected public readonly record ref return sealed sizeof stackalloc static strictfp struct super switch synchronized this throw throws transient try typeof unchecked unsafe using value virtual void volatile when where while with yield true false null";
const KEYWORDS_JAVA = `${KEYWORDS_SHARED} boolean byte char double float int long var short permits non-sealed`;
const KEYWORDS_CSHARP = `${KEYWORDS_SHARED} bool decimal dynamic float get init int long object sbyte set short string uint ulong ushort var nint nuint required file scoped global`;
export function highlightCode(code, lang) {
  const kw = new Set((lang === "csharp" ? KEYWORDS_CSHARP : KEYWORDS_JAVA).split(" "));
  const lines = [[]];
  const push = (cls, text) => {
    const parts = String(text).split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push(cls ? `<span class="${cls}">${escHtml(part)}</span>` : escHtml(part));
    });
  };
  const re = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|@[A-Za-z_]\w*|\d[\w.]*|[A-Za-z_$][\w$]*|\s+|[\s\S]/g;
  let m;
  while ((m = re.exec(code || "")) !== null) {
    const t = m[0];
    let cls = null;
    if (t.startsWith("//") || t.startsWith("/*")) cls = "tok-com";
    else if (t[0] === '"' || t[0] === "'") cls = "tok-str";
    else if (t[0] === "@") cls = "tok-ann";
    else if (/^\d/.test(t)) cls = "tok-num";
    else if (kw.has(t)) cls = "tok-key";
    else if (/^[A-Z]/.test(t)) cls = "tok-type";
    push(cls, t);
  }
  const out = lines.map(l => l.join(""));
  while (out.length > 1 && out[out.length - 1] === "") out.pop();
  return out;
}
