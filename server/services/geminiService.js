import { GoogleGenAI, Type } from "@google/genai";
import { SentenceStructure, GrammarRole, DifficultyLevel } from "../types.js";
import { SAMPLE_DATA_FALLBACK } from "../constants.js";
import { validatePrepositionalPhrases, postProcessRoles } from "./validationService.js";

// Ensure API key is available (support both API_KEY and GEMINI_API_KEY)
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateSentenceAnalysis = async (level) => {
  if (!apiKey || !ai) {
    console.warn("No API Key found, using fallback data.");
    return { ...SAMPLE_DATA_FALLBACK, level };
  }

  let levelInstruction = "";
  if (level === DifficultyLevel.BASIC) {
    levelInstruction = `
      Generate a SIMPLE English sentence suitable for Grade 7.
      - It MUST be a simple sentence with ONE main clause.
      - NO subordinate clauses (no 'which', 'that', 'because', etc.).
      - NO complex modifiers. Keep adjectives and adverbs simple.
      - Focus on clear S-V, S-V-O, S-V-P structures.
      - **IMPORTANT**: Use DIVERSE topics and themes. Avoid overusing common examples like "dog chases cat" or "fox jumps over dog".
      - Vary topics across: daily activities, nature, school, hobbies, food, travel, technology, sports, art, etc.
      - Examples of good variety:
        * "The student completed the homework."
        * "My grandmother bakes delicious cookies."
        * "The artist painted a beautiful landscape."
        * "Children play games in the playground."
        * "The chef prepared fresh ingredients."
    `;
  } else if (level === DifficultyLevel.INTERMEDIATE) {
    levelInstruction = `
      Generate an INTERMEDIATE English sentence suitable for Grade 8.
      - It MUST contain RICH MODIFIERS (Adjectives, Adverbs, Prepositional Phrases).
      - NO subordinate clauses (avoid 'which', 'who', 'although' clauses).
      - The challenge should be distinguishing modifiers (Attributes/Adverbials) from the skeleton.
      - **IMPORTANT**: Use DIVERSE topics and themes. Avoid repetitive examples.
      - Vary topics across: daily activities, nature, school, hobbies, food, travel, technology, sports, art, etc.
      - Example: "The very old man in the park walked slowly towards the bench."
      - Other good examples:
        * "The talented musician from our small town played a beautiful melody with incredible skill."
        * "Students in the library read books quietly during lunch break."
        * "The experienced chef prepared delicious meals for the restaurant guests."
    `;
  } else {
    // Advanced
    levelInstruction = `
      Generate a COMPLEX English sentence suitable for Grade 9.
      - The sentence MUST contain at least one SUBORDINATE CLAUSE (e.g., Attributive/Relative Clause or Adverbial Clause).
      - It should challenge the student to identify the main skeleton amidst the clauses.
      - **IMPORTANT**: Use DIVERSE topics and themes. Avoid repetitive examples.
      - Vary topics across: academic subjects, history, science, literature, current events, professional contexts, etc.
      - Examples:
        * "The researcher, who had spent years studying climate change, published important findings."
        * "Although the project seemed difficult at first, the team completed it successfully."
        * "Students who study regularly tend to perform better on exams."
    `;
  }

  const prompt = `
    ${levelInstruction}
    
    Then, analyze this sentence structure focusing on "Skeleton vs. Modifiers vs. Clauses".
    
    1. Split the sentence into individual words/punctuation (tokens).
    
    2. Assign a grammatical role to EACH word based on these rules:
    
       - **Skeleton (Core) Components**: Identify the HEAD word for:
         * Subject (主语)
         * Predicate/Verb (谓语)
         * Object (宾语)
         * Predicative (表语)
         * Complement (补语) - Note: Object Complement (宾语补足语) in SVOC structure should be marked as '补语'.
         * Link Verb (系动词) - for 'be', 'become', 'seem', etc.
         * **Appositive (同位语)**: If a noun/noun phrase renames or explains another noun immediately before it, mark it as '定语' (e.g., "My friend John" → "John" is '定语', not a separate subject).
         
       - **Clauses (Complex Modifiers)**: If a modifier is a COMPLETE CLAUSE (contains its own subject/verb structure, introduced by that, which, who, when, because, if, etc.):
         * Mark **EVERY word** in a Relative Clause as '定语从句' (Attributive Clause).
         * Mark **EVERY word** in an Adverbial Clause as '状语从句' (Adverbial Clause).
         * **DO NOT** break down the internal grammar of the clause. (e.g., inside "that I like", mark 'that', 'I', 'like' ALL as '定语从句').
         * **CRITICAL**: Even if a clause contains prepositional phrases, participle phrases, or other modifiers INSIDE it, mark ALL words in the clause with the clause role. Do NOT separately mark internal phrases within a clause.
           - Example: "the man who lives in the city" → "who", "lives", "in", "the", "city" are ALL '定语从句', not '定语从句' + '定语'.
         * ONLY use these clause roles if the difficulty level is Advanced. If Basic/Intermediate, these shouldn't exist.
         
       - **Phrases (Simple Modifiers)**: If a modifier is NOT a clause (e.g., adjectives, prepositional phrases, participle phrases, infinitive phrases):
         * Mark **EVERY word** in the phrase as '定语' (Attribute) if it modifies a Noun.
         * Mark **EVERY word** in the phrase as '状语' (Adverbial) if it modifies a Verb/Adjective/Sentence.
         
         * **CRITICAL for Prepositional Phrases**: For prepositional phrases (e.g., "to the eager archaeologists", "in the park"), determine the role based on what the ENTIRE phrase modifies in the sentence, NOT based on the internal structure of the phrase. 
           - If the prepositional phrase modifies a verb/adjective/sentence, mark ALL words in the phrase (including the preposition, articles, adjectives, and nouns) as '状语'.
           - If the prepositional phrase modifies a noun, mark ALL words in the phrase as '定语'.
           - Do NOT mark words inside the prepositional phrase as '定语' just because they modify the noun within the phrase when the whole phrase modifies a verb.
           - Example: "He put the book on the table" → "on the table" modifies "put" (verb), so ALL words ("on", "the", "table") are '状语'.
           - Example: "the book on the table" → "on the table" modifies "book" (noun), so ALL words ("on", "the", "table") are '定语'.
         
         * **CRITICAL for Participle Phrases**: For participle phrases (present participle "-ing" or past participle "-ed"), determine the role based on what the ENTIRE phrase modifies:
           - If modifying a noun: mark ALL words in the phrase as '定语' (e.g., "the man walking in the park" → "walking", "in", "the", "park" are all '定语').
           - If modifying a verb/sentence: mark ALL words in the phrase as '状语' (e.g., "Walking quickly, he arrived" → "Walking", "quickly" are all '状语').
         
         * **CRITICAL for Infinitive Phrases**: For infinitive phrases ("to + verb"), determine the role based on what the ENTIRE phrase functions as:
           - If the infinitive phrase is an adverbial (modifying verb/adjective/sentence): mark ALL words as '状语' (e.g., "He came to help me" → "to", "help", "me" are all '状语').
           - If the infinitive phrase is an object/complement: mark ALL words as the corresponding skeleton role (e.g., "I want to buy a book" → "to buy a book" is object, so "to", "buy", "a", "book" are all '宾语').
           - If the infinitive phrase modifies a noun: mark ALL words as '定语' (e.g., "the book to read" → "to", "read" are all '定语').
         
         * **CRITICAL for Adjective Phrases**: When multiple words form an adjective phrase (e.g., "very big", "extremely important"), mark ALL words in the phrase with the same role:
           - If the adjective phrase modifies a noun: ALL words are '定语' (e.g., "the very big dog" → "very", "big" are both '定语').
           - If the adjective phrase is a predicative: ALL words are '表语' (e.g., "He is very big" → "very", "big" are both '表语').
         
         * **CRITICAL for Adverb Phrases**: When multiple words form an adverb phrase (e.g., "very quickly", "quite slowly"), mark ALL words as '状语' if the phrase modifies a verb/adjective/sentence.
         
         * **CRITICAL for Coordinating Conjunctions in Phrases**: When "and"/"or" connects words within a phrase (not connecting main clauses), mark the conjunction as the SAME role as the words it connects:
           - Example: "big and small dogs" → "big", "and", "small" are all '定语'.
           - Example: "slowly and carefully" → "slowly", "and", "carefully" are all '状语'.
         
       - **Connective/Other**: Use '连接词/其他' ONLY for:
         * Punctuation marks (commas, periods, etc.)
         * Coordinating conjunctions (and, but, or) that connect two MAIN clauses (not words or phrases within a clause)
         * Example: "He ran, and she walked" → "and" is '连接词/其他' because it connects two main clauses.
         * Example: "He ran and walked" → "and" is NOT '连接词/其他', it's part of the predicate phrase.
    
    3. Return 'wordRoles' as an ordered list of strings corresponding exactly to the 'words' list.
    
    4. Determine the **Main Clause Structure** from: [主谓 (SV), 主谓宾 (SVO), 主系表 (SP), 主谓双宾 (SVOO), 主谓宾宾补 (SVOC)].
    
    5. Identify the 'skeletonIndices': The indices of the HEAD words that make up the main structure (S, V, O, etc.).
    
    6. Provide a brief explanation in Chinese explaining the skeleton and, if applicable, identifying the clauses or modifiers.

    7. Generate 'options': A list of unique strings for UI buttons. Include all used roles + 2-3 distractors.

    Return the result in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalSentence: { type: Type.STRING },
            words: { type: Type.ARRAY, items: { type: Type.STRING } },
            wordRoles: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of grammatical roles corresponding index-by-index to the words array."
            },
            structureType: { type: Type.STRING, enum: [
              "主谓 (SV)", "主谓宾 (SVO)", "主系表 (SP)", "主谓双宾 (SVOO)", "主谓宾宾补 (SVOC)"
            ]},
            skeletonIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            explanation: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["originalSentence", "words", "wordRoles", "structureType", "skeletonIndices", "explanation", "options"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const data = JSON.parse(jsonText);

    // Log AI's raw output for debugging
    console.log('[AI Raw Output] Sentence:', data.originalSentence);
    console.log('[AI Raw Output] Structure:', data.structureType);
    console.log('[AI Raw Output] Skeleton Indices:', data.skeletonIndices);
    console.log('[AI Raw Output] Word Roles:', data.wordRoles);

    // Normalize wordRoles: Convert array to Record<number, GrammarRole>
    const normalizedRoles = {};
    if (Array.isArray(data.wordRoles)) {
      data.wordRoles.forEach((role, index) => {
        normalizedRoles[index] = role;
      });
    }

    // Safety fallback for structure type
    const validStructures = Object.values(SentenceStructure);
    let structure = data.structureType;
    if (!validStructures.includes(structure)) {
        structure = SentenceStructure.SVO; // Default fallback
    }

    let result = {
      originalSentence: data.originalSentence,
      words: data.words,
      wordRoles: normalizedRoles,
      structureType: structure,
      skeletonIndices: data.skeletonIndices,
      explanation: data.explanation,
      options: data.options || [],
      level: level
    };

    // Post-process to fix common errors
    const beforePostProcess = JSON.parse(JSON.stringify(result)); // Deep copy for comparison
    result = postProcessRoles(result);
    
    // Log if post-processing made changes
    const rolesChanged = JSON.stringify(beforePostProcess.wordRoles) !== JSON.stringify(result.wordRoles);
    const skeletonChanged = JSON.stringify(beforePostProcess.skeletonIndices) !== JSON.stringify(result.skeletonIndices);
    const structureChanged = beforePostProcess.structureType !== result.structureType;
    
    if (rolesChanged || skeletonChanged || structureChanged) {
      console.log('[PostProcess] Changes detected:');
      if (rolesChanged) {
        console.log('  - Word roles changed');
        console.log('    Before:', beforePostProcess.wordRoles);
        console.log('    After:', result.wordRoles);
      }
      if (skeletonChanged) {
        console.log('  - Skeleton indices changed');
        console.log('    Before:', beforePostProcess.skeletonIndices);
        console.log('    After:', result.skeletonIndices);
      }
      if (structureChanged) {
        console.log('  - Structure type changed');
        console.log('    Before:', beforePostProcess.structureType);
        console.log('    After:', result.structureType);
      }
    }

    // Validate and log issues
    const validation = validatePrepositionalPhrases(result);
    if (!validation.isValid) {
      console.warn('[Validation] Found prepositional phrase inconsistencies:');
      validation.issues.forEach(issue => {
        console.warn(`  - ${issue.message}`);
        console.warn(`    Phrase: "${result.words.slice(issue.phraseRange[0], issue.phraseRange[1] + 1).join(' ')}"`);
        console.warn(`    Expected: ${issue.expectedRole}, Actual: ${Object.values(issue.actualRoles).join(', ')}`);
      });
    }

    return result;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

