import type { ControlCatalog } from '../src/types';

const t = (id: string, en: string) => ({ id, en });

export const catalog: ControlCatalog = [
  { id: 'offline-backup', name: t('Backup offline', 'Offline backup'), description: t('Salinan data terpisah.', 'A separate data copy.') },
  { id: 'mfa', name: t('MFA', 'MFA'), description: t('Verifikasi dua langkah.', 'Two-step verification.') },
  { id: 'network-isolation', name: t('Isolasi jaringan', 'Network isolation'), description: t('Putuskan perangkat.', 'Disconnect the device.') },
];

/**
 * Small valid scenario:
 *   start --unplug(good,+10)--> mid --restore(good,+10)--> end-safe
 *   start --pay(bad,-10,[offline-backup,mfa])--> mid --tool(bad,-5,[offline-backup,network-isolation])--> end-haunted
 *   start --wait(neutral,0)--> end-partial
 */
export function makeScenarioJson() {
  return {
    id: 'test',
    title: t('Uji', 'Test'),
    start: 'start',
    nodes: {
      start: {
        room: 'detect',
        text: t('File terkunci.', 'Files are locked.'),
        choices: [
          { id: 'unplug', label: t('Cabut', 'Unplug'), next: 'mid', quality: 'good', score: 10, controls: [] as string[], feedback: t('Bagus.', 'Good.') },
          { id: 'pay', label: t('Bayar', 'Pay'), next: 'mid', quality: 'bad', score: -10, controls: ['offline-backup', 'mfa'], feedback: t('Buruk.', 'Bad.') },
          { id: 'wait', label: t('Tunggu', 'Wait'), next: 'end-partial', quality: 'neutral', score: 0, controls: [] as string[], feedback: t('Hmm.', 'Hmm.') },
        ],
      },
      mid: {
        room: 'recover',
        text: t('Pulihkan?', 'Recover?'),
        choices: [
          { id: 'restore', label: t('Pulihkan', 'Restore'), next: 'end-safe', quality: 'good', score: 10, controls: ['offline-backup'], feedback: t('Bagus.', 'Good.') },
          { id: 'tool', label: t('Alat gratis', 'Free tool'), next: 'end-haunted', quality: 'bad', score: -5, controls: ['offline-backup', 'network-isolation'], feedback: t('Buruk.', 'Bad.') },
        ],
      },
      'end-safe': { room: 'recover', ending: { type: 'safe', summary: t('Selamat.', 'Safe.') } },
      'end-partial': { room: 'recover', ending: { type: 'partial', summary: t('Setengah.', 'Partial.') } },
      'end-haunted': { room: 'recover', ending: { type: 'haunted', summary: t('Dihantui.', 'Haunted.') } },
    },
  };
}
