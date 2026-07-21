/**
 * The Topia team, in display order, keyed by IMMUTABLE user id.
 *
 * Do NOT key this off `username` — handles are user-editable, and a member
 * changing theirs silently drops them off /about (avatar falls back to an
 * initial and their profile link 404s). Ids never change.
 *
 * Everything else (name, avatar, role tags, current username) is read live
 * from the users row by /api/team.
 */
export const TEAM: ReadonlyArray<{ id: string; title: string }> = [
  { id: '1e0be527-08c7-43c0-a794-12b7f183f893', title: 'CEO' }, // LATASHÁ
  { id: 'eae7dc40-6ae7-413b-b0f7-c9b59a5c1baa', title: 'Chief Technology Officer' }, // Annelisa
  { id: '3541f373-6c9b-43d5-8869-1d4604bdec97', title: 'Chief Marketing Officer' }, // Jada
  { id: 'a41b27f4-bce1-40cb-87dc-7cdc304cd797', title: 'Chief Creative Officer' }, // Jah.
  { id: '5f1c351c-d267-4469-bae0-12668d390569', title: 'Community Lead / Executive' }, // dae.
  { id: 'ddf93e54-f625-41da-928b-17375eca06b8', title: 'Executive Producer' }, // C.Y. Lee
];
