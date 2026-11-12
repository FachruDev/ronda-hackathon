import type { BilingualText, EndingType, Lang, Room } from '@ronda/engine';

/** Every piece of app copy that is not scenario content (REQ-7.4.3). */
const UI_STRINGS = {
  appTitle: { id: 'Rumah Hantu Ransomware', en: 'Ransomware Haunted House' },
  brand: { id: 'Ronda', en: 'Ronda' },
  problemStatement: {
    id: 'Kalau file tokomu tiba-tiba terkunci malam ini, apa yang kamu lakukan?',
    en: 'If your shop’s files suddenly locked up tonight, what would you do?',
  },
  intro: {
    id: 'Gladi singkat 5 menit. Setiap keputusan buruk memanggil hantu, dan setiap hantu mengajarkan satu langkah pengaman.',
    en: 'A short 5-minute drill. Every bad decision summons a ghost, and every ghost teaches one safeguard.',
  },
  fictionNote: {
    id: 'Semua kejadian dan nama dalam gladi ini fiktif.',
    en: 'All events and names in this drill are fictional.',
  },
  start: { id: 'Mulai gladi', en: 'Start the drill' },
  language: { id: 'Bahasa', en: 'Language' },
  progressOf: { id: 'Ruangan {n} dari {total}', en: 'Room {n} of {total}' },
  houseLabel: { id: 'Denah rumah: ruangan yang sudah dilewati', en: 'House map: rooms visited so far' },
  situation: { id: 'Situasi', en: 'Situation' },
  choices: { id: 'Pilihanmu', en: 'Your choices' },
  goodChoice: { id: 'Langkah yang tepat', en: 'Good move' },
  neutralChoice: { id: 'Lumayan', en: 'Not bad' },
  badChoice: { id: 'Hantu datang', en: 'A ghost appears' },
  missingControl: { id: 'Yang seharusnya ada:', en: 'What should have been in place:' },
  points: { id: '{delta} poin', en: '{delta} points' },
  continue: { id: 'Lanjutkan', en: 'Continue' },
  seeResult: { id: 'Lihat hasil', en: 'See the result' },
  score: { id: 'Skor akhir', en: 'Final score' },
  missedControls: { id: 'Yang terlewat', en: 'What you missed' },
  noneMissed: {
    id: 'Tidak ada. Kamu memilih langkah yang tepat di setiap ruangan.',
    en: 'Nothing. You made the right call in every room.',
  },
  print: { id: 'Cetak checklist', en: 'Print checklist' },
  playAgain: { id: 'Main lagi', en: 'Play again' },
  checklistTitle: { id: 'Checklist ronda untuk tokomu', en: 'Night-watch checklist for your shop' },
  checklistIntro: {
    id: 'Tempel di dekat komputer kasir. Centang setiap langkah yang sudah siap sebelum kejadian sungguhan.',
    en: 'Stick this near the till. Tick each step once it is in place, before the real thing happens.',
  },
  checklistMissed: { id: 'Terlewat saat gladi', en: 'Missed in the drill' },
  checklistRest: { id: 'Sudah tepat saat gladi, tetap periksa', en: 'Handled in the drill, still check' },
  loadError: {
    id: 'Skenario gladi tidak valid, jadi permainan tidak bisa dimulai. Detail kesalahan:',
    en: 'The drill scenario is invalid, so the game cannot start. Error details:',
  },
  'room.detect': { id: 'Deteksi', en: 'Detect' },
  'room.isolate': { id: 'Isolasi', en: 'Isolate' },
  'room.communicate': { id: 'Komunikasi', en: 'Communicate' },
  'room.recover': { id: 'Pemulihan', en: 'Recover' },
  'ending.safe': { id: 'Rumah selamat', en: 'The house is safe' },
  'ending.partial': { id: 'Setengah selamat', en: 'Half saved' },
  'ending.haunted': { id: 'Rumah dikuasai hantu', en: 'The house is haunted' },
} satisfies Record<string, BilingualText>;

export type UIKey = keyof typeof UI_STRINGS;

/** Looks up a UI string and fills `{name}` placeholders. */
export function t(key: UIKey, lang: Lang, vars: Record<string, string | number> = {}): string {
  return UI_STRINGS[key][lang].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export const roomKey = (room: Room): UIKey => `room.${room}`;
export const endingKey = (type: EndingType): UIKey => `ending.${type}`;

export const ROOM_ORDER: Room[] = ['detect', 'isolate', 'communicate', 'recover'];
