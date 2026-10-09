/**
 * Real photos for the demo family, served by Unsplash's image CDN
 * (free to use under the Unsplash License: https://unsplash.com/license).
 *
 * Each demo media key (e.g. `morning-01`, the poster of `clip-03`) maps to an
 * Unsplash photo. Photos are cropped to the shape the demo data declares
 * (4:5 portrait, 4:3 landscape for keys ending in a multiple of 4) with face-
 * aware cropping, so stored dimensions stay true. If a photo can't load
 * (offline, blocked), the generated image in public/demo is shown instead.
 */

type Photo = [path: string, by: string];

export const DEMO_PHOTOS: Record<string, Photo> = {
  // September: arrival
  'morning-01': ['photo-1552819289-e14fbbcea868', 'Hu Chen'],
  'linen-02': ['photo-1582486225644-aeacf6aa0b1b', 'Nathan Dumlao'],
  'window-01': ['photo-1652300353103-490b43ac8366', 'Tim Mossholder'],
  'window-02': ['photo-1742696405936-fe5ef4f37b4b', 'Jeferson Santu'],
  'night-01': ['photo-1770059706518-ece8f7264055', 'Ana Curcan'],
  'clip-01': ['photo-1480985041486-c65b20c01d1f', 'Tim Bish'],
  'window-03': ['photo-1665578325705-cfe6de3ae2eb', 'Silverius Trandafir'],
  'linen-01': ['photo-1686668108538-5c53fdcad4c6', 'Jennifer Kalenberg'],
  'window-04': ['photo-1692165027673-50d64cbe6372', 'Jennifer Kalenberg'],
  'morning-02': ['photo-1609220361594-efc1c6c90b5d', 'Nathan Dumlao'],
  'morning-03': ['photo-1630305130592-210da48f151e', 'Nihal Karkala'],
  'linen-03': ['photo-1545877790-63898f6ff403', 'Minnie Zhou'],
  'window-05': ['photo-1773243086594-43577199874f', 'Olivia Anne Snyder'],
  // October
  'autumn-01': ['photo-1761047321237-8802251ca084', 'Arthur Tseng'],
  'autumn-02': ['photo-1790009336272-bca5c0b297d9', 'Stefan Vibes'],
  'autumn-03': ['photo-1770954179504-56ab8179b899', 'Brooke Balentine'],
  'clip-02': ['photo-1584876632773-97fd85a5e89e', 'hessam nabavi'],
  'linen-04': ['photo-1580301762395-21ce84d00bc6', 'Marcel Fagin'],
  'window-06': ['photo-1774041259458-1b5be7f70704', 'Ana Curcan'],
  'morning-06': ['photo-1620737007484-2d3bd3079a35', 'Apostolos Vamvouras'],
  'linen-05': ['photo-1596629040517-2f0b5b853834', 'Reynardo Etenia Wongso'],
  'autumn-04': ['photo-1762343285989-adf247690cb5', 'Zulfugar Karimov'],
  'morning-04': ['photo-1649880210584-3365f4c4c08b', 'Wesley Tingey'],
  'morning-05': ['photo-1617331140180-e8262094733a', 'Christian Bowen'],
  'autumn-05': ['photo-1510516863697-99224a43369f', 'Lydia Winters'],
  'autumn-06': ['photo-1634567480800-764937b2af70', 'Christopher Luther'],
  // November
  'clip-04': ['photo-1765956133242-c1cc7d56f040', 'Lv Bowen'],
  'linen-06': ['photo-1470116945706-e6bf5d5a53ca', 'Aditya Romansa'],
  'window-07': ['photo-1542644425-bc949ec841a4', 'Kelly Sikkema'],
  'window-08': ['photo-1560707857-b897819e06fb', 'Jonathan Borba'],
  'morning-07': ['photo-1570657891791-e39a9d185540', 'Raul Angel'],
  'night-02': ['photo-1774041339881-612c8685f8d8', 'Ana Curcan'],
  'bokeh-01': ['photo-1543342384-1f1350e27861', 'Kelly Sikkema'],
  'bokeh-02': ['photo-1685580388390-576100ae9ce3', 'Philip White'],
  'autumn-07': ['photo-1652217627250-0dd21428e0f3', 'Tim Mossholder'],
  'autumn-08': ['photo-1668959395378-634c7afbe333', 'Nadiia Shuran'],
  // December
  'linen-07': ['photo-1764860051875-dcf0bbc9b3af', 'Marius Muresan'],
  'holiday-01': ['photo-1672188883351-4c135eeea809', 'DESIGNECOLOGIST'],
  'winter-01': ['photo-1765283336881-67ed84a9a6ea', 'Daisy D'],
  'winter-02': ['photo-1612192767258-7521fb20c048', 'Christian Bowen'],
  'winter-03': ['photo-1643664157682-e823ee08df39', 'Christopher Luther'],
  'winter-04': ['photo-1644067094214-2d8f803b4b2e', 'Sina Katirachi'],
  'clip-07': ['photo-1643664157724-c94116cff16c', 'Christopher Luther'],
  'night-03': ['photo-1504151932400-72d4384f04b3', 'Picsea'],
  'holiday-02': ['photo-1640461557835-76d31915ddbd', 'Chuko Cribb'],
  'holiday-03': ['photo-1515010543550-499bc79da43d', 'Oleg Sergeichik'],
  'holiday-05': ['photo-1672188909193-457696df0fef', 'DESIGNECOLOGIST'],
  'clip-06': ['photo-1640461557978-3d97cb775d14', 'Chuko Cribb'],
  'holiday-04': ['photo-1757029264433-0522d01e65d4', 'Tim Mossholder'],
  // January – February
  'clip-05': ['photo-1564228511755-8adafd74c14c', 'Henley Design Studio'],
  'winter-05': ['photo-1631391153473-0acaab2b8484', 'KaroGraphix Photography'],
  'morning-08': ['photo-1756758169354-08d04a1d832c', 'Alfonso Scarpa'],
  'linen-08': ['photo-1608365151231-7dbed3034787', 'Daniel Thomas'],
  'linen-09': ['photo-1617268604962-a2878c372cc7', 'tian dayong'],
  'winter-06': ['photo-1546193229-e200b04daf4e', 'Paige Cody'],
  'winter-07': ['flagged/photo-1572584414396-ac50cafdffe9', 'Todd Trapani'],
  'clip-08': ['photo-1757693075405-f0b9f605af19', 'Josh Duncan'],
  'morning-09': ['photo-1530047625168-4b29bfbbe1fc', 'Omar Lopez'],
  'window-09': ['photo-1588495644862-6ad15ab88352', 'Daniil Silantev'],
  'winter-08': ['photo-1606946185142-7b30e9a7abcc', 'Jimmy Conover'],
  // March – April
  'morning-10': ['photo-1652480247284-a7ca2c1ffecc', 'Toa Heftiba'],
  'linen-10': ['photo-1544829832-c8047d6b9d89', 'hui sang'],
  'garden-01': ['photo-1786634921379-98be2b78a1bf', 'K Atkinson'],
  'garden-02': ['photo-1503431760783-91f2569f6802', 'Manuel Schinner'],
  'window-10': ['photo-1633306002639-c9d74c129347', 'Derek Owens'],
  'garden-03': ['photo-1508882747552-5bd783c3f581', 'Picsea'],
  'garden-04': ['photo-1729874655043-4359bf0a283f', 'Aleksandra Sapozhnikova'],
  'garden-05': ['photo-1697751228979-ca968ceabe02', 'Kat van der Linden'],
  'garden-06': ['photo-1760633549190-6f184e88d640', 'Mushvig Niftaliyev'],
  'tooth-01': ['photo-1663435538397-822d13e4fe18', 'E Hillsley'],
  'night-04': ['photo-1758698856229-6f3dfd08fcc7', 'Marius Muresan'],
  // May – June
  'clip-09': ['photo-1774641373954-d2034269a9fe', 'Brooke Balentine'],
  'garden-07': ['photo-1583710457367-47de0ea21fef', 'Hollie Santos'],
  'clip-10': ['photo-1503284116362-30c49f508156', 'Kevin Gent'],
  'garden-08': ['photo-1681311311149-7254102442de', 'Reba Spike'],
  'garden-09': ['photo-1786488763143-032122d47f7c', 'K Atkinson'],
  'field-01': ['photo-1774041553414-ff8f10546d82', 'Ana Curcan'],
  'field-02': ['photo-1681311311317-a0561a8eef74', 'Reba Spike'],
  'field-03': ['photo-1762343283077-69b7b947c52e', 'Zulfugar Karimov'],
  'garden-10': ['photo-1599479404101-ef8066308b72', 'hessam nabavi'],
  'field-04': ['photo-1605812830455-2fadc55bc4ba', 'Kelly Sikkema'],
  'stand-01': ['photo-1763013259109-098bf7856e08', 'Brooke Balentine'],
  'stand-02': ['photo-1568992258159-5f8bd73bb995', 'Rodrigo Pereira'],
  'field-05': ['photo-1758513422399-68a0aff34c8d', 'Brooke Balentine'],
  // July – August
  'beach-01': ['photo-1634845965031-c47a09f22ac2', 'Beau Horyza'],
  'beach-02': ['flagged/photo-1560362812-2a0d481068ab', 'Robert Boston'],
  'beach-03': ['photo-1645458460679-8c860b064df7', 'Christopher Luther'],
  'beach-04': ['photo-1696596160153-607445545300', 'Kelsey Farish'],
  'clip-11': ['photo-1512846947153-55eb89716f77', 'Jordan Christian'],
  'beach-05': ['photo-1624538551648-75c3b857a36c', 'Megs Mulcahy'],
  'beach-06': ['photo-1770261430778-20c3875ca095', 'Alexander Mass'],
  'beach-07': ['photo-1645458460519-32e8dd8b90b1', 'Christopher Luther'],
  'beach-08': ['photo-1685326480610-90023e19220d', 'Holly Landkammer'],
  'field-06': ['photo-1504151864552-57020b6b876b', 'Picsea'],
  'clip-12': ['photo-1610194978275-8eee57ceafdd', 'Jochen van Wylick'],
  'bokeh-03': ['photo-1557939663-0619f304af9c', 'Troy T'],
  'eleven-01': ['photo-1568385247005-0d371d214a2c', 'Juan Encalada'],
  'clip-13': ['photo-1762922542177-689d5b007e61', 'Jessie Maxwell'],
  'haircut-01': ['photo-1657880493946-f828074ceec3', 'Sushil Basnet'],
  // September: one year
  'bokeh-04': ['photo-1757693075207-32944391b4de', 'Josh Duncan'],
  'bokeh-05': ['photo-1757693075165-228a9952e054', 'Josh Duncan'],
  'bokeh-06': ['photo-1568711493643-5fe9a72246c9', 'Eilis Garvey'],
  'bday-04': ['photo-1774041553363-91587c367692', 'Ana Curcan'],
  'night-05': ['photo-1647550551777-e8269393cdd9', 'Laura Ohlman'],
  'autumn-09': ['photo-1790009336255-bfd77f244203', 'Stefan Vibes'],
  'glasses-01': ['photo-1599082779777-8edeb377cdef', 'Jimmy Conover'],
  'night-06': ['photo-1669663981491-da97174e21a3', 'Ashley Nicole'],
};

/** Keys added for real photos that have no generated stand-in of their own. */
export const LOCAL_STAND_IN: Record<string, string> = {
  'tooth-01': 'morning-01', 'glasses-01': 'morning-03', 'stand-01': 'window-02', 'stand-02': 'window-05',
  'eleven-01': 'window-08', 'haircut-01': 'window-09', 'bday-04': 'field-02',
};

/** `morning-04.jpg`, `morning-04.thumb.jpg`, `clip-03.jpg` → `morning-04` / `clip-03`. */
export const demoKey = (file: string) => file.replace(/(\.thumb)?\.(jpg|mp4)$/, '');

/** Unsplash URL for a demo file, cropped to its declared shape; undefined for clips' video files. */
export function demoPhotoUrl(file: string): string | undefined {
  if (file.endsWith('.mp4')) return undefined;
  const key = demoKey(file);
  const p = DEMO_PHOTOS[key];
  if (!p) return undefined;
  const thumb = file.includes('.thumb.');
  const landscape = !key.startsWith('clip-') && parseInt(key.split('-')[1], 10) % 4 === 0;
  const [w, h] = landscape ? [1440, 1080] : [1080, 1350];
  const k = thumb ? 0.36 : 1;
  return `https://images.unsplash.com/${p[0]}?auto=format&fit=crop&crop=faces,entropy&w=${Math.round(w * k)}&h=${Math.round(h * k)}&q=${thumb ? 70 : 80}`;
}

export const DEMO_PHOTO_CREDITS = [...new Set(Object.values(DEMO_PHOTOS).map(([, by]) => by))].sort((a, b) => a.localeCompare(b));
