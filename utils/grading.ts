import { GrammarRole } from '../types';

// Core skeleton roles — these ARE the learning objective, so they're graded strictly.
const CORE_ROLES: GrammarRole[] = [
  GrammarRole.SUBJECT,
  GrammarRole.PREDICATE,
  GrammarRole.OBJECT,
  GrammarRole.PREDICATIVE,
  GrammarRole.LINK_VERB,
  GrammarRole.COMPLEMENT,
];

// Modifier / adjunct roles — treated as one interchangeable family, so a learner
// isn't penalized for 定语 vs 状语 nuances or for labeling a word inside an
// adverbial clause as 状语 instead of its fine-grained role.
export const MODIFIER_ROLES: GrammarRole[] = [
  GrammarRole.ATTRIBUTE,
  GrammarRole.ADVERBIAL,
  GrammarRole.ATTRIBUTIVE_CLAUSE,
  GrammarRole.ADVERBIAL_CLAUSE,
];

// Function words that are too pedantic to grade (articles / determiners).
const DETERMINERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'some', 'any', 'no', 'every', 'each', 'all', 'both', 'either', 'neither', 'another', 'such',
]);

/** A token made up only of punctuation/symbols (no letters or digits). */
export function isPunctuation(word: string): boolean {
  return !!word && !/[\p{L}\p{N}]/u.test(word);
}

/** An article / determiner (case-insensitive, punctuation-stripped). */
export function isDeterminer(word: string): boolean {
  return DETERMINERS.has((word || '').toLowerCase().replace(/[^a-z]/g, ''));
}

/**
 * Whether a word participates in role scoring at all.
 * Excluded (not counted, shown neutrally): punctuation, articles/determiners,
 * and anything whose answer-key role is 连接词/其他.
 */
export function isGraded(word: string, keyRole: GrammarRole): boolean {
  if (keyRole === GrammarRole.CONNECTIVE) return false;
  if (isPunctuation(word)) return false;
  if (isDeterminer(word)) return false;
  return true;
}

/**
 * Lenient correctness for a graded word.
 * - Core skeleton roles: exact match required.
 * - Modifier roles: any modifier role accepted (定语/状语/定语从句/状语从句 互通).
 */
export function isRoleAcceptable(keyRole: GrammarRole, userRole: GrammarRole | null | undefined): boolean {
  if (!userRole) return false;
  if (userRole === keyRole) return true;
  if (MODIFIER_ROLES.includes(keyRole) && MODIFIER_ROLES.includes(userRole)) return true;
  return false;
}

export { CORE_ROLES };
