/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Wand2, Loader2, Download, X } from 'lucide-react';
import { generateImage } from './services/gemini';
import { DesignIteration } from './types';
import { motion, AnimatePresence } from 'motion/react';

const QUICK_PROMPTS = [
  "Add a retro filter",
  "Make it minimalist",
  "Change lighting to sunset",
  "Add indoor plants",
];

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [iterations, setIterations] = useState<DesignIteration[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSourceImage(dataUrl);
      setActiveId('source');
    };
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearSourceImage = () => {
    setSourceImage(null);
    if (activeId === 'source') {
      setActiveId(iterations.length > 0 ? iterations[0].id : null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let baseImage = undefined;
      if (activeId === 'source' && sourceImage) {
        baseImage = sourceImage;
      } else if (activeId) {
        const activeIteration = iterations.find(i => i.id === activeId);
        if (activeIteration) {
          baseImage = activeIteration.imageUrl;
        }
      } else if (sourceImage) {
        baseImage = sourceImage;
      }

      const newImageUrl = await generateImage(prompt, baseImage);
      
      const newIteration: DesignIteration = {
        id: Date.now().toString(),
        imageUrl: newImageUrl,
        prompt: prompt,
        timestamp: Date.now(),
        parentId: activeId || undefined,
      };

      setIterations(prev => [newIteration, ...prev]);
      setActiveId(newIteration.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeImageUrl = activeId === 'source' 
    ? sourceImage 
    : iterations.find(i => i.id === activeId)?.imageUrl || sourceImage;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 shrink-0">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            RoomAI
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Design & Edit with Gemini</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Upload Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base Image</h2>
              {sourceImage && (
                <button 
                  onClick={clearSourceImage}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            {sourceImage ? (
              <div 
                className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer aspect-video ${activeId === 'source' ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-zinc-700 hover:border-zinc-500'}`}
                onClick={() => setActiveId('source')}
              >
                <img src={sourceImage} alt="Source" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-zinc-900/80 text-xs rounded-full backdrop-blur-sm border border-zinc-700 hover:bg-zinc-800 transition-colors"
                  >
                    Replace Image
                  </button>
                </div>
                {activeId === 'source' && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded uppercase tracking-wide">
                    Active
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-indigo-400"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm">Upload Floor Plan or Photo</span>
              </button>
            )}
          </section>

          {/* Prompt Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Design Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A modern minimalist living room with a large blue velvet sofa, warm lighting, and indoor plants..."
              className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
            />
            
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700"
                >
                  {p}
                </button>
              ))}
            </div>
            
            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 px-4 mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {activeId && activeId !== 'source' ? 'Edit Image' : 'Generate Design'}
                </>
              )}
            </button>
          </section>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col relative bg-zinc-950 min-w-0">
        {/* Canvas Area */}
        <div className="flex-1 p-8 flex items-center justify-center overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}>
          </div>

          <AnimatePresence mode="wait">
            {activeImageUrl ? (
              <motion.div 
                key={activeImageUrl}
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-zinc-800 group flex items-center justify-center"
              >
                <img 
                  src={activeImageUrl} 
                  alt="Active Design" 
                  className="w-full h-full object-contain max-h-[80vh]"
                />
                
                {/* Overlay Controls */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={activeImageUrl} 
                    download={`room-design-${Date.now()}.png`}
                    className="p-2 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white rounded-lg transition-colors"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                
                {activeId === 'source' && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md text-xs font-medium rounded-full border border-white/10">
                    Base Image
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-zinc-500 max-w-sm"
              >
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Upload a floor plan or enter a prompt to start designing your room.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Strip */}
        {iterations.length > 0 && (
          <div className="h-40 bg-zinc-900/50 border-t border-zinc-800 p-4 overflow-x-auto flex items-center gap-4 backdrop-blur-xl shrink-0">
            {sourceImage && (
              <div className="flex-shrink-0 flex items-center gap-4">
                <button
                  onClick={() => setActiveId('source')}
                  className={`relative h-24 aspect-video rounded-lg overflow-hidden border-2 transition-all ${activeId === 'source' ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-transparent hover:border-zinc-600'}`}
                >
                  <img src={sourceImage} alt="Source" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <span className="text-[10px] font-medium text-white">Source</span>
                  </div>
                </button>
                <div className="w-px h-12 bg-zinc-800"></div>
              </div>
            )}
            
            {iterations.map((iteration, idx) => (
              <button
                key={iteration.id}
                onClick={() => setActiveId(iteration.id)}
                className={`relative h-24 aspect-video rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${activeId === iteration.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-transparent hover:border-zinc-600'}`}
              >
                <img src={iteration.imageUrl} alt={`Iteration ${idx}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white line-clamp-2 text-left leading-tight">{iteration.prompt}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
