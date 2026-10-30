/**
 * NomNoms Baby Tales: everything the story generator can draw from.
 * Simple, repetitive, read-aloud stories for ages 0–3 are built from four
 * ingredients: a place, a thing to do or meet, the people in the story and a
 * gentle problem. Every list here is plain data, so it can grow freely.
 */

export type Ground = 'sand' | 'grass' | 'floor' | 'water' | 'snow' | 'path' | 'space';
export type Horizon = 'sea' | 'hills' | 'city' | 'wall' | 'mountains' | 'trees' | 'stars' | 'clouds' | 'none';

export interface Place {
  id: string;
  name: string;
  /** "at the beach", "in the bath": used inside sentences. */
  at: string;
  sky: [string, string];
  ground: string;
  groundKind: Ground;
  horizon: Horizon;
  /** Little things that appear in the picture. */
  props: string[];
  /** What the baby might find there instead ("No! Just …"). */
  surprises: string[];
  /** Things you do there. */
  doing: string[];
  /** Outfit and hat the baby wears here when "Dress for each place" is on. */
  dress?: { outfit?: string; hat?: string; glasses?: string };
  night?: boolean;
  imaginary?: boolean;
  /** Drawn for a story world: the backdrop comes from worlds.ts instead of the generic one. */
  world?: 'fairytale' | 'adventure' | 'mythic' | 'ocean' | 'space';
  art?: string;
}

export const PLACES: Place[] = [
  // story-world places, each with its own hand-drawn backdrop (worlds.ts)
  { id: 'hillcastle', name: 'The Hilltop Castle', at: 'at the hilltop castle', sky: ['#f6c9c4', '#fdf1dc'], ground: '#9fc27e', groundKind: 'grass', horizon: 'none', props: ['🌹', '🕊️'], surprises: ['just a bluebird singing on the tower', 'just a rose that smells like honey'], doing: ['dance in the courtyard', 'wave from the tower', 'share sweet buns in the garden'], imaginary: true, world: 'fairytale', art: 'hillcastle' },
  { id: 'enchanted', name: 'The Enchanted Wood', at: 'in the Enchanted Wood', sky: ['#28485e', '#5f8f7a'], ground: '#4f7f5f', groundKind: 'grass', horizon: 'none', props: ['🍄', '✨'], surprises: ['just a glowing mushroom', 'just a firefly saying hello'], doing: ['follow the fireflies', 'tiptoe past the glowing mushrooms', 'whisper to the old oak'], imaginary: true, world: 'fairytale', art: 'enchanted' },
  { id: 'jungle', name: 'The Jungle Trail', at: 'on the jungle trail', sky: ['#bfe6d6', '#eaf6d9'], ground: '#8fbf6a', groundKind: 'grass', horizon: 'none', props: ['🦜', '🦋'], surprises: ['just a parrot who can whistle', 'just a butterfly as big as a hand'], doing: ['swing past the vines', 'hop across the river stones', 'listen for the waterfall'], imaginary: true, world: 'adventure', art: 'jungle' },
  { id: 'peaks', name: 'The Mountain Pass', at: 'up the mountain pass', sky: ['#9fcdef', '#e6f3fa'], ground: '#7fae7a', groundKind: 'grass', horizon: 'none', props: ['🦅', '⛺'], surprises: ['just an eagle riding the wind', 'just a mountain goat with a beard'], doing: ['climb to the flag', 'pitch the tent', 'spot the eagle'], imaginary: true, world: 'adventure', art: 'peaks' },
  { id: 'reef', name: 'The Coral Kingdom', at: 'in the Coral Kingdom', sky: ['#2a8fb0', '#8fe0d8'], ground: '#efdcae', groundKind: 'sand', horizon: 'none', props: ['🐠', '🐚'], surprises: ['just a fish blowing bubbles', 'just a crab dancing sideways'], doing: ['swim past the coral towers', 'count the bubbles', 'wave to the fish'], imaginary: true, world: 'ocean', art: 'reef' },
  { id: 'kelp', name: 'The Kelp Forest', at: 'in the kelp forest', sky: ['#14506e', '#4f9f96'], ground: '#c9b98a', groundKind: 'sand', horizon: 'none', props: ['🐢', '🪸'], surprises: ['just a sleepy turtle', 'just a seahorse holding on tight'], doing: ['swim between the swaying kelp', 'peek inside the old ship', 'follow the turtle'], imaginary: true, world: 'ocean', art: 'kelp' },
  { id: 'moon', name: 'The Moon', at: 'on the moon', sky: ['#0f1638', '#2f2a63'], ground: '#c9c6d6', groundKind: 'space', horizon: 'none', props: ['🚀', '🌍'], surprises: ['just a crater shaped like a smile', 'just the Earth waving hello'], doing: ['bounce in the low gravity', 'plant a flag', 'wave to the Earth'], imaginary: true, world: 'space', art: 'moon' },
  { id: 'rings', name: 'The Ringed Planet', at: 'by the ringed planet', sky: ['#1b1446', '#14204a'], ground: '#5a4a8a', groundKind: 'space', horizon: 'none', props: ['🪐', '✨'], surprises: ['just a shooting star', 'just a crystal that hums'], doing: ['float past the rings', 'follow the shooting star', 'make a wish on a star'], imaginary: true, world: 'space', art: 'rings' },
  { id: 'skytemple', name: 'The Temple in the Clouds', at: 'at the temple in the clouds', sky: ['#f7b98a', '#fdf0d6'], ground: '#ffffff', groundKind: 'grass', horizon: 'none', props: ['☀️', '🕊️'], surprises: ['just a sleepy cloud', 'just a golden feather'], doing: ['ring the sunrise bell', 'walk between the tall columns', 'look down at the clouds'], imaginary: true, world: 'mythic', art: 'skytemple' },
  { id: 'starpeak', name: 'The Starlit Summit', at: 'on the starlit summit', sky: ['#1f2350', '#8a6aa0'], ground: '#4a4278', groundKind: 'grass', horizon: 'none', props: ['⭐', '🌙'], surprises: ['just a shooting star', 'just a constellation that winks'], doing: ['count the constellations', 'climb through the stone arch', 'follow the beam of light'], imaginary: true, night: true, world: 'mythic', art: 'starpeak' },
  { id: 'beach', name: 'The beach', at: 'at the beach', sky: ['#bfe3f2', '#e9f5f8'], ground: '#f0dcb4', groundKind: 'sand', horizon: 'sea', props: ['🐚', '⛱️', '🦀', '🏖️'], surprises: ['just a crab in a tiny hat', 'just a shell that sounds like the sea', 'just a sandcastle with a flag on top'], doing: ['dig in the sand', 'splash in the waves', 'build a sandcastle'], dress: { outfit: 'swimsuit', hat: 'sunhat', glasses: 'sun' } },
  { id: 'zoo', name: 'The zoo', at: 'at the zoo', sky: ['#cfe8d8', '#f1f6e6'], ground: '#b9d68f', groundKind: 'grass', horizon: 'trees', props: ['🦒', '🐘', '🌴', '🎈'], surprises: ['just a giraffe eating leaves', 'just an elephant having a bath', 'just a monkey with a banana'], doing: ['wave at the giraffes', 'watch the penguins', 'roar like a lion'] },
  { id: 'home', name: 'Home', at: 'at home', sky: ['#f6e8d6', '#fbf3e8'], ground: '#e2cfb4', groundKind: 'floor', horizon: 'wall', props: ['🪴', '🧸', '🖼️', '🛋️'], surprises: ['just a teddy under the couch', 'just a cushion fort', 'just a cat taking a nap'], doing: ['build a block tower', 'dance in the kitchen', 'read a book on the rug'] },
  { id: 'bedtime', name: 'Bedtime', at: 'in bed', sky: ['#3a3f6b', '#5a5f8e'], ground: '#7a6f9b', groundKind: 'floor', horizon: 'stars', props: ['🌙', '⭐', '🧸', '📖'], surprises: ['just the moon saying goodnight', 'just a sleepy star', 'just a yawn as big as the sky'], doing: ['brush little teeth', 'read one more story', 'say goodnight to the moon'], dress: { outfit: 'pajamas' }, night: true },
  { id: 'park', name: 'The park', at: 'at the park', sky: ['#cfe6f1', '#eef6f8'], ground: '#9cc77d', groundKind: 'grass', horizon: 'hills', props: ['🌳', '🐿️', '🦆', '🌼'], surprises: ['just a squirrel with a snack', 'just a duck who wants to say hello', 'just a pile of crunchy leaves'], doing: ['feed the ducks', 'roll down the hill', 'chase bubbles'] },
  { id: 'waterslide', name: 'The water slide', at: 'at the water slide', sky: ['#bde4f4', '#e6f6fb'], ground: '#7fc8e0', groundKind: 'water', horizon: 'clouds', props: ['💦', '🛟', '☀️', '🌈'], surprises: ['just a big splash', 'just a rubber ring going whoosh', 'just a rainbow in the spray'], doing: ['whoosh down the slide', 'make the biggest splash', 'float in a rubber ring'], dress: { outfit: 'swimsuit', glasses: 'goggles' } },
  { id: 'pool', name: 'The pool', at: 'at the pool', sky: ['#c9ecf6', '#eaf8fb'], ground: '#6fc1dc', groundKind: 'water', horizon: 'clouds', props: ['🛟', '🦆', '☀️', '🏊'], surprises: ['just a rubber duck floating by', 'just bubbles going blub blub', 'just a pool noodle'], doing: ['kick, kick, kick', 'blow bubbles in the water', 'jump in with a splash'], dress: { outfit: 'swimsuit', glasses: 'goggles' } },
  { id: 'farm', name: 'The farm', at: 'on the farm', sky: ['#d9ecf5', '#f4f1e2'], ground: '#c7d98f', groundKind: 'grass', horizon: 'hills', props: ['🐄', '🐓', '🚜', '🌻'], surprises: ['just a cow saying moo', 'just a hen sitting on her eggs', 'just a piglet in the mud'], doing: ['feed the goats', 'ride on the tractor', 'collect the eggs'], dress: { hat: 'sunhat' } },
  { id: 'forest', name: 'The forest', at: 'in the forest', sky: ['#cfe3d2', '#eef3e3'], ground: '#a7c27e', groundKind: 'path', horizon: 'trees', props: ['🌲', '🍄', '🦔', '🍂'], surprises: ['just a hedgehog curled in a ball', 'just a mushroom with spots', 'just a pinecone'], doing: ['crunch through the leaves', 'look for pinecones', 'listen to the birds'] },
  { id: 'mountain', name: 'The mountains', at: 'up the mountain', sky: ['#c7dff0', '#eef4f7'], ground: '#b7c99a', groundKind: 'path', horizon: 'mountains', props: ['🏔️', '🌲', '🦅', '⛺'], surprises: ['just an eagle flying high', 'just a goat on a rock', 'just a cloud close enough to touch'], doing: ['climb up high', 'shout hello and hear it back', 'see the whole world'], dress: { hat: 'beanie' } },
  { id: 'snow', name: 'A snowy day', at: 'in the snow', sky: ['#dfe9f2', '#f7f9fb'], ground: '#f8fbfd', groundKind: 'snow', horizon: 'trees', props: ['⛄', '❄️', '🛷', '🌲'], surprises: ['just a snowman with a carrot nose', 'just a snowflake on the tongue', 'just a sled waiting at the top of the hill'], doing: ['build a snowman', 'make a snow angel', 'slide down on a sled'], dress: { outfit: 'snowsuit', hat: 'beanie' } },
  { id: 'garden', name: 'The garden', at: 'in the garden', sky: ['#d6ecf3', '#f3f6e8'], ground: '#a8cf86', groundKind: 'grass', horizon: 'hills', props: ['🌷', '🐝', '🐞', '🌻'], surprises: ['just a ladybug on a leaf', 'just a bee visiting a flower', 'just a worm saying hello'], doing: ['water the flowers', 'pick a strawberry', 'smell the roses'] },
  { id: 'playground', name: 'The playground', at: 'at the playground', sky: ['#cde7f3', '#eef6f8'], ground: '#e8d2a8', groundKind: 'sand', horizon: 'trees', props: ['🛝', '⚽', '🪁', '🌳'], surprises: ['just a ball on the slide', 'just a kite caught in a tree', 'just a swing going up and down'], doing: ['go down the slide', 'swing up to the sky', 'climb the climbing frame'] },
  { id: 'library', name: 'The library', at: 'at the library', sky: ['#efe4d2', '#f8f2e8'], ground: '#d8c3a5', groundKind: 'floor', horizon: 'wall', props: ['📚', '📖', '🦉', '🪴'], surprises: ['just a book about dinosaurs', 'just a story about a sleepy bear', 'just a very quiet owl'], doing: ['pick a picture book', 'listen to story time', 'turn the pages'] },
  { id: 'store', name: 'The grocery store', at: 'at the grocery store', sky: ['#f1ece0', '#faf7f0'], ground: '#ddd3c2', groundKind: 'floor', horizon: 'wall', props: ['🛒', '🍎', '🥖', '🧀'], surprises: ['just a pile of shiny apples', 'just a loaf of warm bread', 'just a cart with a squeaky wheel'], doing: ['ride in the cart', 'pick the bananas', 'count the oranges'] },
  { id: 'bakery', name: 'The bakery', at: 'at the bakery', sky: ['#f6e6d4', '#fbf4ea'], ground: '#e5cfb0', groundKind: 'floor', horizon: 'wall', props: ['🥐', '🧁', '🍞', '🍪'], surprises: ['just a cupcake with sprinkles', 'just a croissant shaped like a moon', 'just flour on everyone’s nose'], doing: ['smell the bread', 'pick a cookie', 'watch the baker'] },
  { id: 'train', name: 'The train', at: 'on the train', sky: ['#d5e6ef', '#f1f5f6'], ground: '#b9b0a3', groundKind: 'path', horizon: 'hills', props: ['🚂', '🚃', '🌳', '🐄'], surprises: ['just cows waving from a field', 'just a tunnel going whoooo', 'just the conductor’s whistle'], doing: ['wave out the window', 'go choo choo', 'count the stations'] },
  { id: 'airplane', name: 'The airplane', at: 'on the airplane', sky: ['#a9d3ef', '#e3f1fa'], ground: '#ffffff', groundKind: 'space', horizon: 'clouds', props: ['✈️', '☁️', '☁️', '🌤️'], surprises: ['just a fluffy cloud', 'just a tiny bag of snacks', 'just the whole world far below'], doing: ['look out the window', 'fly above the clouds', 'wave to the pilot'] },
  { id: 'boat', name: 'The boat', at: 'on the boat', sky: ['#bfe1ef', '#e8f4f8'], ground: '#5fa8c8', groundKind: 'water', horizon: 'sea', props: ['⛵', '🐬', '🌊', '🐟'], surprises: ['just a dolphin jumping', 'just a fish with stripes', 'just a seagull on the mast'], doing: ['feel the wind', 'spot a dolphin', 'say ahoy'], dress: { hat: 'pirate' } },
  { id: 'aquarium', name: 'The aquarium', at: 'at the aquarium', sky: ['#1f5d82', '#3b8ab3'], ground: '#2d6f93', groundKind: 'water', horizon: 'none', props: ['🐠', '🐙', '🦈', '🪸'], surprises: ['just an octopus waving eight arms', 'just a shark with a big smile', 'just a turtle swimming slowly'], doing: ['press noses to the glass', 'count the fish', 'say hello to the turtle'] },
  { id: 'museum', name: 'The museum', at: 'at the museum', sky: ['#ece7df', '#f8f5f0'], ground: '#d4cbbd', groundKind: 'floor', horizon: 'wall', props: ['🦕', '🖼️', '🏛️', '🦴'], surprises: ['just a dinosaur bone', 'just a painting of a cat', 'just a very old teapot'], doing: ['look at the dinosaurs', 'whisper very quietly', 'find the biggest painting'] },
  { id: 'camping', name: 'The campsite', at: 'at the campsite', sky: ['#2f3a62', '#59608c'], ground: '#6f8b5c', groundKind: 'grass', horizon: 'trees', props: ['⛺', '🔥', '🌲', '🌙'], surprises: ['just a marshmallow on a stick', 'just an owl saying hoo hoo', 'just a firefly glowing'], doing: ['toast marshmallows', 'look at the stars', 'sleep in the tent'], night: true },
  { id: 'picnic', name: 'A picnic', at: 'at the picnic', sky: ['#d3ecf4', '#f2f7ea'], ground: '#a6cf7f', groundKind: 'grass', horizon: 'hills', props: ['🧺', '🍓', '🥪', '🐜'], surprises: ['just an ant carrying a crumb', 'just a basket full of strawberries', 'just a sandwich cut into triangles'], doing: ['share the strawberries', 'lie on the blanket', 'watch the clouds'] },
  { id: 'city', name: 'The city', at: 'in the city', sky: ['#d6e2ec', '#f2f4f5'], ground: '#c9c4bc', groundKind: 'path', horizon: 'city', props: ['🚕', '🚌', '🏙️', '🐦'], surprises: ['just a bus going beep beep', 'just a pigeon on the sidewalk', 'just a fire truck going nee naw'], doing: ['ride the bus', 'count the taxis', 'wave at the fire truck'] },
  { id: 'splashpad', name: 'The splash pad', at: 'at the splash pad', sky: ['#c4e6f4', '#ebf7fb'], ground: '#d9e6ea', groundKind: 'path', horizon: 'trees', props: ['💦', '☀️', '🌈', '🪣'], surprises: ['just a fountain going whoosh', 'just a bucket of water', 'just a rainbow'], doing: ['run through the fountains', 'fill a bucket', 'get wet from head to toe'], dress: { outfit: 'swimsuit' } },
  { id: 'pumpkins', name: 'The pumpkin patch', at: 'at the pumpkin patch', sky: ['#f2dcc0', '#f8efe2'], ground: '#c99a5e', groundKind: 'path', horizon: 'hills', props: ['🎃', '🍂', '🌾', '🍎'], surprises: ['just the biggest pumpkin ever', 'just a scarecrow waving', 'just a pile of orange leaves'], doing: ['pick a pumpkin', 'jump in the hay', 'drink warm apple cider'], dress: { hat: 'beanie' } },
  { id: 'party', name: 'A birthday party', at: 'at the party', sky: ['#f6dfe7', '#fbf1f4'], ground: '#ecd3db', groundKind: 'floor', horizon: 'wall', props: ['🎈', '🎂', '🎁', '🎉'], surprises: ['just a balloon floating away', 'just a cake with candles', 'just a present with a big bow'], doing: ['blow out the candles', 'dance to the music', 'open the presents'], dress: { hat: 'party' } },
  { id: 'kitchen', name: 'The kitchen', at: 'in the kitchen', sky: ['#f4ead8', '#fbf6ee'], ground: '#dcc9ab', groundKind: 'floor', horizon: 'wall', props: ['🥄', '🍲', '🥕', '🧑‍🍳'], surprises: ['just a pot of soup', 'just a wooden spoon', 'just a carrot hiding in the fridge'], doing: ['stir the pancake batter', 'bang the pots like drums', 'wash the vegetables'], dress: { hat: 'chef' } },
  { id: 'car', name: 'A car ride', at: 'in the car', sky: ['#d3e6f0', '#f0f5f6'], ground: '#bdb8ae', groundKind: 'path', horizon: 'hills', props: ['🚗', '🌳', '🚦', '🐄'], surprises: ['just a red light saying stop', 'just a cow by the road', 'just a song on the radio'], doing: ['sing along to the radio', 'count the red cars', 'look for cows'] },
  { id: 'lake', name: 'The lake', at: 'at the lake', sky: ['#cbe5ef', '#eef5f3'], ground: '#9cc27e', groundKind: 'grass', horizon: 'mountains', props: ['🛶', '🐟', '🦆', '🌲'], surprises: ['just a fish jumping', 'just a canoe on the water', 'just a duck family'], doing: ['skip stones', 'paddle the canoe', 'dip toes in the water'] },
  { id: 'space', name: 'Outer space', at: 'in outer space', sky: ['#121735', '#2b2f5e'], ground: '#3a3f6b', groundKind: 'space', horizon: 'stars', props: ['🚀', '🪐', '⭐', '🌙'], surprises: ['just a friendly alien', 'just a planet with rings', 'just a shooting star'], doing: ['float without gravity', 'wave at the moon', 'fly a rocket'], dress: { outfit: 'astronaut' }, night: true, imaginary: true },
  { id: 'sea', name: 'Under the sea', at: 'under the sea', sky: ['#1d6f93', '#3f9cbf'], ground: '#e6d3a8', groundKind: 'sand', horizon: 'none', props: ['🐠', '🐢', '🪸', '🫧'], surprises: ['just a sea turtle', 'just a clownfish in its home', 'just bubbles going up and up'], doing: ['swim with the fish', 'blow big bubbles', 'ride a sea turtle'], dress: { glasses: 'goggles' }, imaginary: true },
  { id: 'jungle', name: 'The jungle', at: 'in the jungle', sky: ['#bfdcae', '#e8f1d8'], ground: '#7fae5a', groundKind: 'grass', horizon: 'trees', props: ['🌴', '🐒', '🦜', '🐍'], surprises: ['just a parrot saying hello', 'just a monkey swinging by', 'just a very sleepy sloth'], doing: ['swing on a vine', 'spot a parrot', 'stomp like an elephant'], dress: { hat: 'sunhat' }, imaginary: true },
  { id: 'castle', name: 'A castle', at: 'at the castle', sky: ['#d9d4ef', '#f3f0fa'], ground: '#a9c98a', groundKind: 'grass', horizon: 'hills', props: ['🏰', '🐉', '👑', '🦄'], surprises: ['just a friendly dragon', 'just a crown on a cushion', 'just a unicorn eating grass'], doing: ['wear a crown', 'cross the drawbridge', 'have a royal tea party'], dress: { hat: 'crown' }, imaginary: true },
  { id: 'rain', name: 'A rainy day', at: 'out in the rain', sky: ['#aab8c6', '#d8e0e6'], ground: '#8fa38c', groundKind: 'path', horizon: 'city', props: ['☔', '🌧️', '🐸', '🌈'], surprises: ['just a frog in a puddle', 'just a rainbow after the rain', 'just a worm saying hello'], doing: ['jump in puddles', 'catch raindrops', 'look for rainbows'], dress: { outfit: 'raincoat' } },
  { id: 'bath', name: 'Bath time', at: 'in the bath', sky: ['#dcecef', '#eef6f7'], ground: '#cfe6ea', groundKind: 'floor', horizon: 'wall', props: ['🛁', '🦆', '🫧', '🧽'], surprises: ['just a very surprised duck', 'just a mountain of bubbles', 'just a boat that floats'], doing: ['splash splash splash', 'make a bubble beard', 'sail the little boat'] },
  { id: 'fair', name: 'The fun fair', at: 'at the fun fair', sky: ['#f9dcc4', '#fbefe3'], ground: '#d9c3a0', groundKind: 'path', horizon: 'hills', props: ['🎡', '🎠', '🍭', '🎪'], surprises: ['just a carousel horse going round and round', 'just cotton candy as big as a cloud', 'just a clown with a squeaky nose'], doing: ['ride the carousel', 'go up on the big wheel', 'share fluffy cotton candy'], dress: { hat: 'capback' } },
  { id: 'icecream', name: 'The ice cream shop', at: 'at the ice cream shop', sky: ['#fbe3ea', '#fdf4f6'], ground: '#f1d6de', groundKind: 'floor', horizon: 'wall', props: ['🍦', '🍨', '🍒', '🧁'], surprises: ['just a scoop as big as a ball', 'just a cone with rainbow sprinkles', 'just a cherry on top'], doing: ['pick a flavour', 'add the sprinkles', 'lick the drips'] },
  { id: 'treehouse', name: 'The treehouse', at: 'up in the treehouse', sky: ['#cfe6d6', '#eef6ea'], ground: '#9cc27e', groundKind: 'grass', horizon: 'trees', props: ['🌳', '🪜', '🐦', '🔭'], surprises: ['just a bird’s nest with three eggs', 'just a secret note', 'just a squirrel peeking in'], doing: ['climb up the ladder', 'look through the telescope', 'have a secret club'] },
  { id: 'island', name: 'Treasure island', at: 'on treasure island', sky: ['#bfe6f4', '#ecf8fb'], ground: '#f0dcb4', groundKind: 'sand', horizon: 'sea', props: ['🏝️', '🦜', '🗺️', '🥥'], surprises: ['just a parrot saying “Ahoy!”', 'just a coconut', 'just a crab guarding a shell'], doing: ['follow the treasure map', 'dig for treasure', 'say “Ahoy, matey!”'], dress: { hat: 'bandana' }, imaginary: true },
  { id: 'dinoland', name: 'Dinosaur valley', at: 'in dinosaur valley', sky: ['#f3d9b8', '#f7ecd9'], ground: '#9cb86f', groundKind: 'grass', horizon: 'mountains', props: ['🦕', '🦖', '🌋', '🌿'], surprises: ['just a baby dinosaur hatching', 'just giant footprints', 'just a volcano puffing little clouds'], doing: ['stomp like a dinosaur', 'follow the giant footprints', 'say hello to a baby dino'], imaginary: true },
  { id: 'moon', name: 'The moon', at: 'on the moon', sky: ['#0f1430', '#25295a'], ground: '#cfd3dc', groundKind: 'space', horizon: 'stars', props: ['🌍', '🚀', '⭐', '🛸'], surprises: ['just the Earth far, far away', 'just a crater full of moon dust', 'just a friendly alien waving'], doing: ['bounce very high', 'plant a flag', 'wave at the Earth'], dress: { outfit: 'astronaut' }, night: true, imaginary: true },
  { id: 'trampoline', name: 'The trampoline park', at: 'at the trampoline park', sky: ['#e5ddf6', '#f4f0fb'], ground: '#5e8fb8', groundKind: 'floor', horizon: 'wall', props: ['🤸', '⭐', '🎈', '🎉'], surprises: ['just a pit full of foam cubes', 'just the highest jump ever', 'just a very bouncy giggle'], doing: ['bounce, bounce, bounce', 'jump into the foam pit', 'try a flip'], dress: { hat: 'headband' } },
  { id: 'icerink', name: 'The ice rink', at: 'at the ice rink', sky: ['#dceaf4', '#f3f8fb'], ground: '#eef6fb', groundKind: 'snow', horizon: 'trees', props: ['⛸️', '❄️', '🧣', '☕'], surprises: ['just a slippery wobble', 'just a cup of hot chocolate', 'just a spin like a snowflake'], doing: ['glide on the ice', 'hold hands and skate', 'spin round and round'], dress: { outfit: 'puffer', hat: 'earmuffs' } },
  { id: 'bouncy', name: 'The bouncy castle', at: 'on the bouncy castle', sky: ['#cfe8f4', '#eef6f8'], ground: '#a6cf7f', groundKind: 'grass', horizon: 'hills', props: ['🏰', '🎈', '🎉', '⭐'], surprises: ['just a wobbly wall', 'just a pile of giggling friends', 'just a big bouncy tumble'], doing: ['bounce up to the sky', 'tumble and roll', 'jump with friends'] },
  { id: 'balloonride', name: 'A hot air balloon', at: 'up in the hot air balloon', sky: ['#a9d3ef', '#f3e6d9'], ground: '#ffffff', groundKind: 'space', horizon: 'clouds', props: ['🎈', '☁️', '🌤️', '🐦'], surprises: ['just a flock of birds flying by', 'just a cloud shaped like a bunny', 'just tiny houses far below'], doing: ['float above the clouds', 'wave to the birds', 'spot their house'] },
  { id: 'fort', name: 'The pillow fort', at: 'in the pillow fort', sky: ['#3d3a63', '#5b5788'], ground: '#8a7fb0', groundKind: 'floor', horizon: 'wall', props: ['🔦', '🧸', '⭐', '📖'], surprises: ['just a flashlight making shadow puppets', 'just a pile of cosy blankets', 'just a teddy guarding the door'], doing: ['make shadow puppets', 'tell stories by flashlight', 'snuggle under the blankets'], dress: { outfit: 'pajamas' }, night: true },
  { id: 'field', name: 'The sports field', at: 'at the sports field', sky: ['#cfe6f1', '#eef6f8'], ground: '#7fb069', groundKind: 'grass', horizon: 'trees', props: ['⚽', '🥅', '🏆', '📣'], surprises: ['just a goal!', 'just a high five', 'just a shiny trophy'], doing: ['kick the ball', 'run really fast', 'score a goal'], dress: { outfit: 'jersey', hat: 'headband' } },
];

export interface Thing { e: string; n: string }
export interface Animal extends Thing { sound: string; places: string[] }

export const ANIMALS: Animal[] = [
  { e: '🦁', n: 'a lion', sound: 'Roar!', places: ['zoo', 'jungle'] },
  { e: '🐘', n: 'an elephant', sound: 'Toot toot!', places: ['zoo', 'jungle'] },
  { e: '🦒', n: 'a giraffe', sound: 'Munch munch!', places: ['zoo'] },
  { e: '🐒', n: 'a monkey', sound: 'Ooh ooh ah ah!', places: ['zoo', 'jungle'] },
  { e: '🐧', n: 'a penguin', sound: 'Waddle waddle!', places: ['zoo', 'snow', 'aquarium'] },
  { e: '🦓', n: 'a zebra', sound: 'Neigh!', places: ['zoo'] },
  { e: '🐻', n: 'a bear', sound: 'Grrr!', places: ['forest', 'zoo', 'mountain'] },
  { e: '🐄', n: 'a cow', sound: 'Moo!', places: ['farm', 'train', 'car'] },
  { e: '🐖', n: 'a pig', sound: 'Oink oink!', places: ['farm'] },
  { e: '🐑', n: 'a sheep', sound: 'Baa!', places: ['farm', 'mountain'] },
  { e: '🐓', n: 'a rooster', sound: 'Cock-a-doodle-doo!', places: ['farm'] },
  { e: '🐐', n: 'a goat', sound: 'Meh-eh-eh!', places: ['farm', 'mountain'] },
  { e: '🐴', n: 'a horse', sound: 'Neigh!', places: ['farm', 'castle'] },
  { e: '🦆', n: 'a duck', sound: 'Quack quack!', places: ['park', 'pool', 'lake', 'bath'] },
  { e: '🐸', n: 'a frog', sound: 'Ribbit!', places: ['rain', 'garden', 'lake'] },
  { e: '🐝', n: 'a bee', sound: 'Bzzz!', places: ['garden', 'picnic'] },
  { e: '🐞', n: 'a ladybug', sound: '(ladybugs are very quiet)', places: ['garden'] },
  { e: '🦋', n: 'a butterfly', sound: 'Flutter flutter!', places: ['garden', 'park'] },
  { e: '🐿️', n: 'a squirrel', sound: 'Chitter chatter!', places: ['park', 'forest'] },
  { e: '🦔', n: 'a hedgehog', sound: 'Snuffle snuffle!', places: ['forest', 'garden'] },
  { e: '🦉', n: 'an owl', sound: 'Hoo hoo!', places: ['forest', 'camping', 'bedtime'] },
  { e: '🐬', n: 'a dolphin', sound: 'Eee eee!', places: ['boat', 'sea'] },
  { e: '🐢', n: 'a turtle', sound: 'Slooow and steady!', places: ['sea', 'aquarium', 'beach'] },
  { e: '🐙', n: 'an octopus', sound: 'Wiggle wiggle!', places: ['aquarium', 'sea'] },
  { e: '🐠', n: 'a fish', sound: 'Blub blub!', places: ['aquarium', 'sea', 'lake'] },
  { e: '🦀', n: 'a crab', sound: 'Click clack!', places: ['beach', 'sea'] },
  { e: '🦜', n: 'a parrot', sound: 'Hello! Hello!', places: ['jungle', 'zoo'] },
  { e: '🐱', n: 'a cat', sound: 'Meow!', places: ['home', 'garden'] },
  { e: '🐶', n: 'a puppy', sound: 'Woof woof!', places: ['park', 'home'] },
  { e: '🐰', n: 'a bunny', sound: 'Hop hop!', places: ['garden', 'farm'] },
  { e: '🦕', n: 'a dinosaur', sound: 'RAWR!', places: ['museum', 'jungle'] },
  { e: '🐉', n: 'a dragon', sound: 'Puff puff!', places: ['castle'] },
  { e: '🦄', n: 'a unicorn', sound: 'Sparkle sparkle!', places: ['castle'] },
];

export interface Food extends Thing { love: boolean }
export const FOODS: Food[] = [
  { e: '🍌', n: 'a banana', love: true }, { e: '🥑', n: 'avocado', love: false }, { e: '🍓', n: 'strawberries', love: true },
  { e: '🥦', n: 'broccoli', love: false }, { e: '🍝', n: 'spaghetti', love: true }, { e: '🍋', n: 'a lemon', love: false },
  { e: '🫐', n: 'blueberries', love: true }, { e: '🥕', n: 'a carrot', love: true }, { e: '🍉', n: 'watermelon', love: true },
  { e: '🧀', n: 'cheese', love: true }, { e: '🍠', n: 'sweet potato', love: true }, { e: '🥒', n: 'cucumber', love: false },
  { e: '🍎', n: 'an apple', love: true }, { e: '🍐', n: 'a pear', love: true }, { e: '🥞', n: 'pancakes', love: true },
  { e: '🍚', n: 'rice', love: true }, { e: '🥟', n: 'a dumpling', love: true }, { e: '🍕', n: 'pizza', love: true },
  { e: '🥣', n: 'porridge', love: true }, { e: '🍦', n: 'ice cream', love: true }, { e: '🫛', n: 'peas', love: false },
  { e: '🌽', n: 'corn', love: true }, { e: '🍊', n: 'an orange', love: true }, { e: '🥝', n: 'kiwi', love: false },
  { e: '🍞', n: 'toast', love: true }, { e: '🥚', n: 'an egg', love: true }, { e: '🍇', n: 'grapes', love: true },
  { e: '🧁', n: 'a cupcake', love: true }, { e: '🥯', n: 'a bagel', love: true }, { e: '🍄', n: 'a mushroom', love: false },
];

export const LOVES = ['Yum!', 'Yum yum yum!', 'More, please!', 'Delicious!', 'All gone!', 'Mmm!'];
export const YUCKS = ['Yuck!', 'Hmm… no thank you!', 'Bleh!', 'Maybe tomorrow!', 'What a funny face!'];

export interface LostThing extends Thing { found: string }
export const LOST: LostThing[] = [
  { e: '🧦', n: 'sock', found: 'on {pet}’s nose' },
  { e: '🧸', n: 'teddy', found: 'tucked into bed, fast asleep' },
  { e: '🧢', n: 'hat', found: 'on {who}’s head' },
  { e: '👟', n: 'shoe', found: 'under the couch' },
  { e: '🧣', n: 'blankie', found: 'in the laundry basket, all warm' },
  { e: '⚽', n: 'ball', found: 'in the garden, under a bush' },
  { e: '🦆', n: 'rubber duck', found: 'in the bath, of course' },
  { e: '🚗', n: 'little car', found: 'in {who}’s pocket' },
  { e: '🥤', n: 'sippy cup', found: 'in the fridge' },
  { e: '🐰', n: 'bunny', found: 'in the toy box' },
  { e: '🎈', n: 'balloon', found: 'tied to the stroller' },
  { e: '🦖', n: 'dinosaur', found: 'hiding behind the plant, roaring very quietly' },
  { e: '🧤', n: 'mitten', found: 'inside the other mitten' },
  { e: '📕', n: 'favourite book', found: 'on the pillow, waiting for bedtime' },
];

export const COUNTABLES: { e: string; one: string; many: string }[] = [
  { e: '🦆', one: 'duck', many: 'ducks' }, { e: '🍓', one: 'strawberry', many: 'strawberries' }, { e: '🎈', one: 'balloon', many: 'balloons' },
  { e: '⭐', one: 'star', many: 'stars' }, { e: '🐟', one: 'fish', many: 'fish' }, { e: '🌼', one: 'flower', many: 'flowers' },
  { e: '🐞', one: 'ladybug', many: 'ladybugs' }, { e: '🚗', one: 'car', many: 'cars' }, { e: '🍎', one: 'apple', many: 'apples' },
  { e: '🐚', one: 'shell', many: 'shells' }, { e: '🫧', one: 'bubble', many: 'bubbles' }, { e: '🐸', one: 'frog', many: 'frogs' },
];

export const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

export const COLOURS: { name: string; hex: string; things: Thing[] }[] = [
  { name: 'red', hex: '#d9534f', things: [{ e: '🍎', n: 'apple' }, { e: '🚒', n: 'fire truck' }, { e: '🍓', n: 'strawberry' }] },
  { name: 'yellow', hex: '#f2c14e', things: [{ e: '🌻', n: 'sunflower' }, { e: '🍌', n: 'banana' }, { e: '🐥', n: 'chick' }] },
  { name: 'blue', hex: '#5e8fb8', things: [{ e: '🐳', n: 'whale' }, { e: '🫐', n: 'blueberries' }, { e: '🦋', n: 'butterfly' }] },
  { name: 'green', hex: '#6d9b59', things: [{ e: '🐸', n: 'frog' }, { e: '🥦', n: 'broccoli' }, { e: '🦖', n: 'dinosaur' }] },
  { name: 'orange', hex: '#e8873e', things: [{ e: '🍊', n: 'orange' }, { e: '🎃', n: 'pumpkin' }, { e: '🦊', n: 'fox' }] },
  { name: 'pink', hex: '#ef9fb6', things: [{ e: '🐷', n: 'piglet' }, { e: '🌸', n: 'blossom' }, { e: '🦩', n: 'flamingo' }] },
  { name: 'purple', hex: '#8e6bb8', things: [{ e: '🍇', n: 'grapes' }, { e: '🍆', n: 'eggplant' }, { e: '🔮', n: 'crystal ball' }] },
];

/** Names to pick from when someone taps "Pick a name". */
export const NAMES = [
  'Maya', 'John', 'Mark', 'Kylie', 'Rachel', 'Ryan', 'Ava', 'Leo', 'Mila', 'Noah', 'Zoe', 'Eli', 'Luna', 'Theo', 'Isla',
  'Jack', 'Nora', 'Sam', 'Ivy', 'Max', 'Ruby', 'Oscar', 'Hazel', 'Finn', 'Lily', 'Arlo', 'Rosie', 'Miles', 'Stella', 'Kai',
  'Aria', 'Jonah', 'Freya', 'Ezra', 'Chloe', 'Felix', 'Willow', 'Hugo', 'Naomi', 'Ben', 'Priya', 'Arjun', 'Aisha', 'Omar',
  'Mei', 'Kenji', 'Sofia', 'Mateo', 'Amara', 'Kofi', 'Zara', 'Ravi', 'Leila', 'Yusuf', 'Hana', 'Diego', 'Ingrid', 'Lars',
  'Chen', 'Ana', 'Lucas', 'Elena', 'Noor', 'Ari', 'Tess', 'Remy', 'June', 'Otis', 'Pia', 'Rory', 'Sage', 'Wren',
];
export const PET_NAMES = ['Biscuit', 'Pepper', 'Mochi', 'Waffles', 'Maple', 'Bean', 'Noodle', 'Pickles', 'Olive', 'Ziggy', 'Bao', 'Teddy'];

export type Role = 'baby' | 'parent' | 'sibling' | 'friend' | 'grandparent' | 'relative' | 'teacher' | 'pet';
export const ROLE_LABEL: Record<Role, string> = {
  baby: 'The star', parent: 'Parent', sibling: 'Brother or sister', friend: 'Friend', grandparent: 'Grandparent', relative: 'Family', teacher: 'Teacher', pet: 'Pet',
};

/** The kinds of story the generator can tell. */
export const STORY_TYPES = [
  { id: 'fairytale', name: 'The Wishing Lantern', blurb: 'A fairytale of kindness and light' },
  { id: 'expedition', name: 'The Map with No Edges', blurb: 'An adventure up mountains and through jungles' },
  { id: 'legend', name: 'The Morning Star', blurb: 'A legend: a brave quest to wake the sun' },
  { id: 'pearl', name: 'The Singing Pearl', blurb: 'Under the sea: a lost pearl that sings lullabies' },
  { id: 'comet', name: 'The Little Comet', blurb: 'A starlight voyage to help a comet find her way home' },
  { id: 'lost', name: 'Lost something', blurb: 'Where’s the sock? Is it at the zoo? No!' },
  { id: 'water', name: 'Splash day', blurb: 'Pool, water slide, splash!' },
  { id: 'treasure', name: 'Treasure hunt', blurb: 'X marks the spot!' },
  { id: 'dinos', name: 'Dinosaur day', blurb: 'Stomp, stomp, ROAR!' },
  { id: 'animals', name: 'Meet the animals', blurb: 'Hello lion! Roar!' },
  { id: 'hero', name: 'Superhero day', blurb: 'To the rescue!' },
  { id: 'fair', name: 'The fun fair', blurb: 'Round and round we go' },
  { id: 'space', name: 'Rocket ride', blurb: '3, 2, 1… blast off!' },
  { id: 'feelings', name: 'Big feelings', blurb: 'Happy, silly, shy, proud' },
  { id: 'adventure', name: 'Big day out', blurb: 'So many places in one day' },
  { id: 'foods', name: 'Try new foods', blurb: 'Banana? Yum! Broccoli? Hmm…' },
  { id: 'hats', name: 'Funny hats', blurb: 'A new hat in every place' },
  { id: 'hide', name: 'Hide and seek', blurb: 'Where’s Dad hiding?' },
  { id: 'counting', name: 'Counting', blurb: 'One sun, two ducks, three…' },
  { id: 'colours', name: 'Colours', blurb: 'Red apple, yellow banana' },
  { id: 'bedtime', name: 'Bedtime', blurb: 'Goodnight beach, goodnight moon' },
] as const;
export type StoryType = (typeof STORY_TYPES)[number]['id'];
