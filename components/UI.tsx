
import React from 'react';
import { X, Upload } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger',
  size?: 'sm' | 'md'
}> = ({ className = '', variant = 'primary', size = 'md', ...props }) => {
  const base = "rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm"
  };

  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium text-slate-900 mb-1">{label}</label>}
    <input
      className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white placeholder-slate-400 ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className = '', children, ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium text-slate-900 mb-1">{label}</label>}
    <select
      className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const FileUploader: React.FC<{ onFileSelect: (file: File) => void; accept?: string; label?: string }> = ({ onFileSelect, accept = ".csv", label = "Upload File" }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
      />
      <Button variant="secondary" onClick={handleClick} className="flex items-center text-sm">
        <Upload className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </div>
  );
};

export const AcropolisLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img
      src="/pwa-192x192.png"
      alt="Acropolis Logo"
      className={`${className} object-contain scale-[1.8]`}
    />
  );
};

