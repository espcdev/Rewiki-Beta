import React, { useState, useEffect } from 'react';
import { RewikiArticle } from '../types';
import { Button, Badge, Modal, Card } from './ui';
import { ArrowLeft, SplitSquareHorizontal, PenLine, Sparkles, CheckCircle2, AlertCircle, Lightbulb, GraduationCap, BrainCircuit, ArrowRight, History, Image as ImageIcon } from 'lucide-react';
import { analyzeRevision } from '../services/geminiService';

interface ArticleViewProps {
  article: RewikiArticle;
  onBack: () => void;
  onUpdateArticle: (updatedArticle: RewikiArticle) => void;
  onTopicClick: (topic: string) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ article, onBack, onUpdateArticle, onTopicClick }) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const [quizState, setQuizState] = useState<{ [key: number]: number | null }>({}); // questionIndex -> selectedOptionIndex
  
  // Image Error States
  const [imgError, setImgError] = useState(false);
  const [secImgError, setSecImgError] = useState(false);

  // Revision State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [editType, setEditType] = useState<'fix' | 'add'>('fix');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [revisionResult, setRevisionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Determine which image to show for primary header
  const activeImage = (!imgError && article.realImageUrl) ? article.realImageUrl : article.generatedImage;
  const isRealImage = !imgError && !!article.realImageUrl;

  // Localization Helpers
  const t = (key: string) => {
    const labels: Record<string, { en: string, es: string }> = {
      revise: { en: "Revise", es: "Editar" },
      compare: { en: "Compare", es: "Comparar" },
      back: { en: "Back", es: "Volver" },
      original: { en: "Original Wikipedia Style", es: "Estilo Wikipedia Original" },
      changes: { en: "Rewiki Changes", es: "Cambios Rewiki" },
      tldr: { en: "Summary", es: "Resumen" },
      verified: { en: "Verified Rewiki", es: "Rewiki Verificado" },
      updated: { en: "Updated", es: "Actualizado" },
      generated: { en: "AI Generated Diagram", es: "Diagrama generado por IA" },
      realImage: { en: "Web Image", es: "Imagen de la Web" },
      modalTitle: { en: "Propose a Change", es: "Proponer un cambio" },
      whyChange: { en: "Describe your change", es: "Describe tu cambio" },
      cancel: { en: "Cancel", es: "Cancelar" },
      apply: { en: "Analyze & Apply", es: "Analizar y Aplicar" },
      placeholder: { en: "This info is outdated...", es: "Esta información es antigua..." },
      didYouKnow: { en: "Did You Know?", es: "¿Sabías Que?" },
      homework: { en: "Homework Help", es: "Ayuda para tu Tarea" },
      generalEdit: { en: "General Edit", es: "Edición General" },
      quizTitle: { en: "Quick Quiz", es: "Test Rápido" },
      explore: { en: "Explore More", es: "Explorar Más" },
      fixInfo: { en: "Fix Information", es: "Corregir Información" },
      addSection: { en: "Add New Section", es: "Añadir Nueva Sección" },
      selectType: { en: "Revision Type", es: "Tipo de Revisión" }
    };
    return labels[key][article.language] || key;
  };

  // Selection Handler
  useEffect(() => {
    const handleSelection = () => {
      const activeSelection = window.getSelection();
      if (activeSelection && !activeSelection.isCollapsed && activeSelection.toString().length > 5 && activeSelection.rangeCount > 0) {
        const range = activeSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Only show if selection is within article content
        if (document.getElementById('article-content')?.contains(activeSelection.anchorNode?.parentElement || null)) {
           setSelection({
            text: activeSelection.toString(),
            top: rect.top + window.scrollY - 50,
            left: rect.left + (rect.width / 2) - 60
          });
        }
      } else {
        setSelection(null);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  const handleStartRevision = () => {
    setIsModalOpen(true);
    setEditType('fix'); // Default
  };

  const submitRevision = async () => {
    if (!revisionReason.trim()) return;

    setIsAnalyzing(true);
    setRevisionResult(null);

    try {
      const result = await analyzeRevision(
        JSON.stringify(article.sections),
        selection?.text || "General Article Update",
        revisionReason,
        article.language,
        editType
      );

      if (result.accepted) {
        setRevisionResult({ success: true, message: result.reasoning || "Revision Approved!" });
        
        setTimeout(() => {
          setIsModalOpen(false);
          setSelection(null);
          setRevisionReason('');
          setRevisionResult(null);
          
          let newSections = [...article.sections];

          if (editType === 'add' && result.newContent) {
             // Add new section
             newSections.push({
                id: Date.now().toString(),
                heading: "New Section", // Simplification: in real app AI would give heading too
                content: result.newContent
             });
          } else {
              // Fix existing
              newSections = article.sections.map(s => {
                if (selection && s.content.includes(selection.text)) {
                    return { ...s, content: result.newContent || s.content };
                }
                return s;
            });
            // If general update (no selection) and fix, update first section or summary (simplified)
            if (!selection && result.newContent && editType === 'fix') {
                 newSections[0].content = result.newContent;
            }
          }

          onUpdateArticle({
              ...article,
              sections: newSections,
              changeLog: `${article.changeLog} | ${editType === 'add' ? 'Added section' : 'Fixed info'}`
          });
          
        }, 1500);

      } else {
        setRevisionResult({ success: false, message: result.reasoning });
      }
    } catch (e) {
      setRevisionResult({ success: false, message: "Connection failed. Try again." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuizOption = (qIndex: number, oIndex: number) => {
      setQuizState(prev => ({ ...prev, [qIndex]: oIndex }));
  };

  return (
    <div className="min-h-screen pb-20 dark:text-white">
      {/* Selection Tooltip */}
      {selection && !isModalOpen && (
        <div 
            className="fixed z-50 animate-fade-in-up" 
            style={{ top: selection.top - 10, left: selection.left }}
        >
            <Button onClick={handleStartRevision} variant="primary" icon={PenLine} className="shadow-2xl scale-90">
                {t('revise')}
            </Button>
        </div>
      )}

      {/* Revision Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={t('modalTitle')}
      >
        <div className="space-y-4">
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-sm italic text-neutral-600 dark:text-neutral-400 border-l-4 border-black dark:border-white">
                {selection ? `"${selection.text}"` : <span className="not-italic font-medium">{t('generalEdit')}</span>}
            </div>

            {/* Edit Type Dropdown */}
            <div>
                 <label className="block text-sm font-semibold mb-2 dark:text-neutral-300">{t('selectType')}</label>
                 <div className="relative">
                    <select 
                        value={editType} 
                        onChange={(e) => setEditType(e.target.value as 'fix' | 'add')}
                        className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-black dark:focus:ring-white outline-none appearance-none dark:text-white"
                    >
                        <option value="fix">{t('fixInfo')}</option>
                        <option value="add">{t('addSection')}</option>
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-neutral-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                 </div>
            </div>
            
            <div>
                <label className="block text-sm font-semibold mb-2 dark:text-neutral-300">{t('whyChange')}</label>
                <textarea 
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-black dark:focus:ring-white outline-none min-h-[100px] dark:text-white"
                    placeholder={t('placeholder')}
                />
            </div>

            {revisionResult && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-sm ${revisionResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                    {revisionResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0"/> : <AlertCircle className="w-5 h-5 shrink-0"/>}
                    {revisionResult.message}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                <Button 
                    variant="primary" 
                    onClick={submitRevision} 
                    loading={isAnalyzing}
                    icon={Sparkles}
                    disabled={!revisionReason.trim()}
                >
                    {t('apply')}
                </Button>
            </div>
        </div>
      </Modal>

      {/* Sticky Action Bar */}
      <div className="sticky top-24 z-10 flex justify-center mb-8 px-4 pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-4xl pointer-events-auto">
            <Button variant="secondary" onClick={onBack} icon={ArrowLeft} className="backdrop-blur-md bg-white/80 dark:bg-neutral-900/80 shadow-sm">
                {t('back')}
            </Button>
        
            <div className="flex gap-2">
            <Button 
                variant="secondary" 
                onClick={handleStartRevision}
                icon={PenLine}
                className="backdrop-blur-md bg-white/80 dark:bg-neutral-900/80"
            >
                {t('revise')}
            </Button>

            <Button 
                variant={showOriginal ? "primary" : "secondary"} 
                onClick={() => setShowOriginal(!showOriginal)}
                icon={SplitSquareHorizontal}
                className={`w-36 transition-all duration-300 ${!showOriginal ? "backdrop-blur-md bg-white/80 dark:bg-neutral-900/80" : ""}`}
            >
                {showOriginal ? t('compare') : 'Rewiki'}
            </Button>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0">
        {/* Header Section */}
        <div className="space-y-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900">
                {t('verified')}
            </Badge>
            <span className="text-neutral-400 text-sm font-medium">{t('updated')} {article.lastUpdated}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-black dark:text-white leading-[1.1]">
            {article.topic}
          </h1>
        </div>

        {/* Featured Image (Real or Generated) */}
        {activeImage ? (
             <div className="w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 relative group bg-neutral-100 dark:bg-neutral-800">
                <img 
                    src={activeImage} 
                    alt={article.topic} 
                    className="w-full object-cover max-h-[500px]" 
                    onError={() => setImgError(true)}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-sm font-medium flex items-center gap-2">
                        {isRealImage ? <ImageIcon className="w-4 h-4"/> : <Sparkles className="w-4 h-4"/>} 
                        {isRealImage ? t('realImage') : t('generated')}
                    </p>
                </div>
                {/* Always visible badge for context */}
                <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/20">
                     {isRealImage ? 'WEB IMAGE' : 'AI GENERATED'}
                </div>
             </div>
        ) : (
             <div className="w-full h-64 bg-neutral-100 dark:bg-neutral-800 rounded-[2.5rem] flex items-center justify-center text-neutral-400">
                <span className="flex items-center gap-2"><Sparkles className="w-5 h-5"/> Image unavailable</span>
             </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="article-content">
          
          <div className="lg:col-span-3 space-y-8">
            
            {/* Summary */}
            <section className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                    <span className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-bold">TL</span>
                    {t('tldr')}
                  </h2>
              </div>
              <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
                <p className="text-xl leading-relaxed font-medium text-neutral-800 dark:text-neutral-200">
                  {article.summary}
                </p>
              </div>
            </section>

             {/* Comparison View */}
             {showOriginal && (
              <Card className="bg-neutral-50 border-neutral-200 dark:bg-black dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-neutral-500 uppercase tracking-widest text-xs">{t('original')}</h3>
                  <History className="w-4 h-4 text-neutral-400" />
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 font-serif leading-relaxed text-sm opacity-80">
                  {article.originalSnippet}
                </p>
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                   <h4 className="font-bold text-xs uppercase mb-2 text-neutral-500">{t('changes')}:</h4>
                   <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">"{article.changeLog}"</p>
                </div>
              </Card>
            )}

            {/* Sections Loop with Secondary Image Injection */}
            {article.sections.map((section, idx) => (
              <React.Fragment key={idx}>
                <section className="group relative">
                    <h3 className="text-2xl font-bold mb-3 mt-8 text-black dark:text-white">
                    {section.heading}
                    </h3>
                    <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed text-justify selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
                    {section.content}
                    </p>
                </section>

                {/* Secondary Image Injection Logic */}
                {((idx === 1 && article.sections.length >= 2) || (idx === 0 && article.sections.length < 2)) && article.secondaryImageUrl && !secImgError && (
                    <div className="my-12 relative w-full h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 group/sec">
                         <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/20 z-10">
                            MORE INFO
                        </div>
                        <img 
                            src={article.secondaryImageUrl} 
                            alt="Contextual"
                            onError={() => setSecImgError(true)}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/sec:scale-110" 
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                )}
              </React.Fragment>
            ))}

            {/* Did you know & Homework */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
               <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                  <h3 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3">
                     <Lightbulb className="w-5 h-5" /> {t('didYouKnow')}
                  </h3>
                  <p className="text-neutral-700 dark:text-neutral-300 italic text-lg">
                    "{article.didYouKnow}"
                  </p>
               </div>

               <div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                  <h3 className="font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-3">
                     <GraduationCap className="w-5 h-5" /> {t('homework')}
                  </h3>
                  <ul className="space-y-2">
                    {article.homeworkHelp?.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                            <span className="text-blue-500">•</span> {tip}
                        </li>
                    ))}
                  </ul>
               </div>
            </div>

            {/* Feature: Quiz */}
            {article.quiz && article.quiz.length > 0 && (
                <div className="mt-12 p-8 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white">
                        <BrainCircuit className="w-6 h-6" /> {t('quizTitle')}
                    </h3>
                    <div className="space-y-6">
                        {article.quiz.map((q, qIndex) => (
                            <div key={qIndex} className="space-y-3">
                                <p className="font-medium text-lg dark:text-neutral-200">{qIndex + 1}. {q.question}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {q.options.map((opt, oIndex) => {
                                        const isSelected = quizState[qIndex] === oIndex;
                                        const isCorrect = oIndex === q.correctAnswer;
                                        const showResult = quizState[qIndex] !== undefined && quizState[qIndex] !== null;
                                        
                                        let btnClass = "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700";
                                        if (showResult) {
                                            if (isCorrect) btnClass = "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-800 dark:text-green-300";
                                            else if (isSelected) btnClass = "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300";
                                            else btnClass = "opacity-50 dark:bg-neutral-800";
                                        }

                                        return (
                                            <button 
                                                key={oIndex}
                                                disabled={showResult}
                                                onClick={() => handleQuizOption(qIndex, oIndex)}
                                                className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${btnClass}`}
                                            >
                                                {opt}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Feature: Related Topics */}
            {article.relatedTopics && article.relatedTopics.length > 0 && (
                <div className="mt-12 pt-12 border-t border-neutral-100 dark:border-neutral-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4">{t('explore')}</h3>
                    <div className="flex flex-wrap gap-3">
                        {article.relatedTopics.map((topic, i) => (
                            <button 
                                key={i}
                                onClick={() => onTopicClick(topic)}
                                className="px-5 py-3 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium transition-colors flex items-center gap-2 dark:text-neutral-200 group"
                            >
                                {topic}
                                <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-12 text-center text-neutral-400 text-sm">
                <p>Rewiki content is generated by AI and verified by community revisions.</p>
                <p className="mt-2 text-xs">Images generated by Google Gemini.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};