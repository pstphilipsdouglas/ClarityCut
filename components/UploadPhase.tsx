import React, { useCallback, useState } from 'react';
import { Upload, FileVideo, X, Plus, Save, Trash2, FolderOpen, Settings, Film } from 'lucide-react';
import { VideoConfig, PhraseList, OutputFormat, OutputQuality } from '../types';
import { Button } from './Button';

interface UploadPhaseProps {
  onFileSelect: (file: File) => void;
  config: VideoConfig;
  setConfig: React.Dispatch<React.SetStateAction<VideoConfig>>;
  onStartAnalysis: () => void;
  savedLists: PhraseList[];
  onSaveList: (name: string, phrases: string[]) => void;
  onDeleteList: (id: string) => void;
}

export const UploadPhase: React.FC<UploadPhaseProps> = ({
  onFileSelect,
  config,
  setConfig,
  onStartAnalysis,
  savedLists,
  onSaveList,
  onDeleteList
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newPhrase, setNewPhrase] = useState('');
  const [selectedListId, setSelectedListId] = useState<string>('');
  
  // State for saving new list
  const [isNamingList, setIsNamingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024 * 1024) {
      alert("File size exceeds 2GB limit.");
      return;
    }
    if (!file.type.startsWith('video/')) {
      alert("Please upload a valid video file.");
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const toggleSetting = (key: keyof VideoConfig) => {
    // @ts-ignore
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addCustomPhrase = () => {
    if (newPhrase.trim() && config.customPhrases.length < 10) {
      setConfig(prev => ({
        ...prev,
        customPhrases: [...prev.customPhrases, newPhrase.trim()]
      }));
      setNewPhrase('');
    }
  };

  const removeCustomPhrase = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customPhrases: prev.customPhrases.filter((_, i) => i !== index)
    }));
  };

  const handleLoadList = (listId: string) => {
    setSelectedListId(listId);
    const list = savedLists.find(l => l.id === listId);
    if (list) {
      setConfig(prev => ({ ...prev, customPhrases: [...list.phrases] }));
    }
  };

  const saveCurrentList = () => {
    if (newListName.trim() && config.customPhrases.length > 0) {
        onSaveList(newListName.trim(), config.customPhrases);
        setIsNamingList(false);
        setNewListName('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
          Clean Up Your Video Content
        </h1>
        <p className="text-slate-400 text-lg">
          Remove clichés, filler words, stuttering, and awkward silences in seconds using AI.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          
          {/* Left: Upload Area */}
          <div className="p-8 space-y-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 text-sm">1</span>
              Upload Video
            </h3>
            
            <div 
              className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out
                ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept="video/*"
                onChange={handleChange}
              />
              
              {selectedFile ? (
                <div className="text-center space-y-3 z-10">
                  <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                    <FileVideo className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-medium text-white truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full justify-center p-4">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-lg font-medium text-slate-200">Click to upload or drag & drop</p>
                  <p className="text-sm text-slate-500 mt-2">MP4, MOV, MKV up to 2GB</p>
                </label>
              )}
            </div>
          </div>

          {/* Right: Configuration */}
          <div className="p-8 space-y-6 bg-slate-900/50">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 text-sm">2</span>
              Configuration
            </h3>
            
            <div className="space-y-4">
              {/* Toggles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'removeCliches', label: 'Remove Clichés', desc: 'e.g., "Praise the Lord"' },
                  { key: 'removeFillers', label: 'Remove Filler Words', desc: 'e.g., "Um", "Uh"' },
                  { key: 'removeRepetition', label: 'Remove Repetitions', desc: 'e.g., "I mean, I mean"' },
                  { key: 'removeStuttering', label: 'Remove Stuttering', desc: 'e.g., "Th-th-the"' },
                  { key: 'removeSilence', label: 'Truncate Silence', desc: config.removeSilence ? `>${config.silenceThreshold}s` : 'Remove silent gaps' },
                ].map((item) => (
                  <div key={item.key} className={`p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 transition-all duration-200 flex flex-col ${item.key === 'removeSilence' ? 'sm:col-span-2' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="pr-2">
                        <p className="font-medium text-slate-200 text-sm">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => toggleSetting(item.key as keyof VideoConfig)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                          config[item.key as keyof VideoConfig] ? 'bg-indigo-600' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            config[item.key as keyof VideoConfig] ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {/* Silence Slider - shown inside the card if expanded */}
                    {item.key === 'removeSilence' && config.removeSilence && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50 animate-fade-in w-full">
                         <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] text-slate-400">Min Duration</label>
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                              {config.silenceThreshold}s
                            </span>
                         </div>
                         <input
                           type="range"
                           min="0.2"
                           max="5.0"
                           step="0.1"
                           value={config.silenceThreshold}
                           onChange={(e) => setConfig(prev => ({ ...prev, silenceThreshold: parseFloat(e.target.value) }))}
                           className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                         />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* List Management Section */}
              <div className="pt-4 border-t border-slate-800">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-indigo-400" />
                        Load Phrase List
                    </label>
                 </div>
                 <div className="flex gap-2">
                    <select 
                        value={selectedListId}
                        onChange={(e) => handleLoadList(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                    >
                        <option value="">Select a list...</option>
                        {savedLists.map((list) => (
                            <option key={list.id} value={list.id}>
                                {list.name} ({list.phrases.length})
                            </option>
                        ))}
                    </select>
                    {selectedListId && (
                        <button 
                            onClick={() => {
                                if (window.confirm("Are you sure you want to delete this list?")) {
                                    onDeleteList(selectedListId);
                                    setSelectedListId('');
                                }
                            }}
                            className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
                            title="Delete Selected List"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                 </div>
              </div>

              {/* Custom Phrases */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Active Custom Phrases ({config.customPhrases.length}/10)
                </label>
                
                {/* Input Area */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomPhrase()}
                    placeholder="Type (e.g., 'sort of')"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    disabled={config.customPhrases.length >= 10}
                  />
                  <button
                    onClick={addCustomPhrase}
                    disabled={!newPhrase || config.customPhrases.length >= 10}
                    className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 text-white"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {config.customPhrases.length === 0 && (
                      <span className="text-xs text-slate-600 italic">No custom phrases added.</span>
                  )}
                  {config.customPhrases.map((phrase, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-200 border border-indigo-700/50">
                      {phrase}
                      <button
                        onClick={() => removeCustomPhrase(index)}
                        className="ml-1.5 text-indigo-300 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Save List Action */}
                {config.customPhrases.length > 0 && (
                    <div className="bg-slate-800/30 rounded p-2 border border-slate-700/30">
                        {!isNamingList ? (
                            <button 
                                onClick={() => setIsNamingList(true)}
                                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                            >
                                <Save className="w-3 h-3" />
                                Save these phrases as a new list
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <input 
                                    type="text" 
                                    autoFocus
                                    placeholder="List Name" 
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                                />
                                <button 
                                    onClick={saveCurrentList}
                                    disabled={!newListName.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                >
                                    Save
                                </button>
                                <button 
                                    onClick={() => { setIsNamingList(false); setNewListName(''); }}
                                    className="text-slate-400 hover:text-white text-xs px-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}
              </div>

              {/* Export Settings */}
              <div className="pt-4 border-t border-slate-800">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    Export Settings
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Format</label>
                    <div className="relative">
                      <select
                        value={config.outputFormat}
                        onChange={(e) => setConfig(prev => ({ ...prev, outputFormat: e.target.value as OutputFormat }))}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 appearance-none"
                      >
                        <option value="mp4">MP4 (H.264)</option>
                        <option value="mov">MOV</option>
                        <option value="avi">AVI</option>
                        <option value="mkv">MKV</option>
                      </select>
                      <Film className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Quality</label>
                     <select
                        value={config.outputQuality}
                        onChange={(e) => setConfig(prev => ({ ...prev, outputQuality: e.target.value as OutputQuality }))}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                      >
                        <option value="original">Original</option>
                        <option value="4k">4K</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                        <option value="480p">480p</option>
                      </select>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-800/50 border-t border-slate-800 flex justify-end">
          <Button 
            onClick={onStartAnalysis} 
            disabled={!selectedFile}
            className="w-full md:w-auto px-8"
          >
            Analyze Video
          </Button>
        </div>
      </div>
    </div>
  );
};