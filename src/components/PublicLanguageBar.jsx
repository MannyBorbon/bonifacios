const CODES = ['es', 'en', 'fr', 'zh']

/**
 * Same language toggle pattern as Home: ES / EN / FR / ZH.
 * Persists to localStorage so public reservation pages stay consistent.
 */
export default function PublicLanguageBar({ value, onChange, className = '' }) {
  const lang = CODES.includes(value) ? value : 'es'
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {CODES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`rounded-lg border px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors ${
            lang === code
              ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
              : 'border-[#D4AF37]/20 text-[#D4AF37]/60 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]/80'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}

export const PUBLIC_LANG_KEY = 'bonifacios_public_lang'

export function readStoredPublicLang() {
  try {
    const raw = localStorage.getItem(PUBLIC_LANG_KEY)
    if (raw && CODES.includes(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'es'
}

export function writeStoredPublicLang(code) {
  if (!CODES.includes(code)) return
  try {
    localStorage.setItem(PUBLIC_LANG_KEY, code)
  } catch {
    /* ignore */
  }
}
