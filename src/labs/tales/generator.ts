import type { Expression } from './character';
import { ANIMALS, COLOURS, COUNTABLES, FOODS, LOST, LOVES, NUMBER_WORDS, PLACES, YUCKS, type Place, type Role, type StoryType } from './catalog';

/**
 * The Baby Tales story generator.
 *
 * Stories for the very young are repetition with one change per page: the
 * same question in a new place, a new animal, a new food. So a story is a
 * pattern (its type), a handful of places, and the cast. Everything is drawn
 * with a seeded random generator, so the same seed always tells the same story,
 * and "New story" just means a new seed.
 *
 * Text is stored with tokens, {@id} for a person, so renaming someone later
 * updates every page they appear on.
 */

export interface CastMember {
  id: string;
  role: Role;
  name: string;
  /** What the baby calls them in the story ("Mom", "Grandpa"); for kids and pets, their name. */
  call: string;
  inStory: boolean;
}

export interface StoryPage {
  id: string;
  place: string;
  text: string;
  /** Who's in the picture (cast ids), the star first. */
  cast: string[];
  /** The big thing on the page: an animal, a food, the lost sock… */
  focus?: { e: string; count?: number; faded?: boolean };
  /** The star's hat on this page (Funny hats story). */
  hat?: string;
  /** The star's outfit on this page (dinosaur suit, superhero cape…). */
  outfit?: string;
  /** How the star feels on this page; friends react to the big moments. */
  mood?: Expression;
  /** Set when the words were changed by hand. */
  edited?: boolean;
}

export interface Story {
  type: StoryType;
  seed: number;
  title: string;
  pages: StoryPage[];
}

/* ── seeded random ─────────────────────────────────────── */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    pick: <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
    shuffle: <T,>(xs: readonly T[]): T[] => {
      const a2 = [...xs];
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tok = (c?: CastMember) => (c ? `{@${c.id}}` : 'someone');

export const HAT_WORDS: Record<string, string> = {
  capback: 'a backwards cap', headphones: 'big headphones', beret: 'a beret', propeller: 'a propeller cap', catears: 'cat ears',
  party: 'a party hat', pirate: 'a pirate hat', crown: 'a golden crown', sunhat: 'a big sun hat', beanie: 'a cosy beanie',
  bunny: 'bunny ears', cowboy: 'a cowboy hat', chef: 'a chef’s hat', flowers: 'a flower crown', wizard: 'a wizard hat', bucket: 'a bucket hat',
};
const HAT_REACTIONS = ['How silly!', 'So fancy!', 'Hee hee hee!', 'Ta-da!', 'What a look!', 'Everyone giggles!'];

/** Default places for each story type when none are chosen. */
const PREFERRED: Partial<Record<StoryType, string[]>> = {
  animals: ['zoo', 'farm', 'park', 'aquarium', 'forest', 'garden', 'jungle', 'lake', 'sea'],
  foods: ['kitchen', 'picnic', 'bakery', 'store', 'park', 'beach', 'party', 'farm'],
  bedtime: ['beach', 'park', 'zoo', 'farm', 'garden', 'lake', 'snow', 'space'],
  hide: ['home', 'garden', 'park', 'library', 'kitchen', 'playground', 'store'],
  water: ['waterslide', 'pool', 'splashpad', 'beach', 'lake'],
  treasure: ['island', 'beach', 'boat', 'forest', 'treehouse', 'jungle'],
  dinos: ['dinoland', 'museum', 'jungle', 'forest'],
  fair: ['fair', 'icecream', 'bouncy', 'trampoline'],
  hero: ['park', 'playground', 'city', 'garden', 'farm', 'field'],
  space: ['moon', 'space', 'balloonride', 'airplane'],
  feelings: ['park', 'playground', 'pool', 'party', 'fair', 'beach', 'trampoline'],
};

const TREASURES = ['shiny shells and big hugs', 'golden cookies', 'sparkly stickers', 'chocolate coins', 'funny hats for everyone', 'bubbles and balloons'];
const DINOS = [
  { e: '🦖', n: 'a T-rex who just wants a hug' }, { e: '🦕', n: 'a long-necked dinosaur munching leaves from the very top of a tree' },
  { e: '🥚', n: 'a dinosaur egg going crack, crack… hatch!' }, { e: '🦕', n: 'a baby dinosaur who wants to play tag' },
  { e: '🦖', n: 'a dinosaur learning to dance' }, { e: '🦴', n: 'a dinosaur bone as big as a slide' },
];
const RESCUES = [
  { e: '🐱', p: 'a kitten is stuck up a tree', fix: 'gives it a gentle hand down' }, { e: '🎈', p: 'a balloon is floating away', fix: 'jumps up and catches it' },
  { e: '🦆', p: 'the ducks are hungry', fix: 'shares some peas' }, { e: '🧱', p: 'a block tower falls down', fix: 'builds it up again, even taller' },
  { e: '🤗', p: 'a friend is feeling sad', fix: 'gives the biggest hug' }, { e: '🌷', p: 'the flowers are thirsty', fix: 'waters every single one' },
  { e: '🧸', p: 'a teddy is lost', fix: 'finds it under a bush' }, { e: '⚽', p: 'a ball rolls into the pond', fix: 'fishes it out with a big stick' },
];
const FAIR = [
  { e: '🎠', t: '{H} rides the carousel. Up and down, round and round!' }, { e: '🎡', t: 'Up, up, up on the big wheel! {H} can see everything.' },
  { e: '🍭', t: '{H} and {X} share cotton candy. It’s like eating a cloud!' }, { e: '🎯', t: '{H} throws a ball… and wins a prize!' },
  { e: '🎪', t: 'In the big tent, the clowns honk their horns. Honk honk!' }, { e: '🚗', t: 'Beep beep! {H} and {X} ride the bumper cars.' },
];
const FEELINGS: { mood: Expression; word: string; why: string }[] = [
  { mood: 'grin', word: 'happy', why: '{H} and {X} {doing}' }, { mood: 'wow', word: 'surprised', why: '{H} sees {surprise}' },
  { mood: 'silly', word: 'silly', why: '{H} makes the funniest face' }, { mood: 'shy', word: 'a little shy', why: '{H} meets someone new' },
  { mood: 'proud', word: 'proud', why: '{H} does it all alone' }, { mood: 'starry', word: 'excited', why: '{H} sees a rainbow' },
  { mood: 'worried', word: 'a little worried', why: 'a loud noise goes BOOM' }, { mood: 'sleepy', word: 'sleepy', why: '{H} yawns a great big yawn' },
];
const SPLASH = ['Splash!', 'Whoosh!', 'Sploosh!', 'Wheee!', 'Splish splash!'];

export function generateStory(type: StoryType, cast: CastMember[], opts: { seed: number; places?: string[]; extraPlaces?: Place[]; heroLine?: string }): Story {
  const r = rng(opts.seed);
  const place = (id: string): Place => opts.extraPlaces?.find((p) => p.id === id) ?? PLACES.find((p) => p.id === id) ?? PLACES[0];
  const hero = cast.find((c) => c.role === 'baby') ?? cast[0];
  const others = cast.filter((c) => c.id !== hero.id && c.inStory);
  const people = others.filter((c) => c.role !== 'pet');
  const pet = others.find((c) => c.role === 'pet');
  const H = tok(hero);
  const companions = r.shuffle(others.length ? others : [hero]);
  const companion = (i: number) => companions[i % companions.length];

  const chosen = (opts.places ?? []).filter((id) => PLACES.some((p) => p.id === id) || opts.extraPlaces?.some((p) => p.id === id));
  const pool = chosen.length ? chosen : (PREFERRED[type] ?? PLACES.filter((p) => !p.imaginary && !p.night && p.id !== 'home').map((p) => p.id));
  // the chosen places come first; if fewer than four were chosen, fill in with fitting others
  const fallback = PREFERRED[type] ?? PLACES.filter((p) => !p.imaginary && !p.night && p.id !== 'home').map((p) => p.id);
  const stops = [...r.shuffle(pool), ...r.shuffle(fallback.filter((id) => !pool.includes(id)))].slice(0, 4);
  while (stops.length < 4) stops.push(r.pick(pool));

  let n = 0;
  const pid = () => `pg-${opts.seed}-${n++}`;
  const pages: StoryPage[] = [];
  const add = (p: Omit<StoryPage, 'id'>) => pages.push({ id: pid(), ...p });
  const at = (id: string) => place(id).at;

  let title = '';
  switch (type) {
    case 'lost': {
      const item = r.pick(LOST);
      title = `Where’s ${H}’s ${item.n}?`;
      add({ place: 'home', text: `Oh no! ${H}’s ${item.n} is missing. Where can it be?`, cast: [hero.id, companion(0).id], focus: { e: item.e, faded: true } });
      stops.forEach((s, i) => {
        const p = place(s);
        add({ place: s, text: `Is it ${p.at}? No! It’s ${r.pick(p.surprises)}.`, cast: [hero.id, companion(i + 1).id], focus: { e: r.pick(p.props) } });
      });
      const who = people.length ? tok(r.pick(people)) : 'Mom';
      const found = item.found.replace('{who}', who).replace('{pet}', pet ? tok(pet) : 'the dog');
      add({ place: 'home', text: `There it is! ${H}’s ${item.n} was ${found}. Hooray!`, cast: [hero.id, ...(pet && item.found.includes('{pet}') ? [pet.id] : [companion(0).id])], focus: { e: item.e } });
      break;
    }
    case 'animals': {
      title = `${H} Meets the Animals`;
      add({ place: stops[0], text: `${H} is going on an animal adventure with ${tok(companion(0))}!`, cast: [hero.id, companion(0).id] });
      const used = new Set<string>();
      stops.forEach((s, i) => {
        const fits = ANIMALS.filter((a) => a.places.includes(s) && !used.has(a.e));
        const a = fits.length ? r.pick(fits) : r.pick(ANIMALS.filter((x) => !used.has(x.e)));
        used.add(a.e);
        add({ place: s, text: `${cap(at(s))}, ${H} meets ${a.n}. ${a.sound}`, cast: [hero.id, companion(i).id], focus: { e: a.e } });
      });
      add({ place: 'home', text: `Goodbye, animals! ${H} roars and quacks and moos all the way home.`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)] });
      break;
    }
    case 'foods': {
      title = `What Will ${H} Eat?`;
      const foods = r.shuffle(FOODS);
      const picks = [foods.find((f) => !f.love) ?? foods[0], ...foods.filter((f) => f.love).slice(0, 3)];
      const order = r.shuffle(picks);
      add({ place: 'kitchen', text: `${H} is hungry! What will ${H} eat today?`, cast: [hero.id, companion(0).id], focus: { e: '🍽️' } });
      order.forEach((f, i) => {
        const s = stops[i];
        const giver = people.length ? people[i % people.length] : companion(i);
        add({ place: s, text: `${cap(at(s))}, ${tok(giver)} gives ${H} ${f.n}. ${f.love ? r.pick(LOVES) : r.pick(YUCKS)}`, cast: [hero.id, giver.id], focus: { e: f.e } });
      });
      const fav = order.find((f) => f.love) ?? order[0];
      add({ place: 'home', text: `And ${H}’s favourite of all? ${cap(fav.n.replace(/^(a|an) /, ''))}! More, please!`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: fav.e } });
      break;
    }
    case 'hats': {
      title = `${H}’s Funny Hat Day`;
      const hats = r.shuffle(Object.keys(HAT_WORDS));
      add({ place: 'home', text: `${H} finds a big box of hats. Which one today?`, cast: [hero.id, companion(0).id], focus: { e: '📦' }, hat: 'none' });
      stops.forEach((s, i) => {
        add({ place: s, text: `${cap(at(s))}, ${H} wears ${HAT_WORDS[hats[i]]}. ${r.pick(HAT_REACTIONS)}`, cast: [hero.id, companion(i).id], hat: hats[i] });
      });
      add({ place: 'home', text: `But the very best hat of all? No hat! Just ${H}.`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], hat: 'none' });
      break;
    }
    case 'bedtime': {
      title = `Goodnight, ${H}`;
      add({ place: 'home', text: `The sun is going down. It’s almost time for bed, ${H}.`, cast: [hero.id, companion(0).id], focus: { e: '🌅' } });
      stops.forEach((s, i) => {
        const p = place(s);
        add({ place: s, text: `Goodnight, ${p.name.replace(/^The |^A /, '').toLowerCase()}. Goodnight, ${tok(companion(i))}.`, cast: [hero.id, companion(i).id], focus: { e: r.pick(p.props) } });
      });
      add({ place: 'bedtime', text: `Goodnight, moon. Goodnight, stars. Goodnight, ${H}. Sweet dreams.`, cast: [hero.id], focus: { e: '🌙' } });
      break;
    }
    case 'hide': {
      const hider = people.length ? r.pick(people) : companion(0);
      const helpers = others.filter((c) => c.id !== hider.id);
      title = `Where’s ${tok(hider)}?`;
      add({ place: 'home', text: `${tok(hider)} is hiding! ${H} counts: one, two, three… Ready or not!`, cast: [hero.id], focus: { e: '🙈' } });
      stops.forEach((s, i) => {
        const p = place(s);
        add({ place: s, text: `Is ${tok(hider)} ${p.at}? No! It’s ${r.pick(p.surprises)}.`, cast: [hero.id, ...(helpers.length ? [helpers[i % helpers.length].id] : [])], focus: { e: r.pick(p.props) } });
      });
      add({ place: 'home', text: `Peekaboo! There’s ${tok(hider)}, behind the curtain. Now it’s ${H}’s turn to hide!`, cast: [hero.id, hider.id], focus: { e: '🫣' } });
      break;
    }
    case 'adventure': {
      title = `${H}’s Big Day Out`;
      const words = ['First', 'Next', 'Then', 'After that'];
      add({ place: 'home', text: `${H} wakes up early. Today is a big day out!`, cast: [hero.id, companion(0).id], focus: { e: '☀️' } });
      stops.forEach((s, i) => {
        const p = place(s);
        add({ place: s, text: `${words[i]}, ${H} and ${tok(companion(i))} ${r.pick(p.doing)} ${p.at}.`, cast: [hero.id, companion(i).id], focus: { e: r.pick(p.props) } });
      });
      add({ place: 'bedtime', text: `What a big day! ${H} is sleepy now. Night night.`, cast: [hero.id], focus: { e: '🌙' } });
      break;
    }
    case 'counting': {
      title = `${H} Counts to Five`;
      const things = r.shuffle(COUNTABLES).slice(0, 5);
      const where = [...stops, r.pick(pool)];
      things.forEach((t, i) => {
        const s = where[i];
        add({ place: s, text: `${NUMBER_WORDS[i]} ${i ? t.many : t.one}! ${H} counts ${i ? 'them' : 'it'} ${at(s)}.`, cast: [hero.id, companion(i).id], focus: { e: t.e, count: i + 1 } });
      });
      add({ place: 'home', text: `One, two, three, four, five! Clever ${H}!`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '👏' } });
      break;
    }
    case 'colours': {
      title = `${H}’s Colourful Day`;
      const cols = r.shuffle(COLOURS).slice(0, 5);
      const where = [...stops, r.pick(pool)];
      cols.forEach((c, i) => {
        const t = r.pick(c.things);
        const s = where[i];
        add({ place: s, text: `${cap(c.name)}! ${H} sees ${/^[aeiou]/.test(c.name) ? 'an' : 'a'} ${c.name} ${t.n} ${at(s)}.`, cast: [hero.id, companion(i).id], focus: { e: t.e } });
      });
      add({ place: 'home', text: `Red, yellow, blue, green… So many colours, ${H}!`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '🌈' } });
      break;
    }
    case 'water': {
      title = `${H}’s Splash Day`;
      add({ place: 'home', text: `It’s hot, hot, hot! ${H} grabs a towel. It’s a splash day!`, cast: [hero.id, companion(0).id], focus: { e: '☀️' }, mood: 'starry' });
      stops.forEach((s, i) => {
        const p = place(s);
        add({ place: s, text: `${cap(p.at)}, ${H} and ${tok(companion(i))} ${r.pick(p.doing)}. ${r.pick(SPLASH)}`, cast: [hero.id, companion(i).id], focus: { e: r.pick(p.props) }, outfit: 'swimsuit', mood: i % 2 ? 'starry' : 'laugh' });
      });
      add({ place: 'home', text: `Wrapped in a big fluffy towel, ${H} is warm and sleepy. What a splash day!`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '🛁' }, mood: 'sleepy' });
      break;
    }
    case 'treasure': {
      title = `${H} and the Treasure Map`;
      add({ place: 'home', text: `${H} finds an old map with a big red X. It’s a treasure hunt!`, cast: [hero.id, companion(0).id], focus: { e: '🗺️' }, mood: 'wow', hat: 'bandana' });
      stops.slice(0, 3).forEach((s, i) => {
        const p = place(s);
        add({ place: s, text: `Is the treasure ${p.at}? Not here! Just ${r.pick(p.surprises)}.`, cast: [hero.id, companion(i + 1).id], focus: { e: r.pick(p.props) }, mood: i === 0 ? 'brave' : i === 1 ? 'worried' : 'brave', hat: 'bandana' });
      });
      const last = stops[3];
      add({ place: last, text: `X marks the spot ${at(last)}! Dig, dig, dig… Treasure! A chest full of ${r.pick(TREASURES)}!`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '💎' }, mood: 'starry', hat: 'bandana' });
      add({ place: 'home', text: `Brave ${H} shares the treasure with everyone. Ahoy!`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '🏴‍☠️' }, mood: 'proud', hat: 'bandana' });
      break;
    }
    case 'dinos': {
      title = `${H} and the Dinosaurs`;
      const dinos = r.shuffle(DINOS);
      add({ place: 'home', text: `${H} puts on a dinosaur suit. Stomp, stomp, ROAR!`, cast: [hero.id, companion(0).id], focus: { e: '🦖' }, outfit: 'dino', mood: 'laugh' });
      stops.forEach((s, i) => {
        add({ place: s, text: `${cap(at(s))}, ${H} finds ${dinos[i].n}${/[!?.]$/.test(dinos[i].n) ? '' : '.'} ${r.pick(['Stomp, stomp!', 'ROAR!', 'Wow!', 'Hello, dino!'])}`, cast: [hero.id, companion(i).id], focus: { e: dinos[i].e }, outfit: 'dino', mood: (['wow', 'laugh', 'starry', 'brave'] as Expression[])[i % 4] });
      });
      add({ place: 'bedtime', text: `Goodnight, dinosaurs! ${H} stomps all the way to bed. Roar… zzz.`, cast: [hero.id], focus: { e: '🦕' }, outfit: 'dino', mood: 'sleepy' });
      break;
    }
    case 'fair': {
      title = `${H} at the Fun Fair`;
      const rides = r.shuffle(FAIR).slice(0, 4);
      const spots = chosen.length ? stops : ['fair', 'fair', 'fair', 'fair'];
      add({ place: 'fair', text: `Music! Lights! ${H} and ${tok(companion(0))} are at the fun fair!`, cast: [hero.id, companion(0).id], focus: { e: '🎡' }, mood: 'starry' });
      rides.forEach((ride, i) => {
        const X = companion(i + 1);
        add({ place: spots[i], text: ride.t.replace(/\{H\}/g, H).replace(/\{X\}/g, tok(X)), cast: [hero.id, X.id], focus: { e: ride.e }, mood: (['laugh', 'wow', 'grin', 'proud'] as Expression[])[i % 4] });
      });
      add({ place: 'home', text: `What a day! ${H} hugs the new teddy all the way home.`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '🧸' }, mood: 'sleepy' });
      break;
    }
    case 'hero': {
      title = `Super ${H} Saves the Day`;
      const jobs = r.shuffle(RESCUES);
      add({ place: 'home', text: `${H} puts on a cape. Today, ${H} is a superhero!`, cast: [hero.id, companion(0).id], focus: { e: '⚡' }, outfit: 'hero', mood: 'brave' });
      stops.forEach((s, i) => {
        const j = jobs[i];
        add({ place: s, text: `${cap(at(s))}, ${j.p}! Super ${H} ${j.fix}.`, cast: [hero.id, companion(i).id], focus: { e: j.e }, outfit: 'hero', mood: i % 2 ? 'proud' : 'brave' });
      });
      add({ place: 'home', text: `Super ${H} saves the day! Now it’s time for a super snack.`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '🍪' }, outfit: 'hero', mood: 'proud' });
      break;
    }
    case 'space': {
      title = `${H}’s Rocket Ride`;
      const sky = chosen.length ? stops : ['space', 'moon', 'space', 'moon'];
      add({ place: 'home', text: `${H} builds a rocket out of a big cardboard box. 3, 2, 1… blast off!`, cast: [hero.id, companion(0).id], focus: { e: '🚀' }, mood: 'starry' });
      sky.forEach((s, i) => {
        const p = place(s);
        add({ place: s, text: `${cap(p.at)}, ${H} and ${tok(companion(i))} ${r.pick(p.doing)}. ${r.pick(['Whoa!', 'Zoom!', 'So high!', 'Beep boop!'])}`, cast: [hero.id, companion(i).id], focus: { e: r.pick(p.props) }, outfit: 'astronaut', mood: (['wow', 'laugh', 'starry', 'dreamy'] as Expression[])[i % 4] });
      });
      add({ place: 'bedtime', text: `Back home, ${H} looks up at the stars. Goodnight, moon. See you tomorrow!`, cast: [hero.id], focus: { e: '🌙' }, mood: 'dreamy' });
      break;
    }
    case 'feelings': {
      title = `How Does ${H} Feel?`;
      const fs = r.shuffle(FEELINGS).slice(0, 5);
      const where = [...stops, r.pick(pool)];
      fs.forEach((f, i) => {
        const s = where[i];
        const p = place(s);
        const why = f.why.replace(/\{H\}/g, H).replace('{X}', tok(companion(i))).replace('{doing}', r.pick(p.doing)).replace('{surprise}', r.pick(p.surprises).replace(/^just /, ''));
        add({ place: s, text: `${cap(p.at)}, ${why}. ${H} feels ${f.word}!`, cast: [hero.id, companion(i).id], focus: { e: r.pick(p.props) }, mood: f.mood });
      });
      add({ place: 'home', text: `Happy, silly, sleepy or shy… however ${H} feels, ${H} is loved.`, cast: [hero.id, ...others.slice(0, 2).map((c) => c.id)], focus: { e: '💛' }, mood: 'grin' });
      break;
    }
  }
  // moods for the classic stories
  if (['lost', 'hide'].includes(type) && pages.length) {
    pages[0].mood ??= 'worried';
    pages.slice(1, -1).forEach((p) => (p.mood ??= 'wow'));
    pages[pages.length - 1].mood ??= 'laugh';
  }
  if (type === 'foods') pages.forEach((p) => (p.mood ??= /Yuck|no thank|Bleh|Maybe|funny face/.test(p.text) ? 'silly' : 'grin'));
  if (type === 'hats') pages.forEach((p, i) => (p.mood ??= i % 2 ? 'proud' : 'laugh'));
  if (type === 'bedtime' || type === 'adventure') pages[pages.length - 1].mood ??= 'sleepy';
  if (type === 'animals') pages.forEach((p, i) => (p.mood ??= i % 2 ? 'wow' : 'laugh'));
  if (type === 'counting' || type === 'colours') pages[pages.length - 1].mood ??= 'proud';
  // the star's personality, in their own words, on the first page
  if (opts.heroLine && pages[0]) pages[0].text += ` ${opts.heroLine.replace(/\{H\}/g, H)}`;
  return { type, seed: opts.seed, title, pages };
}

/** A fresh version of one page, keeping its place and the story's pattern. */
export function regeneratePage(story: Story, index: number, cast: CastMember[], seed: number, extraPlaces?: Place[]): StoryPage {
  const again = generateStory(story.type, cast, { seed, places: [story.pages[index].place], extraPlaces });
  const candidate = again.pages[Math.min(index, again.pages.length - 1)];
  return { ...candidate, id: story.pages[index].id, place: story.pages[index].place };
}

/** Replace {@id} tokens with names. */
export function fill(text: string, cast: CastMember[]): string {
  return text.replace(/\{@([\w-]+)\}/g, (_, id) => cast.find((c) => c.id === id)?.call || 'someone');
}

/** Turn edited text back into tokens so later renames still flow through. Longest names first. */
export function tokenize(text: string, cast: CastMember[]): string {
  let out = text;
  [...cast].filter((c) => c.call.trim().length > 1).sort((a, b) => b.call.length - a.call.length).forEach((c) => {
    const re = new RegExp(`\\b${c.call.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    out = out.replace(re, `{@${c.id}}`);
  });
  return out;
}
