import { GrammarRole, SentenceStructure } from './types';

export const GRAMMAR_ROLES = [
  GrammarRole.SUBJECT,
  GrammarRole.PREDICATE,
  GrammarRole.OBJECT,
  GrammarRole.PREDICATIVE,
  GrammarRole.ATTRIBUTE,
  GrammarRole.ADVERBIAL,
  GrammarRole.COMPLEMENT,
  GrammarRole.LINK_VERB,
  GrammarRole.CONNECTIVE,
  GrammarRole.ATTRIBUTIVE_CLAUSE,
  GrammarRole.ADVERBIAL_CLAUSE,
];

export const SENTENCE_STRUCTURES = [
  SentenceStructure.SV,
  SentenceStructure.SVO,
  SentenceStructure.SP,
  SentenceStructure.SVOO,
  SentenceStructure.SVOC,
];

export const SKELETON_CONFIG: Record<SentenceStructure, string[]> = {
  [SentenceStructure.SV]: ['主语', '谓语'],
  [SentenceStructure.SVO]: ['主语', '谓语', '宾语'],
  [SentenceStructure.SP]: ['主语', '系动词', '表语'],
  [SentenceStructure.SVOO]: ['主语', '谓语', '间接宾语', '直接宾语'],
  [SentenceStructure.SVOC]: ['主语', '谓语', '宾语', '宾语补足语'],
};

export const SAMPLE_DATA_FALLBACK = {
  originalSentence: "The student finished the essay that was written on the desk.",
  words: ["The", "student", "finished", "the", "essay", "that", "was", "written", "on", "the", "desk", "."],
  wordRoles: {
    // "The" -> Attribute
    0: "定语", 
    // "student" -> Subject
    1: "主语", 
    // "finished" -> Predicate
    2: "谓语", 
    // "the" -> Attribute
    3: "定语", 
    // "essay" -> Object
    4: "宾语", 
    // "that was written on the desk" -> Attributive Clause
    5: "定语从句", 6: "定语从句", 7: "定语从句", 8: "定语从句", 9: "定语从句", 10: "定语从句", 
    // "." -> Other
    11: "连接词/其他"
  },
  structureType: "主谓宾 (SVO)",
  skeletonIndices: [1, 2, 4], // student, finished, essay
  explanation: "主干是: student (主语) finished (谓语) essay (宾语)。'that was written on the desk' 是定语从句，修饰 essay。",
  options: ["主语", "谓语", "宾语", "定语", "状语", "定语从句", "连接词/其他"]
};
