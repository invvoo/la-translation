/** Comprehensive world language list used throughout the platform. */
export const ALL_LANGUAGES: string[] = [
  // A
  'Acholi', 'Afar', 'Afrikaans', 'Akan', 'Albanian', 'Amharic', 'Arabic', 'Aragonese',
  'Aramaic', 'Armenian', 'Aromanian', 'Assamese', 'Avar', 'Aymara', 'Azerbaijani',
  // B
  'Balochi', 'Bambara', 'Bashkir', 'Basque', 'Belarusian', 'Bengali', 'Bhojpuri',
  'Bosnian', 'Breton', 'Bulgarian', 'Burmese',
  // C
  'Cantonese', 'Catalan', 'Cebuano', 'Chechen', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Chuvash', 'Cornish', 'Corsican', 'Croatian', 'Czech',
  // D
  'Danish', 'Dari', 'Dinka', 'Dutch', 'Dzongkha',
  // E
  'English', 'Esperanto', 'Estonian', 'Ewe',
  // F
  'Faroese', 'Fijian', 'Finnish', 'Flemish', 'French', 'French Canadian', 'Frisian', 'Fulani',
  // G
  'Galician', 'Georgian', 'German', 'Greek', 'Guaraní', 'Gujarati',
  // H
  'Haitian Creole', 'Hausa', 'Hawaiian', 'Hebrew', 'Hindi', 'Hmong', 'Hungarian',
  // I
  'Icelandic', 'Igbo', 'Ilocano', 'Indonesian', 'Irish',
  // J
  'Japanese', 'Javanese',
  // K
  'Kannada', 'Kashmiri', 'Kazakh', 'Khmer', 'Kikuyu', 'Kinyarwanda', 'Korean',
  'Kurdish (Kurmanji)', 'Kurdish (Sorani)', 'Kyrgyz',
  // L
  'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luganda', 'Luxembourgish',
  // M
  'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Manipuri', 'Maori',
  'Marathi', 'Marshallese', 'Mizo', 'Mongolian',
  // N
  'Nahuatl', 'Ndebele', 'Nepali', 'Norwegian',
  // O
  'Oriya', 'Oromo', 'Ottoman Turkish',
  // P
  'Pashto', 'Persian (Farsi)', 'Polish', 'Portuguese', 'Portuguese (Brazilian)',
  'Punjabi',
  // Q
  'Quechua',
  // R
  'Romanian', 'Romansh', 'Russian',
  // S
  'Samoan', 'Sanskrit', 'Scottish Gaelic', 'Serbian', 'Sesotho', 'Shona', 'Sindhi',
  'Sinhalese', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Spanish (Latin American)',
  'Sundanese', 'Swahili', 'Swedish',
  // T
  'Tagalog', 'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai', 'Tibetan', 'Tigrinya',
  'Tongan', 'Tswana', 'Turkish', 'Turkmen', 'Twi',
  // U
  'Ukrainian', 'Urdu', 'Uyghur', 'Uzbek',
  // V
  'Vietnamese',
  // W
  'Welsh', 'Wolof',
  // X
  'Xhosa',
  // Y
  'Yiddish', 'Yoruba', 'Yucatec Maya',
  // Z
  'Zulu',
].sort()

/** Languages that commonly appear as source/target for LA-area translation_clients. */
export const COMMON_LANGUAGES: string[] = [
  'Arabic', 'Armenian', 'Bengali', 'Cantonese', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Dutch', 'English', 'Farsi', 'French', 'German', 'Greek', 'Gujarati', 'Hebrew', 'Hindi',
  'Indonesian', 'Italian', 'Japanese', 'Khmer', 'Korean', 'Portuguese', 'Punjabi', 'Romanian',
  'Russian', 'Spanish', 'Tagalog', 'Tamil', 'Thai', 'Turkish', 'Ukrainian', 'Urdu',
  'Vietnamese',
]


/** ALL_LANGUAGES with English sorted to the top, then the rest alphabetically. */
export const SORTED_LANGUAGES: string[] = [
  'English',
  ...ALL_LANGUAGES.filter((l) => l !== 'English'),
]
