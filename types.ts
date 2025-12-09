export enum SentenceStructure {
  SV = '主谓 (SV)',
  SVO = '主谓宾 (SVO)',
  SP = '主系表 (SP)',
  SVOO = '主谓双宾 (SVOO)',
  SVOC = '主谓宾宾补 (SVOC)',
}

export enum GrammarRole {
  SUBJECT = '主语',
  PREDICATE = '谓语',
  OBJECT = '宾语',
  PREDICATIVE = '表语',
  ATTRIBUTE = '定语',
  ADVERBIAL = '状语',
  COMPLEMENT = '补语',
  LINK_VERB = '系动词',
  CONNECTIVE = '连接词/其他',
  ATTRIBUTIVE_CLAUSE = '定语从句',
  ADVERBIAL_CLAUSE = '状语从句',
}

export enum DifficultyLevel {
  BASIC = 'Basic',       // Level 1: Simple structures
  INTERMEDIATE = 'Intermediate', // Level 2: With modifiers
  ADVANCED = 'Advanced', // Level 3: With clauses
}

export interface WordToken {
  id: number;
  text: string;
}

export interface SentenceAnalysisData {
  originalSentence: string;
  words: string[];
  // Map of word index to its correct role
  wordRoles: Record<number, GrammarRole>; 
  structureType: SentenceStructure;
  // Indices of words that form the skeleton (main clause)
  skeletonIndices: number[];
  explanation: string;
  // Dynamic options for the UI
  options: string[];
  level?: DifficultyLevel; // Optional for backward compatibility
}

// State for the drag-and-drop game
export interface PlayerState {
  // Current mapping of word Index -> Role (for Phase 1)
  assignedRoles: Record<number, GrammarRole | null>;
  // Selected Structure (Phase 2)
  selectedStructure: SentenceStructure | null;
  // Skeleton slots: SlotName -> WordIndex[] (Phase 3)
  skeletonSlots: Record<string, number[]>;
}