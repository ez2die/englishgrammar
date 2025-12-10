/**
 * Advanced级别Prompt模板
 */

export function getAdvancedLevelInstruction() {
  return `
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
