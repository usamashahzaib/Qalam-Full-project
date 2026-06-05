import React, { useState } from 'react';
import { ImageIcon, Wand2, LayoutTemplate, RefreshCw, Check, X, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invokeLLM, generateImage } from '@/api/ai';
import { toast } from 'sonner';

const SLIDE_THEMES = [
  { id: 'dark', label: 'Dark', bg: '#0a1a17', text: '#F7F1E6', accent: '#E5AD00' },
  { id: 'light', label: 'Light', bg: '#F7F1E6', text: '#06100E', accent: '#073F3A' },
  { id: 'gold', label: 'Gold', bg: '#E5AD00', text: '#06100E', accent: '#073F3A' },
  { id: 'forest', label: 'Forest', bg: '#073F3A', text: '#F7F1E6', accent: '#E5AD00' },
];

// Renders a mini carousel slide preview
function SlidePreview({ slide, theme, index, total, selected, onClick }) {
  const t = SLIDE_THEMES.find(t => t.id === theme) || SLIDE_THEMES[0];
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
        selected ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/40 hover:border-border'
      }`}
      style={{ width: 120, height: 120, background: t.bg }}
    >
      <div className="absolute inset-0 p-3 flex flex-col justify-between">
        <p className="text-[8px] font-bold leading-tight" style={{ color: t.accent }}>
          {index + 1}/{total}
        </p>
        <p className="text-[7px] leading-snug font-medium line-clamp-4" style={{ color: t.text }}>
          {slide.text}
        </p>
        {slide.cta && (
          <p className="text-[6px] font-bold uppercase tracking-wider" style={{ color: t.accent }}>
            {slide.cta}
          </p>
        )}
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

// Generated image card
function ImageCard({ url, selected, onSelect, onRemove }) {
  return (
    <div className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
      selected ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/40 hover:border-border'
    }`} style={{ width: 120, height: 120 }}>
      <img src={url} alt="Generated visual" className="w-full h-full object-cover" onClick={onSelect} />
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
      >
        <X className="w-2.5 h-2.5 text-white" />
      </button>
    </div>
  );
}

export default function VisualStudio({ content, platform, attachedVisuals, onAttach, onDetach }) {
  const [mode, setMode] = useState('image'); // 'image' | 'carousel'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [carouselSlides, setCarouselSlides] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [selectedItems, setSelectedItems] = useState(new Set());

  const hasContent = content.trim().length > 40;

  // Generate stock-style images from content
  const handleGenerateImages = async () => {
    if (!hasContent) return;
    setIsGenerating(true);
    try {
      // Ask LLM for image prompts first
      const promptsRes = await invokeLLM({
        prompt: `Based on this social media post, generate 2 distinct visual image prompts for professional branded imagery. Keep prompts concise (under 60 words each), focus on abstract/conceptual visuals that complement the message. Return JSON only.

Post: "${content.slice(0, 600)}"
Platform: ${platform}

Return: { "prompts": ["prompt1", "prompt2"] }`,
        response_json_schema: {
          type: 'object',
          properties: {
            prompts: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      const prompts = promptsRes?.prompts || [];
      if (!prompts.length) throw new Error('No prompts generated');

      // Generate images in parallel
      const results = await Promise.all(
        prompts.slice(0, 2).map(p =>
          generateImage({
            prompt: `Professional branded social media visual. ${p}. Clean minimal design, high quality, suitable for LinkedIn/business content.`
          })
        )
      );

      const urls = results.map(r => r?.url).filter(Boolean);
      setGeneratedImages(prev => [...urls, ...prev]);
    } catch {
      toast.error('Image generation failed. Try again.');
    }
    setIsGenerating(false);
  };

  // Generate carousel slides from content
  const handleGenerateCarousel = async () => {
    if (!hasContent) return;
    setIsGenerating(true);
    try {
      const res = await invokeLLM({
        prompt: `Transform this post into a branded carousel slide deck for ${platform}. Create 4-5 slides with punchy, scannable text. Each slide should have a short headline and optional CTA on the last slide.

Post: "${content.slice(0, 1000)}"

Return JSON only: { "slides": [{ "text": "...", "cta": "..." }] } — cta is optional, only for last slide.`,
        response_json_schema: {
          type: 'object',
          properties: {
            slides: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  cta: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (res?.slides?.length) {
        setCarouselSlides(res.slides);
      }
    } catch {
      toast.error('Carousel generation failed. Try again.');
    }
    setIsGenerating(false);
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAttach = () => {
    if (mode === 'image') {
      const urls = generatedImages.filter((_, i) => selectedItems.has(`img-${i}`));
      urls.forEach(url => onAttach({ type: 'image', url }));
      setSelectedItems(new Set());
      toast.success(`${urls.length} image${urls.length > 1 ? 's' : ''} attached to post`);
    } else {
      if (!carouselSlides.length || !selectedItems.has('carousel')) return;
      onAttach({ type: 'carousel', slides: carouselSlides, theme: selectedTheme });
      setSelectedItems(new Set());
      toast.success('Carousel attached to post');
    }
  };

  const attachedImages = attachedVisuals.filter(v => v.type === 'image');
  const attachedCarousel = attachedVisuals.find(v => v.type === 'carousel');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold">Visual Studio</span>
        </div>
        {/* Mode tabs */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {[{ id: 'image', label: '🖼 Images' }, { id: 'carousel', label: '📊 Carousel' }].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 py-1.5 text-[10px] rounded-md font-medium transition-colors ${
                mode === m.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-muted-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Attached visuals strip */}
        {attachedVisuals.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2">Attached</p>
            <div className="flex flex-wrap gap-2">
              {attachedImages.map((v, i) => (
                <div key={i} className="relative rounded-md overflow-hidden border border-primary/40 flex-shrink-0" style={{ width: 48, height: 48 }}>
                  <img src={v.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => onDetach(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {attachedCarousel && (
                <div
                  className="relative flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/40 bg-primary/5 cursor-pointer hover:bg-destructive/10 hover:border-destructive/40 transition-colors group"
                  onClick={() => onDetach(attachedVisuals.findIndex(v => v.type === 'carousel'))}
                >
                  <LayoutTemplate className="w-3 h-3 text-primary group-hover:text-destructive" />
                  <span className="text-[10px] text-primary group-hover:text-destructive font-medium">{attachedCarousel.slides?.length} slides</span>
                  <X className="w-2.5 h-2.5 text-primary/50 group-hover:text-destructive hidden group-hover:block" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* IMAGE MODE */}
        {mode === 'image' && (
          <div className="space-y-3">
            <button
              onClick={handleGenerateImages}
              disabled={isGenerating || !hasContent}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-medium bg-primary/10 border border-primary/25 text-primary rounded-lg hover:bg-primary/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating
                ? <><div className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin" /> Generating…</>
                : <><Wand2 className="w-3.5 h-3.5" /> Generate from draft</>
              }
            </button>

            {!hasContent && (
              <p className="text-[10px] text-muted-foreground/40 text-center">Write 40+ characters to generate visuals.</p>
            )}

            {generatedImages.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2">Generated — tap to select</p>
                <div className="flex flex-wrap gap-2">
                  {generatedImages.map((url, i) => (
                    <ImageCard
                      key={i}
                      url={url}
                      selected={selectedItems.has(`img-${i}`)}
                      onSelect={() => toggleSelect(`img-${i}`)}
                      onRemove={() => setGeneratedImages(prev => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CAROUSEL MODE */}
        {mode === 'carousel' && (
          <div className="space-y-3">
            {/* Theme selector */}
            <div>
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2">Brand theme</p>
              <div className="flex gap-1.5">
                {SLIDE_THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    title={t.label}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${selectedTheme === t.id ? 'border-primary scale-110' : 'border-transparent hover:border-border'}`}
                    style={{ background: t.bg }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateCarousel}
              disabled={isGenerating || !hasContent}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-medium bg-primary/10 border border-primary/25 text-primary rounded-lg hover:bg-primary/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating
                ? <><div className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin" /> Generating…</>
                : <><LayoutTemplate className="w-3.5 h-3.5" /> Generate carousel</>
              }
            </button>

            {!hasContent && (
              <p className="text-[10px] text-muted-foreground/40 text-center">Write 40+ characters to generate a carousel.</p>
            )}

            {carouselSlides.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">{carouselSlides.length} slides — tap to select</p>
                  <button
                    onClick={handleGenerateCarousel}
                    disabled={isGenerating}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                <div
                  className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                    selectedItems.has('carousel') ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-border'
                  }`}
                  onClick={() => toggleSelect('carousel')}
                >
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {carouselSlides.map((slide, i) => (
                      <SlidePreview
                        key={i}
                        slide={slide}
                        theme={selectedTheme}
                        index={i}
                        total={carouselSlides.length}
                        selected={false}
                      />
                    ))}
                  </div>
                  {selectedItems.has('carousel') && (
                    <p className="text-[10px] text-primary font-medium mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attach footer */}
      <AnimatePresence>
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex-shrink-0 px-4 pb-4"
          >
            <button
              onClick={handleAttach}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Attach to post
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}