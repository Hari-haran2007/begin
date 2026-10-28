import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, X, Eye } from 'lucide-react';

interface DragDropUploadProps {
  label: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File) => void;
  onRemove: () => void;
  previewUrl?: string | null;
}

export function DragDropUpload({ label, accept, file, onFileChange, onRemove, previewUrl }: DragDropUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const isImage = file?.type 
    ? file.type.startsWith('image/') 
    : (file?.name ? /\.(jpe?g|png|webp|gif)$/i.test(file.name) : false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-purple-500/50 bg-white/5'
          }`}
        >
          <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-purple-400' : 'text-gray-500'}`} />
          <p className="text-sm text-gray-300 font-medium">Click or drag & drop to upload</p>
          <p className="text-xs text-gray-500 mt-1">Accepts {accept}</p>
          <input
            type="file"
            ref={inputRef}
            onChange={(e) => e.target.files && onFileChange(e.target.files[0])}
            accept={accept}
            className="hidden"
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-purple-600/20 rounded-lg shrink-0">
                {isImage ? <ImageIcon className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-purple-400" />}
              </div>
              <div className="truncate">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {previewUrl && isImage && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 bg-black/20">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-75" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-medium bg-black/60 px-2 py-1 rounded-md flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Preview
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
