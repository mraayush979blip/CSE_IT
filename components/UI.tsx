
import React from 'react';
import { X, Upload, Linkedin, Code2 } from 'lucide-react';

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

export const AcropolisLogo: React.FC<{ className?: string; variant?: 'login' | 'dashboard' }> = ({ className, variant = 'login' }) => {
  const isDashboard = variant === 'dashboard';
  return (
    <img
      src={isDashboard ? "https://lh3.googleusercontent.com/d/1KLlB1FydOf1bvIlPFjra9cHsufesouHV" : "/splash-512.png"}
      alt="Acropolis Logo"
      className={`${className} object-contain ${!isDashboard ? 'scale-[1.4]' : ''}`}
    />
  );
};

export const AboutDeveloperModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About the Developer">
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-black to-slate-600 p-1 shadow-2xl">
            <div className="h-full w-full rounded-full bg-white overflow-hidden border-4 border-white flex items-center justify-center">
              {!imgError ? (
                <img
                  src="https://lh3.googleusercontent.com/d/1HRjdsWfJJm8loU9-SjE5HCQycQwDASzm"
                  alt="Aayush Sharma"
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="h-full w-full bg-slate-50 flex items-center justify-center text-3xl font-black text-slate-800">
                  AS
                </div>
              )}
            </div>
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-800 uppercase tracking-tight">Aayush Sharma</h3>
          <p className="text-xs font-bold text-black/40 uppercase tracking-[0.2em] mt-1">Full Stack Developer</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="group bg-slate-50 p-6 rounded-[2rem] border border-slate-200 transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Code2 className="h-6 w-6 text-slate-900" />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Principal Expertise</h4>
                <p className="text-xs text-slate-800 font-bold leading-relaxed">
                  Architecting <span className="text-black">high-performance</span> educational ecosystems with a focus on seamless scalability and pixel-perfect UI/UX.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-2">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Engineered With</h4>
          <div className="flex flex-wrap justify-center gap-1.5">
            {['React', 'Vite', 'TypeScript', 'Tailwind', 'Node.js'].map(tech => (
              <span key={tech} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="https://www.linkedin.com/in/aayush-sharma-2013d"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-[#0077B5] hover:bg-[#00669c] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Linkedin className="h-5 w-5" />
            Connect on LinkedIn
          </a>
          <button
            onClick={onClose}
            className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-slate-600 transition text-center mt-2"
          >
            Close Profile
          </button>
        </div>
      </div>
    </Modal>
  );
};
