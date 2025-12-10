/**
 * Intermediate级别Prompt模板
 */

export function getIntermediateLevelInstruction() {
  return `
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
}
