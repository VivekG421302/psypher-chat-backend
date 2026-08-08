// Simple, concrete, drawable nouns — kept free of proper nouns, brands,
// and anything that could be awkward or offensive to see prompted mid-chat.
export const WORDS = [
  'apple', 'banana', 'guitar', 'rocket', 'castle', 'dragon', 'bicycle', 'umbrella',
  'penguin', 'volcano', 'sandwich', 'robot', 'octopus', 'pyramid', 'balloon', 'campfire',
  'lighthouse', 'skateboard', 'butterfly', 'snowman', 'telescope', 'waterfall', 'cactus',
  'anchor', 'compass', 'dinosaur', 'jellyfish', 'kite', 'ladder', 'mushroom', 'necklace',
  'owl', 'paintbrush', 'quilt', 'rainbow', 'saxophone', 'tent', 'unicorn', 'violin',
  'windmill', 'xylophone', 'yoyo', 'zebra', 'astronaut', 'beehive', 'campervan', 'drum',
  'elephant', 'flashlight', 'globe', 'helicopter', 'igloo', 'jackfruit', 'kangaroo',
  'lantern', 'mermaid', 'notebook', 'octagon', 'pancake', 'quiver', 'raccoon',
  'scarecrow', 'treehouse', 'submarine', 'trophy', 'vulture', 'wheelbarrow', 'accordion',
  'backpack', 'cauldron', 'domino', 'eyeglasses', 'fireworks', 'gondola', 'hammock',
  'iceberg', 'jetpack', 'koala', 'lava', 'magnet', 'nest', 'oasis', 'parachute',
  'quicksand', 'raft', 'seahorse', 'toaster', 'urn', 'vineyard', 'wizard', 'xerox',
  'yacht', 'zeppelin', 'anteater', 'blender', 'chessboard', 'dumbbell', 'earmuffs',
  'ferris wheel', 'grasshopper', 'hourglass', 'igloo pit', 'jigsaw puzzle', 'kettle',
  'lawnmower', 'microscope', 'noodle', 'origami', 'periscope', 'quill', 'rollerblade',
  'snorkel', 'trampoline', 'unicycle', 'vending machine', 'wristwatch', 'x-ray',
  'yarn ball', 'zipline', 'avocado', 'broomstick', 'chandelier', 'drawbridge',
  'escalator', 'fountain', 'gargoyle', 'harpoon', 'inflatable pool', 'jukebox',
  'kayak', 'lava lamp', 'moth', 'nutcracker', 'observatory', 'pinwheel', 'quokka',
  'rocking chair', 'satellite', 'typewriter', 'usb drive', 'volleyball', 'wheelchair',
  'xylograph', 'yodeler', 'ziggurat', 'anvil', 'bulldozer', 'crossbow', 'dartboard',
];

export function pickWords(count, excludeSet = new Set()) {
  const pool = WORDS.filter((w) => !excludeSet.has(w));
  const source = pool.length >= count ? pool : WORDS; // refill if we've exhausted the bank
  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
