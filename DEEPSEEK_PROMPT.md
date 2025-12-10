# DeepSeek API Prompt 完整版

## System Prompt（系统提示词）

```
You are an expert English grammar teacher helping students understand sentence structure. 
Your task is to generate English sentences and analyze their grammatical structure, focusing on identifying the skeleton (main structure) versus modifiers and clauses.
```

---

## User Prompt（用户提示词）- Intermediate 级别

```
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

Return the result in JSON format with these exact field names:
- "originalSentence": The complete English sentence
- "words": Array of words/punctuation tokens
- "wordRoles": Array of grammatical roles (matching words array)
- "structureType": One of [主谓 (SV), 主谓宾 (SVO), 主系表 (SP), 主谓双宾 (SVOO), 主谓宾宾补 (SVOC)]
- "skeletonIndices": Array of indices for skeleton words
- "explanation": Brief explanation in Chinese
- "options": Array of role strings for UI buttons

CRITICAL: Use "originalSentence" (not "sentence") and "structureType" (not "mainClauseStructure").

IMPORTANT: Return a valid JSON object with these exact field names:
- "originalSentence": The original English sentence to analyze
- "words": Array of words/punctuation tokens from the sentence
- "wordRoles": Array of grammatical roles corresponding index-by-index to the words array. Each element should be one of: 主语, 谓语, 宾语, 表语, 定语, 状语, 补语, 系动词, 连接词/其他, 定语从句, 状语从句
- "structureType": The main sentence structure type
- "skeletonIndices": Indices of words that form the skeleton (main structure)
- "explanation": Brief explanation in Chinese explaining the skeleton and modifiers/clauses
- "options": List of unique role strings for UI buttons, including all used roles plus 2-3 distractors

The JSON must use these exact field names: originalSentence, words, wordRoles, structureType, skeletonIndices, explanation, options.
Do NOT use alternative names like "sentence" or "mainClauseStructure".
```

---

## 使用方法

### 在 DeepSeek Chat 中使用：

1. **设置 System Prompt**（如果有 system role 选项）：
   ```
   You are an expert English grammar teacher helping students understand sentence structure. 
   Your task is to generate English sentences and analyze their grammatical structure, focusing on identifying the skeleton (main structure) versus modifiers and clauses.
   ```

2. **发送 User Prompt**（上面的完整 User Prompt）

3. **要求 JSON 格式输出**：
   - 确保返回的是纯 JSON，不要包含 markdown 代码块标记
   - 字段名必须完全匹配：`originalSentence`, `structureType` 等

---

## 预期输出格式

```json
{
  "originalSentence": "The talented musician from our small town played a beautiful melody with incredible skill.",
  "words": ["The", "talented", "musician", "from", "our", "small", "town", "played", "a", "beautiful", "melody", "with", "incredible", "skill", "."],
  "wordRoles": ["定语", "定语", "主语", "定语", "定语", "定语", "定语", "谓语", "定语", "定语", "宾语", "状语", "状语", "状语", "连接词/其他"],
  "structureType": "主谓宾 (SVO)",
  "skeletonIndices": [2, 7, 10],
  "explanation": "这是一个主谓宾结构。主语是'musician'，谓语是'played'，宾语是'melody'。'The talented'和'from our small town'都是修饰主语的定语。'a beautiful'修饰宾语。'with incredible skill'是修饰谓语的状语。",
  "options": ["主语", "谓语", "宾语", "定语", "状语", "表语", "补语"]
}
```

---

## 注意事项

1. **字段名必须完全匹配**：使用 `originalSentence` 而不是 `sentence`，使用 `structureType` 而不是 `mainClauseStructure`
2. **JSON 格式**：返回纯 JSON，不要包含 markdown 代码块标记（```json）
3. **数组长度匹配**：`words` 和 `wordRoles` 数组长度必须完全一致
4. **结构类型**：`structureType` 必须是枚举值之一：`主谓 (SV)`, `主谓宾 (SVO)`, `主系表 (SP)`, `主谓双宾 (SVOO)`, `主谓宾宾补 (SVOC)`
