import React, { useState, useCallback, useEffect } from 'react';
import { Search, Sparkles, BookOpen, Menu, User, ArrowRight, X, Moon, Sun, Info, Globe, Clock, Check, FileText, Zap, History as HistoryIcon } from 'lucide-react';
import { generateRewikiArticle } from './services/geminiService';
import { RewikiArticle, ViewState, Language } from './types';
import { ArticleView } from './components/ArticleView';
import { ArticleSkeleton, Button, Card } from './components/ui';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [currentArticle, setCurrentArticle] = useState<RewikiArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('rewiki_theme') === 'dark');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('rewiki_lang') as Language) || 'es');
  const [history, setHistory] = useState<RewikiArticle[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('rewiki_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error("Failed to load history"); }
    }
  }, []);

  // Save history
  const addToHistory = (article: RewikiArticle) => {
    setHistory(prev => {
       const filtered = prev.filter(a => a.topic !== article.topic);
       const updated = [article, ...filtered].slice(0, 10); // Keep last 10
       localStorage.setItem('rewiki_history', JSON.stringify(updated));
       return updated;
    });
  };

  // Handle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rewiki_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rewiki_theme', 'light');
    }
  }, [darkMode]);

  // Handle Language Persist
  useEffect(() => {
    localStorage.setItem('rewiki_lang', language);
  }, [language]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = useCallback(async (e?: React.FormEvent, topicOverride?: string) => {
    if (e) e.preventDefault();
    const query = topicOverride || searchQuery;
    if (!query.trim()) return;

    setViewState(ViewState.LOADING);
    setError(null);
    setIsMenuOpen(false);
    // Update search query visual if triggered via chip
    if (topicOverride) setSearchQuery(topicOverride);
    
    try {
      const article = await generateRewikiArticle(query, language);
      setCurrentArticle(article);
      addToHistory(article);
      setViewState(ViewState.ARTICLE);
      window.scrollTo(0, 0); // Reset scroll on new article
    } catch (err) {
      console.error(err);
      setError("Failed to generate Rewiki article. High traffic or API limit.");
      setViewState(ViewState.ERROR);
    }
  }, [searchQuery, language]);

  const loadFromHistory = (article: RewikiArticle) => {
      setCurrentArticle(article);
      setViewState(ViewState.ARTICLE);
      setIsMenuOpen(false);
      window.scrollTo(0, 0);
  };

  const resetView = () => {
    setViewState(ViewState.HOME);
    setSearchQuery('');
    setCurrentArticle(null);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };

  const strings = {
    es: {
       searchPlaceholder: "¿Qué quieres aprender hoy?",
       searchButton: "Buscar",
       trending: "Tendencias en Rewiki",
       heroTitle: "Conocimiento,\nClarificado.",
       heroSub: "La enciclopedia para la siguiente generación. Clara, concisa y directa al grano.",
       menuTitle: "Menú",
       history: "Historial",
       lang: "Idioma",
       noHistory: "No hay artículos recientes.",
       compareTitle: "Rewiki vs Wikipedia",
       wiki: "Wikipedia",
       rewiki: "Rewiki",
       wikiDesc: "Paredes de texto, información redundante, diseño antiguo.",
       rewikiDesc: "Resúmenes claros, hechos directos, diseño moderno.",
       whyTitle: "¿Por qué Rewiki?",
       oldWay: "La vieja escuela",
       newWay: "La nueva era",
       slow: "Lento y complejo",
       fast: "Rápido y visual"
    },
    en: {
       searchPlaceholder: "What do you want to learn today?",
       searchButton: "Search",
       trending: "Trending on Rewiki",
       heroTitle: "Knowledge,\nClarified.",
       heroSub: "The encyclopedia for the next generation. Clear, concise, and straight to the point.",
       menuTitle: "Menu",
       history: "History",
       lang: "Language",
       noHistory: "No recent articles.",
       compareTitle: "Rewiki vs Wikipedia",
       wiki: "Wikipedia",
       rewiki: "Rewiki",
       wikiDesc: "Walls of text, redundant info, outdated design.",
       rewikiDesc: "Clear summaries, direct facts, modern design.",
       whyTitle: "Why Rewiki?",
       oldWay: "Old School",
       newWay: "New Era",
       slow: "Slow & Complex",
       fast: "Fast & Visual"
    }
  };

  const txt = strings[language];

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Floating Header */}
      <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className={`
          pointer-events-auto
          flex items-center justify-between p-2 pl-6 pr-2 gap-4
          bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-white/20 dark:border-neutral-800
          shadow-[0_8px_32px_rgba(0,0,0,0.08)]
          rounded-full transition-all duration-300 ease-out
          ${isScrolled ? 'w-[90%] md:w-[600px] bg-white/80 dark:bg-neutral-900/90' : 'w-full max-w-5xl'}
        `}>
          <div 
            onClick={resetView}
            className="font-extrabold text-xl tracking-tighter cursor-pointer flex items-center gap-1 group dark:text-white"
          >
            <span className="w-3 h-3 rounded-full bg-black dark:bg-white group-hover:scale-125 transition-transform" />
            Rewiki
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" icon={User} className="hidden md:flex">Sign In</Button>
            <Button variant="icon" icon={Menu} onClick={() => setIsMenuOpen(true)} />
          </div>
        </div>
      </header>

      {/* Side Menu Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-neutral-900 shadow-2xl transition-transform duration-300 p-6 flex flex-col gap-6 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white">{txt.menuTitle}</h2>
                <Button variant="icon" icon={X} onClick={() => setIsMenuOpen(false)} />
            </div>

            <div className="space-y-4">
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        {darkMode ? <Moon className="w-5 h-5"/> : <Sun className="w-5 h-5"/>}
                        {darkMode ? 'Dark Mode' : 'Light Mode'}
                    </span>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-white' : 'bg-neutral-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </button>

                <button 
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Globe className="w-5 h-5"/> {txt.lang}
                    </span>
                    <span className="font-bold uppercase">{language}</span>
                </button>

                <div className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex-1 overflow-y-auto">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">{txt.history}</h3>
                    <div className="space-y-3">
                        {history.length > 0 ? (
                           history.map(item => (
                             <div 
                                key={item.id} 
                                onClick={() => loadFromHistory(item)}
                                className="flex items-center gap-3 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                             >
                                <Clock className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm font-medium truncate">{item.topic}</span>
                             </div>
                           ))
                        ) : (
                           <p className="text-sm text-neutral-400 italic">{txt.noHistory}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="container mx-auto px-4 pt-32 min-h-screen flex flex-col">
        
        {viewState === ViewState.HOME && (
          <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full mb-32">
            
            <div className="text-center space-y-6 mb-12 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm font-medium mb-4 dark:text-neutral-300">
                <Sparkles className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span>AI Powered • {language === 'es' ? 'Local y Privado' : 'Local & Private'}</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-black dark:text-white whitespace-pre-line">
                {txt.heroTitle}
              </h1>
              <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed">
                {txt.heroSub}
              </p>
            </div>

            <form onSubmit={handleSearch} className="w-full max-w-2xl relative group z-10 mb-20">
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-white dark:bg-black rounded-[2rem] shadow-2xl p-2 border border-neutral-100 dark:border-neutral-800 transition-transform duration-300 group-focus-within:scale-[1.02]">
                <Search className="w-6 h-6 ml-6 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={txt.searchPlaceholder}
                  className="flex-1 bg-transparent border-none text-xl p-4 md:p-6 focus:ring-0 placeholder:text-neutral-300 font-medium outline-none dark:text-white"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  className="rounded-[1.5rem] w-14 h-14 md:w-auto md:h-auto md:px-8 md:py-4 !p-0 flex items-center justify-center dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                  <ArrowRight className="w-6 h-6 md:hidden" />
                  <span className="hidden md:inline">{txt.searchButton}</span>
                </Button>
              </div>
            </form>

            {/* Improved Comparison Section - Visual Cards */}
            <div className="w-full mb-20">
               <div className="relative max-w-3xl mx-auto">
                  {/* Background Card (Wikipedia) */}
                  <div className="absolute top-0 left-0 w-full h-full bg-neutral-200 dark:bg-neutral-800 rounded-[2.5rem] rotate-3 scale-95 opacity-50 translate-x-4 md:translate-x-8"></div>
                  
                  {/* Foreground Card (Rewiki) */}
                  <div className="relative bg-black dark:bg-white rounded-[2.5rem] p-8 md:p-12 text-white dark:text-black shadow-2xl flex flex-col md:flex-row gap-8 items-center overflow-hidden">
                      <div className="absolute top-0 right-0 p-32 bg-white/10 dark:bg-black/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                      
                      <div className="flex-1 space-y-6 relative z-10">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 dark:border-black/20 text-xs font-bold uppercase tracking-wider">
                            <Zap className="w-3 h-3" /> {txt.newWay}
                          </div>
                          <h3 className="text-3xl font-bold">{txt.fast}</h3>
                          <p className="opacity-80 text-lg leading-relaxed">{txt.rewikiDesc}</p>
                      </div>

                      <div className="w-px h-32 bg-white/20 dark:bg-black/20 hidden md:block"></div>
                      <div className="h-px w-full bg-white/20 dark:bg-black/20 md:hidden"></div>

                      <div className="flex-1 space-y-6 relative z-10 opacity-60">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 dark:border-black/20 text-xs font-bold uppercase tracking-wider">
                             <HistoryIcon className="w-3 h-3" /> {txt.oldWay}
                          </div>
                          <h3 className="text-3xl font-bold">{txt.slow}</h3>
                          <p className="opacity-80 text-lg leading-relaxed">{txt.wikiDesc}</p>
                      </div>
                  </div>
               </div>
            </div>

            {/* Trending / Suggestions */}
            <div className="w-full max-w-4xl">
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-6 text-center">{txt.trending}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Quantum Computing', 'The Renaissance', 'Black Holes'].map((topic) => (
                  <Card 
                    key={topic} 
                    onClick={() => { setSearchQuery(topic); handleSearch(undefined, topic); }}
                    className="hover:scale-105 transition-transform bg-neutral-50 dark:bg-neutral-900 border-transparent hover:bg-white dark:hover:bg-neutral-800"
                  >
                    <div className="flex justify-between items-start dark:text-white">
                      <span className="font-bold text-lg">{topic}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewState === ViewState.LOADING && (
          <div className="w-full flex justify-center">
            <ArticleSkeleton />
          </div>
        )}

        {viewState === ViewState.ERROR && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold mb-2 dark:text-white">Something went wrong</h2>
            <p className="text-neutral-500 mb-8 max-w-md">{error}</p>
            <Button onClick={resetView}>Try Again</Button>
          </div>
        )}

        {viewState === ViewState.ARTICLE && currentArticle && (
          <ArticleView 
            article={currentArticle} 
            onBack={resetView} 
            onUpdateArticle={setCurrentArticle}
            onTopicClick={(topic) => handleSearch(undefined, topic)}
          />
        )}

      </main>
    </div>
  );
}