import translate from '@vitalets/google-translate-api';

/**
 * Translate text from one language to another using Google Translate API.
 * @param {string} text - The text to translate.
 * @param {string} targetLang - The target language code (e.g., 'ur').
 * @returns {Promise<string>} - The translated text.
 */
export const translateText = async (text, targetLang) => {
  try {
    const result = await translate(text, { to: targetLang });
    return result.text; // Return the translated text
  } catch (error) {
    console.error('Translation error:', error.message || error);
    return text;
  }
};
