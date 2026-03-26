import { useState, FormEvent } from 'react';
import { Image as ImageIcon, Loader2, Download } from 'lucide-react';
import axios from 'axios';
import { motion } from 'motion/react';
import '../types';

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1K');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    // Check if API key is selected (assuming window.aistudio is available in the environment)
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        try {
          await window.aistudio.openSelectKey();
        } catch (err) {
          setError('Please select an API key to generate images.');
          return;
        }
      }
    }

    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await axios.post('/api/ai/image', { prompt, size });
      if (response.data.imageUrl) {
        setImageUrl(response.data.imageUrl);
      } else {
        setError('Failed to generate image. Please try a different prompt.');
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      setError(err.response?.data?.error || 'An error occurred while generating the image.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
      <form onSubmit={handleGenerate} className="flex flex-col gap-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-neutral-700 mb-1">
            Describe a place you want to see
          </label>
          <input
            id="prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cozy cafe in Paris with a view of the Eiffel Tower..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="size" className="block text-sm font-medium text-neutral-700 mb-1">
              Image Quality
            </label>
            <select
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
              disabled={isLoading}
            >
              <option value="1K">1K (Standard)</option>
              <option value="2K">2K (High)</option>
              <option value="4K">4K (Ultra)</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            Generate
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="relative aspect-video bg-neutral-100 rounded-xl border border-neutral-200 overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-sm font-medium">Generating your vision...</span>
          </div>
        ) : imageUrl ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="w-full h-full relative group"
          >
            <img 
              src={imageUrl} 
              alt={prompt} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <a 
              href={imageUrl} 
              download="generated-place.png"
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download Image"
            >
              <Download className="w-5 h-5" />
            </a>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-neutral-400">
            <ImageIcon className="w-12 h-12 opacity-20" />
            <span className="text-sm">Your generated image will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
}
