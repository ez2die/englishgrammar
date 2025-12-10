/**
 * Basic级别Prompt模板
 */

export function getBasicLevelInstruction() {
  return `
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
}
