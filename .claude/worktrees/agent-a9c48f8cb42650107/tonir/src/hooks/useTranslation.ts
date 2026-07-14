import { useStore } from '../store';
import { I18N, I18NValue } from '../i18n';

export function useTranslation() {
  const { language } = useStore();

  /** Return a string value for the given key (falls back to 'hy', then the key itself). */
  const tr = (key: string): string => {
    const dict = I18N[language] ?? I18N.hy;
    const v = (dict[key] ?? I18N.hy[key]) as I18NValue | undefined;
    if (v === undefined) return key;
    return Array.isArray(v) ? (v[0] ?? key) : v;
  };

  /** Return a string[] value for the given key. */
  const tra = (key: string): string[] => {
    const dict = I18N[language] ?? I18N.hy;
    const v = (dict[key] ?? I18N.hy[key]) as I18NValue | undefined;
    if (v === undefined) return [key];
    return Array.isArray(v) ? v : [v];
  };

  /** Return a string value with {placeholder} tokens replaced. */
  const trf = (key: string, vars: Record<string, string | number>): string => {
    let s = tr(key);
    for (const [k, val] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(val));
    }
    return s;
  };

  return { tr, tra, trf, language };
}
