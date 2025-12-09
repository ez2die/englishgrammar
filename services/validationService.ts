import { SentenceAnalysisData, GrammarRole } from '../types';

// Common English prepositions
const PREPOSITIONS = new Set([
  'to', 'from', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'into', 'onto', 'upon', 'within', 'without', 'through', 'during', 'before',
  'after', 'above', 'below', 'under', 'over', 'across', 'around', 'behind',
  'beside', 'between', 'among', 'beyond', 'near', 'off', 'out', 'up', 'down',
  'along', 'toward', 'towards', 'via', 'per', 'except', 'including', 'concerning'
]);

// Roles that should be consistent within a prepositional phrase
const PHRASE_ROLES = {
  ADVERBIAL: GrammarRole.ADVERBIAL,
  ATTRIBUTE: GrammarRole.ATTRIBUTE,
};

// Roles that indicate skeleton components (should not be changed)
const SKELETON_ROLES = new Set([
  GrammarRole.SUBJECT,
  GrammarRole.PREDICATE,
  GrammarRole.OBJECT,
  GrammarRole.PREDICATIVE,
  GrammarRole.COMPLEMENT,
  GrammarRole.LINK_VERB,
]);

// Roles that indicate clauses (should not be changed)
const CLAUSE_ROLES = new Set([
  GrammarRole.ATTRIBUTIVE_CLAUSE,
  GrammarRole.ADVERBIAL_CLAUSE,
]);

/**
 * Check if a word is a preposition
 */
function isPreposition(word: string): boolean {
  return PREPOSITIONS.has(word.toLowerCase());
}

/**
 * Check if a word is punctuation or connective
 */
function isPunctuationOrConnective(role: GrammarRole): boolean {
  return role === GrammarRole.CONNECTIVE;
}

/**
 * Find all prepositional phrases in the sentence
 * Returns array of phrase ranges: [startIndex, endIndex]
 */
function findPrepositionalPhrases(
  words: string[],
  wordRoles: Record<number, GrammarRole>
): Array<[number, number]> {
  const phrases: Array<[number, number]> = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const role = wordRoles[i];
    
    // Skip if already part of a clause
    if (role && CLAUSE_ROLES.has(role)) {
      continue;
    }
    
    // Found a preposition
    if (isPreposition(word)) {
      let endIndex = i + 1;
      
      // Find the end of the prepositional phrase
      // It ends when we hit:
      // 1. Punctuation (except comma within phrase)
      // 2. Another preposition (new phrase starts)
      // 3. End of sentence
      // 4. A skeleton component (subject, predicate, object)
      // 5. A clause marker
      
      while (endIndex < words.length) {
        const nextWord = words[endIndex];
        const nextRole = wordRoles[endIndex];
        
        // Stop if we hit punctuation (but allow commas within phrase)
        if (nextWord === '.' || nextWord === '!' || nextWord === '?') {
          break;
        }
        
        // Stop if we hit another preposition (new phrase starts)
        if (isPreposition(nextWord)) {
          break;
        }
        
        // Stop if we hit a skeleton component
        if (nextRole && SKELETON_ROLES.has(nextRole)) {
          break;
        }
        
        // Stop if we hit a clause marker
        if (nextRole && CLAUSE_ROLES.has(nextRole)) {
          break;
        }
        
        // Stop if we hit a comma that might separate phrases
        if (nextWord === ',' && endIndex > i + 2) {
          // Check if comma is likely separating phrases
          // Simple heuristic: if there's content after comma, might be new phrase
          break;
        }
        
        endIndex++;
      }
      
      // Only add if phrase has at least 2 words (preposition + object)
      if (endIndex > i + 1) {
        phrases.push([i, endIndex - 1]);
      }
    }
  }
  
  return phrases;
}

/**
 * Determine if a prepositional phrase modifies a verb/adjective/sentence (状语)
 * or a noun (定语)
 * 
 * Heuristic approach:
 * - If phrase comes after a verb and before object/comma/end → likely 状语
 * - If phrase comes immediately after a noun → likely 定语
 * - If phrase comes at the end after object → likely 状语
 */
function determinePhraseFunction(
  phraseStart: number,
  phraseEnd: number,
  words: string[],
  wordRoles: Record<number, GrammarRole>,
  skeletonIndices: number[]
): 'adverbial' | 'attribute' {
  // Find the predicate (verb) index
  const predicateIndex = skeletonIndices.find(
    idx => wordRoles[idx] === GrammarRole.PREDICATE
  );
  
  // Find the object index
  const objectIndex = skeletonIndices.find(
    idx => wordRoles[idx] === GrammarRole.OBJECT
  );
  
  // If phrase comes after predicate and before/after object → likely 状语
  if (predicateIndex !== undefined && phraseStart > predicateIndex) {
    // If there's an object and phrase comes after it → likely 状语
    if (objectIndex !== undefined && phraseStart > objectIndex) {
      return 'adverbial';
    }
    // If phrase comes between predicate and object → might be 状语
    if (objectIndex === undefined || phraseEnd < objectIndex) {
      return 'adverbial';
    }
  }
  
  // If phrase comes immediately after a noun (subject or object) → likely 定语
  const subjectIndex = skeletonIndices.find(
    idx => wordRoles[idx] === GrammarRole.SUBJECT
  );
  
  if (subjectIndex !== undefined && phraseStart === subjectIndex + 1) {
    // Check if there's a comma separating them
    let hasComma = false;
    for (let i = subjectIndex + 1; i < phraseStart; i++) {
      if (words[i] === ',') {
        hasComma = true;
        break;
      }
    }
    if (!hasComma) {
      return 'attribute';
    }
  }
  
  if (objectIndex !== undefined && phraseStart === objectIndex + 1) {
    return 'attribute';
  }
  
  // Default: if phrase is at the end and after predicate → 状语
  if (predicateIndex !== undefined && phraseStart > predicateIndex) {
    return 'adverbial';
  }
  
  // Default to adverbial (more common for prepositional phrases)
  return 'adverbial';
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  issues: Array<{
    type: 'inconsistent_prepositional_phrase' | 'explanation_mismatch';
    phraseRange: [number, number];
    expectedRole: GrammarRole;
    actualRoles: Record<number, GrammarRole>;
    message: string;
  }>;
}

/**
 * Validate prepositional phrase consistency
 */
export function validatePrepositionalPhrases(
  data: SentenceAnalysisData
): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const phrases = findPrepositionalPhrases(data.words, data.wordRoles);
  
  for (const [start, end] of phrases) {
    const phraseRoles: Record<number, GrammarRole> = {};
    const rolesInPhrase = new Set<GrammarRole>();
    
    // Collect roles in the phrase
    for (let i = start; i <= end; i++) {
      const role = data.wordRoles[i];
      if (role && !isPunctuationOrConnective(role) && !CLAUSE_ROLES.has(role)) {
        phraseRoles[i] = role;
        rolesInPhrase.add(role);
      }
    }
    
    // Check if roles are consistent
    // A valid phrase should have:
    // - All words as 状语 (if modifying verb/adjective/sentence)
    // - All words as 定语 (if modifying noun)
    // - OR all words as part of a clause
    
    const hasAdverbial = rolesInPhrase.has(GrammarRole.ADVERBIAL);
    const hasAttribute = rolesInPhrase.has(GrammarRole.ATTRIBUTE);
    const hasMixed = hasAdverbial && hasAttribute;
    
    // If mixed roles, it's inconsistent
    if (hasMixed) {
      const expectedFunction = determinePhraseFunction(
        start,
        end,
        data.words,
        data.wordRoles,
        data.skeletonIndices
      );
      const expectedRole = expectedFunction === 'adverbial' 
        ? GrammarRole.ADVERBIAL 
        : GrammarRole.ATTRIBUTE;
      
      issues.push({
        type: 'inconsistent_prepositional_phrase',
        phraseRange: [start, end],
        expectedRole,
        actualRoles: phraseRoles,
        message: `Prepositional phrase "${data.words.slice(start, end + 1).join(' ')}" has mixed roles. Expected all words to be "${expectedRole}".`
      });
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Post-process roles to fix common errors in prepositional phrases
 */
export function postProcessRoles(
  data: SentenceAnalysisData
): SentenceAnalysisData {
  const phrases = findPrepositionalPhrases(data.words, data.wordRoles);
  const fixedRoles = { ...data.wordRoles };
  let fixed = false;
  
  for (const [start, end] of phrases) {
    // Skip if phrase is part of a clause
    let isInClause = false;
    for (let i = start; i <= end; i++) {
      const role = fixedRoles[i];
      if (role && CLAUSE_ROLES.has(role)) {
        isInClause = true;
        break;
      }
    }
    if (isInClause) continue;
    
    // Determine the function of this phrase
    const functionType = determinePhraseFunction(
      start,
      end,
      data.words,
      fixedRoles,
      data.skeletonIndices
    );
    
    const targetRole = functionType === 'adverbial' 
      ? GrammarRole.ADVERBIAL 
      : GrammarRole.ATTRIBUTE;
    
    // Check current roles
    const currentRoles = new Set<GrammarRole>();
    for (let i = start; i <= end; i++) {
      const role = fixedRoles[i];
      if (role && !isPunctuationOrConnective(role) && !CLAUSE_ROLES.has(role)) {
        currentRoles.add(role);
      }
    }
    
    const hasAdverbial = currentRoles.has(GrammarRole.ADVERBIAL);
    const hasAttribute = currentRoles.has(GrammarRole.ATTRIBUTE);
    const hasMixed = hasAdverbial && hasAttribute;
    
    // Fix if mixed or incorrect
    if (hasMixed || (!hasAdverbial && !hasAttribute && currentRoles.size > 0)) {
      // Check if any role is a skeleton role (don't change those)
      let hasSkeletonRole = false;
      for (let i = start; i <= end; i++) {
        const role = fixedRoles[i];
        if (role && SKELETON_ROLES.has(role)) {
          hasSkeletonRole = true;
          break;
        }
      }
      
      if (!hasSkeletonRole) {
        // Fix all non-punctuation, non-clause words in the phrase
        for (let i = start; i <= end; i++) {
          const role = fixedRoles[i];
          if (role && !isPunctuationOrConnective(role) && !CLAUSE_ROLES.has(role) && !SKELETON_ROLES.has(role)) {
            fixedRoles[i] = targetRole;
            fixed = true;
          }
        }
      }
    }
  }
  
  if (fixed) {
    console.log('[PostProcess] Fixed prepositional phrase inconsistencies');
  }
  
  return {
    ...data,
    wordRoles: fixedRoles
  };
}

