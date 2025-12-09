import React, { useState, useEffect, useRef } from 'react';
import { generateSentenceAnalysis } from './services/geminiService';
import { storageService } from './services/storageService';
import { SentenceAnalysisData, GrammarRole, SentenceStructure, DifficultyLevel } from './types';
import { GRAMMAR_ROLES, SENTENCE_STRUCTURES, SKELETON_CONFIG } from './constants';
import WordPill from './components/WordPill';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SentenceAnalysisData | null>(null);
  
  // Game State
  const [currentLevel, setCurrentLevel] = useState<DifficultyLevel | null>(null);
  
  // Phase 1: Sorting State
  const [sortingSelection, setSortingSelection] = useState<number[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Record<number, GrammarRole>>({});
  
  // Phase 2: Structure State
  const [selectedStructure, setSelectedStructure] = useState<SentenceStructure | null>(null);
  
  // Phase 3: Skeleton State
  const [skeletonSelection, setSkeletonSelection] = useState<number[]>([]);
  const [skeletonSlots, setSkeletonSlots] = useState<Record<string, number[]>>({});
  
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<string>(''); 

  // Drag and Drop State Ref (Only for Phase 1)
  const draggedIndicesRef = useRef<number[]>([]);

  const initGame = async (level: DifficultyLevel) => {
    // Capture current sentence before resetting state to avoid picking it again immediately
    const previousSentence = data?.originalSentence;

    setLoading(true);
    setSubmitted(false);
    setShowResult(false);
    setData(null);
    setCurrentLevel(level);
    
    // Reset game state
    setAssignedRoles({});
    setSelectedStructure(null);
    setSkeletonSlots({});
    setSortingSelection([]);
    setSkeletonSelection([]);
    setErrorMsg(null);
    setSourceInfo('');

    try {
      // Logic: 50% chance to use Bank if available for this level
      const bankSize = await storageService.getBankSize(level);
      const useBank = bankSize > 0 && Math.random() > 0.5;

      if (useBank) {
        // Pass previousSentence to exclude it
        const bankData = await storageService.getRandomQuestion(level, previousSentence);
        if (bankData) {
          await new Promise(resolve => setTimeout(resolve, 600));
          setData(bankData);
          setSourceInfo('Review Mode');
          setLoading(false);
          return;
        }
      }

      // Generate new
      const newData = await generateSentenceAnalysis(level);
      setData(newData);
      setSourceInfo('New Challenge');
      await storageService.saveQuestion(newData);

    } catch (e) {
      console.error(e);
      // Fallback to bank regardless of random chance if generate fails
      const bankData = await storageService.getRandomQuestion(level, previousSentence);
      if (bankData) {
         setData(bankData);
         setSourceInfo('Offline Mode');
         setErrorMsg("Connection failed. Loaded from history.");
      } else {
         setErrorMsg("Connection failed. Please check your internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  const returnToMenu = () => {
    setData(null);
    setCurrentLevel(null);
    setSubmitted(false);
    setShowResult(false);
  };

  useEffect(() => {
    // Initial load handled by user interaction
  }, []);

  // --- Phase 1: Sorting Interaction Handlers ---

  const handleSortingClick = (index: number) => {
    if (submitted) return;

    // If word is already in a basket, clicking it returns it to the bank (unassign)
    if (assignedRoles[index]) {
       setAssignedRoles(prev => {
         const next = { ...prev };
         delete next[index];
         return next;
       });
       return;
    }

    // Toggle selection for Sorting phase only
    setSortingSelection(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index];
    });
  };

  const assignSelectedToRole = (role: GrammarRole) => {
    if (sortingSelection.length === 0) return;

    setAssignedRoles(prev => {
      const next = { ...prev };
      sortingSelection.forEach(idx => {
        next[idx] = role;
      });
      return next;
    });
    setSortingSelection([]); // Clear selection after assignment
  };

  // --- Phase 1: Drag and Drop Handlers ---

  const onWordDragStart = (e: React.DragEvent, index: number) => {
    if (submitted) return;
    
    let indicesToDrag = [index];
    // Use sortingSelection state
    if (sortingSelection.includes(index)) {
      indicesToDrag = [...sortingSelection];
    } else {
      setSortingSelection([index]); 
      indicesToDrag = [index];
    }

    draggedIndicesRef.current = indicesToDrag;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(indicesToDrag));
  };

  const onBasketDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const onBasketDrop = (e: React.DragEvent, role: GrammarRole) => {
    e.preventDefault();
    if (submitted) return;

    const indices = draggedIndicesRef.current;
    if (indices.length > 0) {
      setAssignedRoles(prev => {
        const next = { ...prev };
        indices.forEach(idx => {
          next[idx] = role;
        });
        return next;
      });
      setSortingSelection([]); 
      draggedIndicesRef.current = [];
    }
  };

  // --- Phase 3: Skeleton Interaction Handlers ---

  const handleSkeletonClick = (index: number) => {
    if (submitted) return;
    
    // Toggle selection for Skeleton phase only
    setSkeletonSelection(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index];
    });
  };

  const addToSkeletonSlot = (slotName: string) => {
    if (skeletonSelection.length === 0) return;
    
    setSkeletonSlots(prev => {
      const currentList = prev[slotName] || [];
      const newIndices = skeletonSelection.filter(idx => !currentList.includes(idx));
      
      return {
        ...prev,
        [slotName]: [...currentList, ...newIndices].sort((a,b) => a - b)
      };
    });
    setSkeletonSelection([]); // Clear selection after adding to slot
  };

  const removeFromSkeletonSlot = (slotName: string, indexToRemove: number) => {
     if (submitted) return;
     setSkeletonSlots(prev => ({
       ...prev,
       [slotName]: (prev[slotName] || []).filter(i => i !== indexToRemove)
     }));
  };

  // --- Validation Helpers ---

  const getIsCorrect = (idx: number, correctRole: GrammarRole) => {
    if (!submitted) return null;
    const userRole = assignedRoles[idx];

    if (userRole === correctRole) return true;
    if (!userRole && correctRole === GrammarRole.CONNECTIVE) return true;
    return false;
  };
  
  const checkResults = () => {
    setSubmitted(true);
    setShowResult(true);
    // Auto scroll to bottom
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  // --- Render Helpers ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-600">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sky-500 mb-6"></div>
        <p className="text-xl font-bold text-slate-400 tracking-wide animate-pulse">CREATING LEVEL...</p>
      </div>
    );
  }

  // HOME SCREEN (Level Selection)
  if (!data && !loading) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
         {/* Decorative Background Circles */}
         <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-yellow-100 rounded-full opacity-50 pointer-events-none" />
         <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-sky-100 rounded-full opacity-50 pointer-events-none" />

         <div className="z-10 text-center max-w-md w-full animate-fade-in">
            <h1 className="text-5xl font-extrabold text-sky-500 mb-4 tracking-tight drop-shadow-sm">Syntax Master</h1>
            <p className="text-slate-500 mb-10 text-lg font-medium leading-relaxed">
              Select your difficulty level to begin practicing English sentence structure.
            </p>
            
            {errorMsg && (
                <div className="mb-6 bg-rose-100 text-rose-600 p-4 rounded-2xl border-2 border-rose-200 font-bold">
                    {errorMsg}
                </div>
            )}

            <div className="space-y-4">
              {/* Level 1: Basic */}
              <button 
                onClick={() => initGame(DifficultyLevel.BASIC)}
                className="w-full bg-green-500 hover:bg-green-400 text-white p-4 rounded-2xl border-b-[6px] border-green-700 active:border-b-0 active:translate-y-[6px] transition-all shadow-xl text-left flex items-center group"
              >
                <div className="bg-white/20 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🌱</span>
                </div>
                <div>
                  <div className="text-xl font-extrabold uppercase tracking-wide">Level 1: Basic</div>
                  <div className="text-green-100 text-sm font-semibold">Simple Structure (SVO)</div>
                </div>
              </button>

              {/* Level 2: Intermediate */}
              <button 
                onClick={() => initGame(DifficultyLevel.INTERMEDIATE)}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 p-4 rounded-2xl border-b-[6px] border-yellow-600 active:border-b-0 active:translate-y-[6px] transition-all shadow-xl text-left flex items-center group"
              >
                <div className="bg-white/20 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <div className="text-xl font-extrabold uppercase tracking-wide">Level 2: Modifiers</div>
                  <div className="text-yellow-800 text-sm font-semibold">Adjectives & Adverbs</div>
                </div>
              </button>

              {/* Level 3: Advanced */}
              <button 
                onClick={() => initGame(DifficultyLevel.ADVANCED)}
                className="w-full bg-rose-500 hover:bg-rose-400 text-white p-4 rounded-2xl border-b-[6px] border-rose-700 active:border-b-0 active:translate-y-[6px] transition-all shadow-xl text-left flex items-center group"
              >
                 <div className="bg-white/20 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <div className="text-xl font-extrabold uppercase tracking-wide">Level 3: Advanced</div>
                  <div className="text-rose-100 text-sm font-semibold">Clauses & Complex Sentences</div>
                </div>
              </button>
            </div>
         </div>
       </div>
     );
  }

  // Safe unwrap
  const currentData = data!;
  const displayOptions = currentData.options && currentData.options.length > 0 
      ? currentData.options 
      : GRAMMAR_ROLES;

  const unassignedIndices = currentData.words
    .map((_, idx) => idx)
    .filter(idx => !assignedRoles[idx]);

  return (
    <div className="min-h-screen bg-white text-slate-700 pb-40">
      {/* Header Bar */}
      <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <button 
               onClick={returnToMenu} 
               className="bg-slate-100 hover:bg-slate-200 text-slate-400 p-2 rounded-xl transition active:scale-95"
               title="Quit to Menu"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
             <div className="h-4 w-24 sm:w-48 bg-slate-200 rounded-full overflow-hidden relative">
                {/* Fake progress bar */}
                <div 
                    className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-500" 
                    style={{ width: submitted ? '100%' : selectedStructure ? '66%' : assignedRoles[0] ? '33%' : '10%' }}
                />
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             {currentLevel && (
                <span className={`
                  hidden sm:inline-block px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border-2
                  ${currentLevel === DifficultyLevel.BASIC ? 'bg-green-100 text-green-700 border-green-200' : ''}
                  ${currentLevel === DifficultyLevel.INTERMEDIATE ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                  ${currentLevel === DifficultyLevel.ADVANCED ? 'bg-rose-100 text-rose-700 border-rose-200' : ''}
                `}>
                    {currentLevel}
                </span>
             )}
             {sourceInfo && (
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-wider border-2 border-slate-200">
                    {sourceInfo}
                </span>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        
        {/* Original Sentence Display */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-500 uppercase tracking-wide">
            Original Sentence
          </h2>
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-2xl p-6 shadow-sm">
            <p className="text-2xl font-semibold text-slate-800 leading-relaxed text-center">
              {currentData.originalSentence}
            </p>
          </div>
        </section>
        
        {/* Step 1: Sorting Game */}
        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-700">
             Tap and organize the words
          </h2>

          {/* Word Bank (Source) */}
          <div className="min-h-[140px] p-6 rounded-3xl border-2 border-slate-200 bg-slate-50 relative">
             {unassignedIndices.length === 0 && !submitted && (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-lg opacity-50">
                    Great job! All words sorted.
                 </div>
             )}
             <div className="flex flex-wrap gap-1 justify-center relative z-10">
               {currentData.words.map((word, idx) => {
                 if (assignedRoles[idx]) return null;
                 return (
                   <WordPill 
                     key={idx}
                     index={idx}
                     text={word}
                     // Use sortingSelection for Phase 1
                     isSelected={sortingSelection.includes(idx)}
                     onClick={() => handleSortingClick(idx)}
                     draggable={!submitted}
                     onDragStart={onWordDragStart}
                   />
                 );
               })}
             </div>
          </div>

          {/* Baskets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
             {displayOptions.map(role => {
               const assignedIndices = currentData.words
                  .map((_, idx) => idx)
                  .filter(idx => assignedRoles[idx] === role);

               return (
                 <div 
                   key={role}
                   onDragOver={onBasketDragOver}
                   onDrop={(e) => onBasketDrop(e, role as GrammarRole)}
                   onClick={() => !submitted && assignSelectedToRole(role as GrammarRole)}
                   className={`
                     flex flex-col min-h-[120px] rounded-2xl transition-all duration-200 relative
                     ${submitted ? 'border-2 border-slate-100' : 'cursor-pointer active:scale-95'}
                     ${assignedIndices.length > 0 
                        ? 'bg-sky-50 border-2 border-sky-200' 
                        : 'bg-white border-2 border-dashed border-slate-300 hover:bg-slate-50 hover:border-slate-400'}
                   `}
                 >
                   {/* Label */}
                   <div className="px-4 py-3 text-center">
                      <span className={`text-sm font-extrabold uppercase tracking-wide ${assignedIndices.length > 0 ? 'text-sky-600' : 'text-slate-400'}`}>
                        {role}
                      </span>
                   </div>

                   {/* Items */}
                   <div className="p-2 flex flex-wrap justify-center content-start flex-grow gap-1">
                      {assignedIndices.map(idx => {
                        const isCorrect = getIsCorrect(idx, currentData.wordRoles[idx]);
                        return (
                          <WordPill 
                            key={idx}
                            index={idx}
                            text={currentData.words[idx]}
                            assignedRole={role as GrammarRole} 
                            correctRoleLabel={currentData.wordRoles[idx]}
                            isCorrect={isCorrect}
                            // Baskets use handleSortingClick too (to unassign)
                            onClick={() => handleSortingClick(idx)}
                            draggable={false} 
                          />
                        );
                      })}
                   </div>
                 </div>
               );
             })}
          </div>
        </section>

        {/* Step 2: Structure Type */}
        <section className="space-y-4">
           <h2 className="text-2xl font-extrabold text-slate-700">
               Identify the structure
           </h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {SENTENCE_STRUCTURES.map(st => (
               <label 
                  key={st} 
                  className={`
                    relative flex items-center p-4 rounded-2xl border-2 border-b-4 cursor-pointer transition-all active:border-b-2 active:translate-y-[2px]
                    ${selectedStructure === st 
                        ? 'bg-sky-100 border-sky-400 border-b-sky-500' 
                        : 'bg-white border-slate-200 border-b-slate-300 hover:bg-slate-50'}
                  `}
               >
                 <input 
                   type="radio" 
                   name="structure" 
                   value={st} 
                   checked={selectedStructure === st}
                   onChange={() => !submitted && setSelectedStructure(st)}
                   disabled={submitted}
                   className="hidden" // Hide default radio
                 />
                 <div className={`
                    w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center
                    ${selectedStructure === st ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'}
                 `}>
                    {selectedStructure === st && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                 </div>
                 <span className={`font-bold text-lg ${selectedStructure === st ? 'text-sky-700' : 'text-slate-600'}`}>{st}</span>
               </label>
             ))}
           </div>
           
           {submitted && (
              <div className={`mt-4 p-4 rounded-xl border-2 ${selectedStructure === currentData.structureType ? 'bg-green-100 border-green-400 text-green-800' : 'bg-rose-100 border-rose-400 text-rose-800'}`}>
                {selectedStructure === currentData.structureType ? (
                   <span className="font-extrabold flex items-center gap-2">
                       <span className="text-2xl">✓</span> Excellent! Correct structure.
                   </span>
                ) : (
                   <span className="font-bold">
                       Not quite. The correct structure is: {currentData.structureType}
                   </span>
                )}
              </div>
           )}
        </section>

        {/* Step 3: Skeleton */}
        {selectedStructure && (
          <section className="space-y-4 animate-fade-in">
             <h2 className="text-2xl font-extrabold text-slate-700">
                Build the skeleton
             </h2>
             
             {/* Read-only Selection Strip - Independent of Phase 1 */}
             <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 flex flex-wrap gap-1 justify-center">
                {currentData.words.map((word, idx) => (
                   <WordPill 
                     key={idx}
                     index={idx}
                     text={word}
                     // Use skeletonSelection for Phase 3
                     isSelected={skeletonSelection.includes(idx)}
                     onClick={() => !submitted && handleSkeletonClick(idx)}
                     isSkeletonMode={true}
                     isInSkeletonSlot={Object.values(skeletonSlots).flat().includes(idx)}
                   />
                ))}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {SKELETON_CONFIG[selectedStructure].map(slot => (
                 <div key={slot} className="flex flex-col">
                   <div className="text-xs font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">{slot}</div>
                   <div 
                     onClick={() => !submitted && addToSkeletonSlot(slot)}
                     className={`
                        min-h-[80px] rounded-2xl border-2 p-2 flex flex-wrap content-start gap-1 cursor-pointer transition-all
                        ${(skeletonSlots[slot] || []).length > 0 ? 'bg-white border-slate-300' : 'bg-slate-100 border-dashed border-slate-300 hover:bg-slate-50'}
                     `}
                   >
                     {(skeletonSlots[slot] || []).map(idx => (
                       <div key={idx} onClick={(e) => { e.stopPropagation(); removeFromSkeletonSlot(slot, idx); }}>
                          <span className="inline-block bg-white border-2 border-b-4 border-slate-200 text-slate-700 px-3 py-1 rounded-xl text-sm font-bold active:border-b-2 active:translate-y-[2px]">
                             {currentData.words[idx]}
                          </span>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          </section>
        )}

        {/* Results Analysis */}
        {showResult && (
          <div className="bg-slate-800 text-white rounded-3xl p-8 shadow-2xl animate-fade-in space-y-6">
            <h3 className="text-2xl font-extrabold text-yellow-400">Analysis Feedback</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-400 text-sm uppercase tracking-widest mb-2">Meaning</h4>
                <p className="text-lg text-slate-100 font-medium leading-relaxed">{currentData.explanation}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-700/50 border-2 border-slate-600">
                <h4 className="font-bold text-slate-400 text-sm uppercase tracking-widest mb-3">Core Skeleton</h4>
                <div className="flex flex-wrap gap-2 text-lg">
                   {currentData.skeletonIndices.map(idx => (
                     <span key={idx} className="bg-sky-500 text-white px-3 py-1 rounded-lg font-bold shadow-md">
                       {currentData.words[idx]}
                     </span>
                   ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Sticky Footer for Action */}
      <footer className={`
        fixed bottom-0 left-0 w-full bg-white border-t-2 border-slate-200 p-4 z-50 transition-transform duration-300
        ${(selectedStructure || showResult) ? 'translate-y-0' : 'translate-y-full'}
      `}>
          <div className="max-w-3xl mx-auto flex gap-4">
             {!submitted ? (
                <button 
                    onClick={checkResults}
                    className="flex-1 bg-green-500 hover:bg-green-400 text-white text-lg font-extrabold py-3 rounded-2xl border-b-[4px] border-green-700 active:border-b-0 active:translate-y-[4px] uppercase tracking-widest shadow-lg"
                >
                    Check Answer
                </button>
             ) : (
                <button 
                    onClick={() => initGame(currentLevel!)}
                    className="flex-1 bg-sky-500 hover:bg-sky-400 text-white text-lg font-extrabold py-3 rounded-2xl border-b-[4px] border-sky-700 active:border-b-0 active:translate-y-[4px] uppercase tracking-widest shadow-lg"
                >
                    Next Challenge
                </button>
             )}
          </div>
      </footer>
    </div>
  );
};

export default App;