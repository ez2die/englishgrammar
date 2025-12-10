import { GrammarRole } from '../types.js';

// Common English prepositions
const PREPOSITIONS = new Set([
  'to', 'from', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'into', 'onto', 'upon', 'within', 'without', 'through', 'during', 'before',
  'after', 'above', 'below', 'under', 'over', 'across', 'around', 'behind',
  'beside', 'between', 'among', 'beyond', 'near', 'off', 'out', 'up', 'down',
  'along', 'toward', 'towards', 'via', 'per', 'except', 'including', 'concerning'
]);

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

function isPreposition(word) {
  return PREPOSITIONS.has(word.toLowerCase());
}

function isPunctuationOrConnective(role) {
  return role === GrammarRole.CONNECTIVE;
}

function findPrepositionalPhrases(words, wordRoles) {
  const phrases = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const role = wordRoles[i];
    
    if (role && CLAUSE_ROLES.has(role)) {
      continue;
    }
    
    if (isPreposition(word)) {
      let endIndex = i + 1;
      
      while (endIndex < words.length) {
        const nextWord = words[endIndex];
        const nextRole = wordRoles[endIndex];
        
        if (nextWord === '.' || nextWord === '!' || nextWord === '?') {
          break;
        }
        
        if (isPreposition(nextWord)) {
          break;
        }
        
        if (nextRole && SKELETON_ROLES.has(nextRole)) {
          break;
        }
        
        if (nextRole && CLAUSE_ROLES.has(nextRole)) {
          break;
        }
        
        if (nextWord === ',' && endIndex > i + 2) {
          break;
        }
        
        endIndex++;
      }
      
      if (endIndex > i + 1) {
        phrases.push([i, endIndex - 1]);
      }
    }
  }
  
  return phrases;
}

function determinePhraseFunction(phraseStart, phraseEnd, words, wordRoles, skeletonIndices) {
  const predicateIndex = skeletonIndices.find(
    idx => wordRoles[idx] === GrammarRole.PREDICATE
  );
  
  const objectIndex = skeletonIndices.find(
    idx => wordRoles[idx] === GrammarRole.OBJECT
  );
  
  if (predicateIndex !== undefined && phraseStart > predicateIndex) {
    if (objectIndex !== undefined && phraseStart > objectIndex) {
      return 'adverbial';
    }
    if (objectIndex === undefined || phraseEnd < objectIndex) {
      return 'adverbial';
    }
  }
  
  const subjectIndex = skeletonIndices.find(
    idx => wordRoles[idx] === GrammarRole.SUBJECT
  );
  
  if (subjectIndex !== undefined && phraseStart === subjectIndex + 1) {
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
  
  if (predicateIndex !== undefined && phraseStart > predicateIndex) {
    return 'adverbial';
  }
  
  return 'adverbial';
}

export function validatePrepositionalPhrases(data) {
  const issues = [];
  const phrases = findPrepositionalPhrases(data.words, data.wordRoles);
  
  for (const [start, end] of phrases) {
    const phraseRoles = {};
    const rolesInPhrase = new Set();
    
    for (let i = start; i <= end; i++) {
      const role = data.wordRoles[i];
      if (role && !isPunctuationOrConnective(role) && !CLAUSE_ROLES.has(role)) {
        phraseRoles[i] = role;
        rolesInPhrase.add(role);
      }
    }
    
    const hasAdverbial = rolesInPhrase.has(GrammarRole.ADVERBIAL);
    const hasAttribute = rolesInPhrase.has(GrammarRole.ATTRIBUTE);
    const hasMixed = hasAdverbial && hasAttribute;
    
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

export function postProcessRoles(data) {
  const phrases = findPrepositionalPhrases(data.words, data.wordRoles);
  const fixedRoles = { ...data.wordRoles };
  let fixed = false;
  
  for (const [start, end] of phrases) {
    let isInClause = false;
    for (let i = start; i <= end; i++) {
      const role = fixedRoles[i];
      if (role && CLAUSE_ROLES.has(role)) {
        isInClause = true;
        break;
      }
    }
    if (isInClause) continue;
    
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
    
    const currentRoles = new Set();
    for (let i = start; i <= end; i++) {
      const role = fixedRoles[i];
      if (role && !isPunctuationOrConnective(role) && !CLAUSE_ROLES.has(role)) {
        currentRoles.add(role);
      }
    }
    
    const hasAdverbial = currentRoles.has(GrammarRole.ADVERBIAL);
    const hasAttribute = currentRoles.has(GrammarRole.ATTRIBUTE);
    const hasMixed = hasAdverbial && hasAttribute;
    
    if (hasMixed || (!hasAdverbial && !hasAttribute && currentRoles.size > 0)) {
      let hasSkeletonRole = false;
      for (let i = start; i <= end; i++) {
        const role = fixedRoles[i];
        if (role && SKELETON_ROLES.has(role)) {
          hasSkeletonRole = true;
          break;
        }
      }
      
      if (!hasSkeletonRole) {
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

