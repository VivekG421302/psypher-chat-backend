/**
 * Guess Who — shared character deck.
 *
 * Every character is fully public (both players can see every card's traits
 * at all times). The only hidden information is *which* character each
 * player was secretly assigned — that's what the opponent is trying to
 * deduce through yes/no questions.
 *
 * IMPORTANT: this file is intentionally mirrored on the frontend
 * (src/games/guesswho/characters.js) so both sides render/reason about the
 * exact same 20 characters and trait vocabulary without a network round
 * trip. If you change this file, update the frontend copy too.
 */

export const TRAITS = [
  {
    key: 'gender',
    type: 'categorical',
    label: 'Gender',
    values: ['male', 'female'],
    question: (v) => `Is your character ${v}?`,
  },
  {
    key: 'hairColor',
    type: 'categorical',
    label: 'Hair color',
    values: ['black', 'brown', 'blonde', 'red', 'gray'],
    question: (v) => `Does your character have ${v} hair?`,
  },
  {
    key: 'hairLength',
    type: 'categorical',
    label: 'Hair length',
    values: ['short', 'long', 'bald'],
    question: (v) => (v === 'bald' ? 'Is your character bald?' : `Does your character have ${v} hair?`),
  },
  {
    key: 'wearingHat',
    type: 'boolean',
    label: 'Hat',
    question: () => 'Is your character wearing a hat?',
  },
  {
    key: 'wearingGlasses',
    type: 'boolean',
    label: 'Glasses',
    question: () => 'Is your character wearing glasses?',
  },
  {
    key: 'hasFacialHair',
    type: 'boolean',
    label: 'Facial hair',
    question: () => 'Does your character have facial hair?',
  },
  {
    key: 'smiling',
    type: 'boolean',
    label: 'Smiling',
    question: () => 'Is your character smiling?',
  },
  {
    key: 'earrings',
    type: 'boolean',
    label: 'Earrings',
    question: () => 'Is your character wearing earrings?',
  },
];

export const TRAIT_MAP = new Map(TRAITS.map((t) => [t.key, t]));

export const CHARACTERS = [
  { id: 1, name: 'Ava', gender: 'female', hairColor: 'brown', hairLength: 'long', wearingHat: false, wearingGlasses: false, hasFacialHair: false, smiling: true, earrings: true, skinTone: 'light' },
  { id: 2, name: 'Liam', gender: 'male', hairColor: 'black', hairLength: 'short', wearingHat: false, wearingGlasses: true, hasFacialHair: false, smiling: true, earrings: false, skinTone: 'medium' },
  { id: 3, name: 'Zoe', gender: 'female', hairColor: 'blonde', hairLength: 'long', wearingHat: true, wearingGlasses: false, hasFacialHair: false, smiling: false, earrings: true, skinTone: 'light' },
  { id: 4, name: 'Noah', gender: 'male', hairColor: 'brown', hairLength: 'short', wearingHat: false, wearingGlasses: false, hasFacialHair: true, smiling: true, earrings: false, skinTone: 'dark' },
  { id: 5, name: 'Mia', gender: 'female', hairColor: 'red', hairLength: 'short', wearingHat: false, wearingGlasses: true, hasFacialHair: false, smiling: true, earrings: false, skinTone: 'light' },
  { id: 6, name: 'Ethan', gender: 'male', hairColor: 'blonde', hairLength: 'short', wearingHat: true, wearingGlasses: false, hasFacialHair: false, smiling: false, earrings: false, skinTone: 'medium' },
  { id: 7, name: 'Ivy', gender: 'female', hairColor: 'black', hairLength: 'long', wearingHat: false, wearingGlasses: false, hasFacialHair: false, smiling: true, earrings: true, skinTone: 'dark' },
  { id: 8, name: 'Leo', gender: 'male', hairColor: 'gray', hairLength: 'bald', wearingHat: false, wearingGlasses: true, hasFacialHair: true, smiling: true, earrings: false, skinTone: 'light' },
  { id: 9, name: 'Nora', gender: 'female', hairColor: 'brown', hairLength: 'short', wearingHat: true, wearingGlasses: true, hasFacialHair: false, smiling: false, earrings: false, skinTone: 'medium' },
  { id: 10, name: 'Kai', gender: 'male', hairColor: 'black', hairLength: 'long', wearingHat: false, wearingGlasses: false, hasFacialHair: false, smiling: true, earrings: true, skinTone: 'dark' },
  { id: 11, name: 'Ruby', gender: 'female', hairColor: 'red', hairLength: 'long', wearingHat: false, wearingGlasses: false, hasFacialHair: false, smiling: true, earrings: false, skinTone: 'light' },
  { id: 12, name: 'Finn', gender: 'male', hairColor: 'red', hairLength: 'short', wearingHat: false, wearingGlasses: false, hasFacialHair: true, smiling: false, earrings: false, skinTone: 'light' },
  { id: 13, name: 'Luna', gender: 'female', hairColor: 'gray', hairLength: 'long', wearingHat: false, wearingGlasses: true, hasFacialHair: false, smiling: true, earrings: true, skinTone: 'medium' },
  { id: 14, name: 'Omar', gender: 'male', hairColor: 'black', hairLength: 'short', wearingHat: true, wearingGlasses: false, hasFacialHair: true, smiling: true, earrings: false, skinTone: 'dark' },
  { id: 15, name: 'Sage', gender: 'female', hairColor: 'blonde', hairLength: 'short', wearingHat: false, wearingGlasses: false, hasFacialHair: false, smiling: false, earrings: false, skinTone: 'medium' },
  { id: 16, name: 'Theo', gender: 'male', hairColor: 'brown', hairLength: 'bald', wearingHat: false, wearingGlasses: true, hasFacialHair: false, smiling: true, earrings: false, skinTone: 'light' },
  { id: 17, name: 'Elena', gender: 'female', hairColor: 'black', hairLength: 'long', wearingHat: true, wearingGlasses: false, hasFacialHair: false, smiling: true, earrings: true, skinTone: 'dark' },
  { id: 18, name: 'Max', gender: 'male', hairColor: 'gray', hairLength: 'short', wearingHat: false, wearingGlasses: false, hasFacialHair: true, smiling: false, earrings: false, skinTone: 'medium' },
  { id: 19, name: 'Priya', gender: 'female', hairColor: 'black', hairLength: 'short', wearingHat: false, wearingGlasses: true, hasFacialHair: false, smiling: true, earrings: true, skinTone: 'dark' },
  { id: 20, name: 'Jonah', gender: 'male', hairColor: 'blonde', hairLength: 'long', wearingHat: false, wearingGlasses: false, hasFacialHair: false, smiling: true, earrings: false, skinTone: 'light' },
];

export const CHARACTER_MAP = new Map(CHARACTERS.map((c) => [c.id, c]));

export function evaluateTrait(character, traitKey, value) {
  if (!character) return false;
  return character[traitKey] === value;
}
