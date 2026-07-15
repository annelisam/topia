// The quest catalog — one plain-language definition per way a quest can be
// completed. Client-safe (no db imports): the manage builder renders these as
// pickable cards, and Event Mode uses the same copy so hosts and guests read
// the same language. Verification stays the server's job (lib/events/quests.ts);
// this file is only naming, defaults, and hints.

export type QuestRule = { kind: string; count?: number };

export interface QuestTypeDef {
  id: string;
  verifyMethod: 'qr' | 'host' | 'auto';
  ruleKind?: string;
  counted?: boolean;      // rule carries a target count
  defaultCount?: number;
  icon: string;
  name: string;           // short card name in the builder
  how: string;            // host-facing: how this gets verified
  titleFor: (n: number) => string;
  descFor: (n: number) => string;
}

const people = (n: number) => (n === 1 ? '1 person' : `${n} people`);

export const QUEST_TYPES: QuestTypeDef[] = [
  {
    id: 'signup',
    verifyMethod: 'auto',
    ruleKind: 'signup',
    icon: '✍️',
    name: 'Sign up for Topia',
    how: 'Completes on its own — anyone with a Topia account has it the moment they open Event Mode. A perfect first win for newcomers.',
    titleFor: () => 'Sign up for Topia',
    descFor: () => "Create your Topia account. If you're reading this, you're already done.",
  },
  {
    id: 'follows',
    verifyMethod: 'auto',
    ruleKind: 'follows',
    counted: true,
    defaultCount: 5,
    icon: '🤝',
    name: 'Connect on Topia',
    how: 'Completes on its own once they’ve connected with that many people anywhere on Topia — a sent request counts.',
    titleFor: (n) => `Connect with ${people(n)} on Topia`,
    descFor: () => 'Send connection requests to people you want to stay in touch with — a sent request counts.',
  },
  {
    id: 'connections',
    verifyMethod: 'auto',
    ruleKind: 'connections',
    counted: true,
    defaultCount: 3,
    icon: '⚡',
    name: 'Meet people IRL',
    how: 'Completes on its own when they trade Topia QR scans with that many people at this event.',
    titleFor: (n) => `Meet ${people(n)} IRL`,
    descFor: () => 'Trade Topia QR scans with people you meet here — each scan connects you instantly.',
  },
  {
    id: 'dm',
    verifyMethod: 'auto',
    ruleKind: 'dm',
    counted: true,
    defaultCount: 1,
    icon: '💬',
    name: 'DM someone they met',
    how: 'Completes on its own when they message someone they met at this event.',
    titleFor: (n) => (n === 1 ? 'DM someone you met' : `DM ${n} people you met`),
    descFor: () => 'Send a message to someone you met tonight so the connection outlives the event.',
  },
  {
    id: 'checkin',
    verifyMethod: 'auto',
    ruleKind: 'checkin',
    icon: '🎟️',
    name: 'Check in at the door',
    how: 'Completes when you check them in at the door.',
    titleFor: () => 'Check in at the door',
    descFor: () => 'Find a host at the door and show your Topia code to get checked in.',
  },
  {
    id: 'qr',
    verifyMethod: 'qr',
    icon: '📍',
    name: 'Scan a QR at the venue',
    how: 'You post a printed QR somewhere at the venue; scanning it in Event Mode completes the quest. Great for scavenger hunts, booths, and photo spots.',
    titleFor: () => 'Find the hidden code',
    descFor: () => 'Somewhere at the venue is a Topia quest code. Find it and scan it.',
  },
  {
    id: 'host',
    verifyMethod: 'host',
    icon: '⭐',
    name: 'Host verified',
    how: 'You mark it done in person, right from this tab — for anything the app can’t see (dance, perform, bring a friend).',
    titleFor: () => '',
    descFor: () => '',
  },
];

export function questTypeById(id: string): QuestTypeDef | undefined {
  return QUEST_TYPES.find((t) => t.id === id);
}

// The one-tap "first night on Topia" journey — sign up → connect → meet IRL
// → DM. Order matters: it reads as a story on the guest's screen.
export const STARTER_PACK: { typeId: string; count?: number }[] = [
  { typeId: 'signup' },
  { typeId: 'follows', count: 5 },
  { typeId: 'connections', count: 3 },
  { typeId: 'dm', count: 1 },
];

/** Shared one-liner for a saved quest's verification, host- or guest-facing. */
export function describeQuestRule(verifyMethod: string, rule: QuestRule | null | undefined): string {
  if (verifyMethod === 'qr') return 'Scan the code at the venue';
  if (verifyMethod === 'host') return 'A host marks this done in person';
  const n = Math.max(1, Number(rule?.count ?? 1));
  switch (rule?.kind) {
    case 'signup': return 'Completes on its own — having an account counts';
    case 'checkin': return 'Completes at door check-in';
    case 'connections': return `Trade QR scans with ${people(n)} at this event`;
    case 'follows': return `Connect with ${people(n)} on Topia — a sent request counts`;
    case 'dm': return n === 1 ? 'Message someone you met at this event' : `Message ${n} people you met at this event`;
    default: return 'Completes automatically';
  }
}
