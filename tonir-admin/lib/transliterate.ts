const MAP: Record<string, string> = {
  // Armenian uppercase
  'Ա': 'a', 'Բ': 'b', 'Գ': 'g', 'Դ': 'd', 'Ե': 'e', 'Զ': 'z',
  'Է': 'e', 'Ը': 'e', 'Թ': 't', 'Ժ': 'zh', 'Ի': 'i', 'Լ': 'l',
  'Խ': 'kh', 'Ծ': 'ts', 'Կ': 'k', 'Հ': 'h', 'Ձ': 'dz', 'Ղ': 'gh',
  'Ճ': 'ch', 'Մ': 'm', 'Յ': 'y', 'Ն': 'n', 'Շ': 'sh', 'Ո': 'o',
  'Չ': 'ch', 'Պ': 'p', 'Ջ': 'j', 'Ռ': 'r', 'Ս': 's', 'Վ': 'v',
  'Տ': 't', 'Ր': 'r', 'Ց': 'ts', 'Փ': 'p', 'Ք': 'k', 'Օ': 'o', 'Ֆ': 'f',
  // Armenian lowercase
  'ա': 'a', 'բ': 'b', 'գ': 'g', 'դ': 'd', 'ե': 'e', 'զ': 'z',
  'է': 'e', 'ը': 'e', 'թ': 't', 'ժ': 'zh', 'ի': 'i', 'լ': 'l',
  'խ': 'kh', 'ծ': 'ts', 'կ': 'k', 'հ': 'h', 'ձ': 'dz', 'ղ': 'gh',
  'ճ': 'ch', 'մ': 'm', 'յ': 'y', 'ն': 'n', 'շ': 'sh', 'ո': 'o',
  'չ': 'ch', 'պ': 'p', 'ջ': 'j', 'ռ': 'r', 'ս': 's', 'վ': 'v',
  'տ': 't', 'ր': 'r', 'ց': 'ts', 'փ': 'p', 'ք': 'k', 'օ': 'o', 'փ': 'f',
  'ու': 'u', 'ՈՒ': 'u', 'Ու': 'u',
  // Cyrillic uppercase
  'А': 'a', 'Б': 'b', 'В': 'v', 'Г': 'g', 'Д': 'd', 'Е': 'e', 'Ё': 'yo',
  'Ж': 'zh', 'З': 'z', 'И': 'i', 'Й': 'y', 'К': 'k', 'Л': 'l', 'М': 'm',
  'Н': 'n', 'О': 'o', 'П': 'p', 'Р': 'r', 'С': 's', 'Т': 't', 'У': 'u',
  'Ф': 'f', 'Х': 'kh', 'Ц': 'ts', 'Ч': 'ch', 'Ш': 'sh', 'Щ': 'shch',
  'Ъ': '', 'Ы': 'y', 'Ь': '', 'Э': 'e', 'Ю': 'yu', 'Я': 'ya',
  // Cyrillic lowercase
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

/**
 * Converts Armenian and Cyrillic characters to their Latin equivalents.
 * Latin characters pass through unchanged (lowercased).
 */
export function transliterate(text: string): string {
  // Handle digraphs first (ու)
  let result = text.replace(/ՈՒ|Ու|ու/g, 'u');
  let out = '';
  for (const ch of result) {
    out += MAP[ch] ?? ch.toLowerCase();
  }
  return out;
}
