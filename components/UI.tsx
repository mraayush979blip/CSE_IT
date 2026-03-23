
import React from 'react';
import { X, Upload, Linkedin, Code2, Globe, AlertCircle } from 'lucide-react';

export const Banner: React.FC<{
  message: string;
  variant?: 'info' | 'warning' | 'error';
  onClose?: () => void;
}> = ({ message, variant = 'info', onClose }) => {
  const styles = {
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className={`flex items-center justify-between px-4 py-2 border-b text-sm font-medium ${styles[variant]} animate-in slide-in-from-top duration-300`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {message}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

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

const FlipDigit: React.FC<{ value: string; label?: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="relative w-10 h-12 bg-black/70 rounded-lg border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-center backdrop-blur-sm">
      {/* Card top half divider line */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 z-10"></div>
      {/* Top half — slightly darker */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-black/30"></div>
      <span className="relative z-20 text-2xl font-black text-white tabular-nums tracking-tighter" style={{ fontFamily: '"Courier New", monospace', textShadow: '0 0 12px rgba(255,255,255,0.15)' }}>
        {value}
      </span>
    </div>
    {label && <span className="text-[8px] text-white/30 font-semibold uppercase tracking-widest mt-1">{label}</span>}
  </div>
);

const FlipSep: React.FC = () => (
  <div className="flex flex-col gap-1.5 mb-4 self-center">
    <div className="w-1 h-1 rounded-full bg-white/40"></div>
    <div className="w-1 h-1 rounded-full bg-white/40"></div>
  </div>
);

const DigitalFlipClock: React.FC<{ className?: string }> = ({ className }) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  const ms = String(Math.floor(time.getMilliseconds() / 10)).padStart(2, '0');

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Top row: HH : MM : SS */}
      <div className="flex items-end gap-1.5">
        <FlipDigit value={pad(time.getHours())} label="HR" />
        <FlipSep />
        <FlipDigit value={pad(time.getMinutes())} label="MIN" />
        <FlipSep />
        <FlipDigit value={pad(time.getSeconds())} label="SEC" />
        <div className="mb-4 self-center text-white/20 font-bold text-sm">.</div>
        <FlipDigit value={ms} label="MS" />
      </div>
    </div>
  );
};

export const AboutDeveloperModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [imgError, setImgError] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[380px] bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/10 group">
        
        {/* Background Image full-bleed */}
        <div className="absolute inset-0 z-0 h-full w-full bg-slate-800">
          {!imgError ? (
            <img
              src="/aayush-profile.jpg"
              alt="Aayush Sharma"
              className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                console.error("Image loading failed:", e);
                setImgError(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-slate-700">AS</div>
          )}
          {/* Heavy Gradient Overlay restricted to bottom half for text/buttons */}
          <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent"></div>
        </div>

        {/* Close Button overlay */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2.5 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all shadow-lg border border-white/10 active:scale-95">
          <X className="h-4 w-4" />
        </button>

        {/* Floating Digital Flip Clock in blank top-left space */}
        <DigitalFlipClock className="absolute top-6 left-1/2 -translate-x-1/2 drop-shadow-xl" />

        {/* Content Container (Locked to bottom) */}
        <div className="relative z-10 flex flex-col justify-end items-center min-h-[600px] px-6 pb-6 pt-[300px]">
          
          {/* Name & Title */}
          <h3 className="text-3xl font-extrabold text-white tracking-tight text-center drop-shadow-lg">
            Aayush Sharma
          </h3>
          <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mt-1 mb-6 drop-shadow-md">
            Full Stack Developer
          </p>

          {/* Tech Stack Pills (Glassy) */}
          <div className="w-full mb-6 mt-2">
             <div className="flex flex-wrap justify-center gap-1.5">
               {['React', 'Vite', 'TypeScript', 'Tailwind', 'Node.js'].map((tech) => (
                 <span key={tech} className="px-3 py-1.5 bg-white/10 backdrop-blur-md text-white/90 rounded-lg text-[10px] font-medium border border-white/10 shadow-sm cursor-default hover:bg-white/20 transition-colors">
                   {tech}
                 </span>
               ))}
             </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex gap-3">
             <a
              href="https://www.linkedin.com/in/aayush-sharma-2013d"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-1 relative flex items-center justify-center gap-2 overflow-hidden bg-[#0A66C2]/20 hover:bg-[#0A66C2]/40 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-lg active:scale-95 border border-[#0A66C2]/40 hover:border-[#0A66C2]/80 backdrop-blur-md"
             >
              {/* Glow sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0A66C2]/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></div>
              <Linkedin className="h-4 w-4 relative z-10 text-[#70b5f9]" />
              <span className="relative z-10 tracking-wide">LinkedIn</span>
             </a>
             
             <a
              href="https://aayush-sharma-beige.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-1 relative flex items-center justify-center gap-2 overflow-hidden bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-lg active:scale-95 border border-white/20 hover:border-white/40 backdrop-blur-md"
             >
              {/* Glow sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></div>
              <Globe className="h-4 w-4 relative z-10 text-white/70 group-hover:text-white transition-colors" />
              <span className="relative z-10 tracking-wide">Portfolio</span>
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};
