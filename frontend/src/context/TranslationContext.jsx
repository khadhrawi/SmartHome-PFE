import { createContext, useContext, useState, useCallback, useRef } from 'react';

const TranslationContext = createContext();

const CACHE_KEY = 'smarthome_tx_cache';
const LANG_KEY  = 'smarthome_lang';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

async function translateText(text, target) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${target}`;
  const res  = await fetch(url);
  const data = await res.json();
  return data.responseData?.translatedText || text;
}

// Collect all visible text nodes under a root element
function getTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.tagName;
      if (['SCRIPT','STYLE','NOSCRIPT','IFRAME'].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (node.textContent.trim().length < 2) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

export const TranslationProvider = ({ children }) => {
  const [lang, setLang]       = useState(localStorage.getItem(LANG_KEY) || 'en');
  const [loading, setLoading] = useState(false);
  const originals = useRef(new Map()); // node → original text
  const cache     = useRef(loadCache());

  const applyLang = useCallback(async (target) => {
    const root = document.getElementById('root');
    if (!root) return;

    // Restore originals first
    originals.current.forEach((orig, node) => { node.textContent = orig; });

    if (target === 'en') {
      originals.current.clear();
      localStorage.setItem(LANG_KEY, 'en');
      setLang('en');
      return;
    }

    setLoading(true);

    const nodes   = getTextNodes(root);
    const texts   = nodes.map(n => n.textContent.trim());
    const cacheNS = cache.current[target] || {};

    // Find texts not yet cached
    const toTranslate = [...new Set(texts.filter(t => !cacheNS[t]))];

    // Batch into chunks of 40 joined by ' ||| '
    const SEP   = ' ||| ';
    const CHUNK = 40;
    for (let i = 0; i < toTranslate.length; i += CHUNK) {
      const slice   = toTranslate.slice(i, i + CHUNK);
      const joined  = slice.join(SEP);
      try {
        const result = await translateText(joined, target);
        const parts  = result.split(SEP);
        slice.forEach((orig, idx) => {
          cacheNS[orig] = parts[idx]?.trim() || orig;
        });
      } catch {}
    }

    cache.current[target] = cacheNS;
    saveCache(cache.current);

    // Apply translations and store originals
    originals.current.clear();
    nodes.forEach(node => {
      const orig = node.textContent.trim();
      const tx   = cacheNS[orig];
      if (tx && tx !== orig) {
        originals.current.set(node, node.textContent);
        node.textContent = node.textContent.replace(orig, tx);
      }
    });

    localStorage.setItem(LANG_KEY, target);
    setLang(target);
    setLoading(false);
  }, []);

  return (
    <TranslationContext.Provider value={{ lang, loading, applyLang }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => useContext(TranslationContext);
