import { useState, useCallback } from 'react';
import { t, getLang, setLang, type Lang } from './translations';

export function useT() {
  const [lang, setLangState] = useState<Lang>(getLang);

  const tt = useCallback((key: string): string => {
    return t[lang][key] || key;
  }, [lang]);

  const switchLang = useCallback((l: Lang) => {
    setLang(l);
    setLangState(l);
  }, []);

  return { t: tt, lang, switchLang };
}
