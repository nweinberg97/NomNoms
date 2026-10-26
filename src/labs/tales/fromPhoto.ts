/**
 * Sample photos for trying photo → character. The reading itself lives in
 * likeness/: on-device face landmarks → measurements → Character DNA.
 * (The old colour-threshold reader was removed: it never located a face, so
 * backgrounds and clothes were read as skin and hair.)
 */

/** Free sample photos from Unsplash (Unsplash License), used only in the demo to try photo → character. */
export const SAMPLE_PHOTOS: Record<string, { path: string; by: string }[]> = {
  baby: [
    { path: 'photo-1617331140180-e8262094733a', by: 'Christian Bowen' },
    { path: 'photo-1649880210584-3365f4c4c08b', by: 'Wesley Tingey' },
    { path: 'photo-1564228511755-8adafd74c14c', by: 'Henley Design Studio' },
  ],
  parent: [
    { path: 'photo-1570657891791-e39a9d185540', by: 'Raul Angel' },
    { path: 'photo-1542644425-bc949ec841a4', by: 'Kelly Sikkema' },
    { path: 'photo-1560707854-fb9a10eeaace', by: 'Jonathan Borba' },
  ],
  sibling: [
    { path: 'photo-1568385247005-0d371d214a2c', by: 'Juan Encalada' },
    { path: 'photo-1624272949900-9ae4c56397e8', by: 'Mieke Campbell' },
  ],
  friend: [
    { path: 'photo-1758513422399-68a0aff34c8d', by: 'Brooke Balentine' },
    { path: 'photo-1597117753473-9a20330f5fb7', by: 'Reynardo Etenia Wongso' },
  ],
  grandparent: [
    { path: 'photo-1742696405936-fe5ef4f37b4b', by: 'Jeferson Santu' },
    { path: 'photo-1652300353103-490b43ac8366', by: 'Tim Mossholder' },
  ],
  relative: [
    { path: 'photo-1583710457367-47de0ea21fef', by: 'Hollie Santos' },
    { path: 'photo-1554286421-8cfbce5c9740', by: 'Annie Spratt' },
  ],
  teacher: [
    { path: 'photo-1560707857-b897819e06fb', by: 'Jonathan Borba' },
  ],
  pet: [],
};

export const samplePhotoUrl = (path: string, size = 360) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&crop=faces&w=${size}&h=${size}&q=75`;
