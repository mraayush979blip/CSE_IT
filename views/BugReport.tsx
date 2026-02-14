
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/UI';
import { Bug, Send, MessageSquare, User, Smartphone, AlertCircle, Sparkles, Zap, ShieldAlert, CheckCircle2, Star, ArrowLeft } from 'lucide-react';

export const BugReport: React.FC = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        type: 'BUG', // BUG or REVIEW
        message: '',
        priority: 'NORMAL'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.confirm("Are you sure you want to submit this feedback? It will open WhatsApp.")) return;
        setIsSubmitting(true);

        const phoneNumber = "6266439162";
        const text = `*New ${form.type === 'BUG' ? 'Bug Report' : 'Review'}*%0A%0A` +
            `*Name:* ${form.name}%0A` +
            `*Priority:* ${form.priority}%0A` +
            `*Description:* ${form.message}%0A%0A` +
            `_Sent from Acropolis AMS Portal_`;

        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${text}`;

        // Slight delay for effect
        setTimeout(() => {
            window.open(whatsappUrl, '_blank');
            setIsSubmitting(false);
            setForm({ name: '', type: 'BUG', message: '', priority: 'NORMAL' });
        }, 1200);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            {/* Navigation Header */}
            <div className="flex items-center justify-between px-2 pt-2 md:pt-4">
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-xl text-black/60 hover:text-black hover:border-black transition-all active:scale-95"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Go Back</span>
                </button>
            </div>

            {/* Monochrome Header */}
            <div className="relative text-center space-y-2 md:space-y-4 pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl mb-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Feedback Hub
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter leading-tight py-1">
                    Build It <span className="opacity-40 tracking-widest">Together</span>
                </h2>

                <p className="max-w-lg mx-auto text-black/40 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] leading-relaxed px-4">
                    Refining the experience, one report at a time.
                </p>
            </div>

            {/* Main Form Card - Minimalist Black & White */}
            <div className="w-full">
                <Card className="rounded-[2rem] md:rounded-[3rem] border border-black/5 bg-white shadow-[0_10px_50px_rgba(0,0,0,0.05)] overflow-hidden relative p-6 md:p-12">
                    <form onSubmit={handleSubmit} className="relative space-y-8 md:space-y-10">
                        {/* Personal Info Group */}
                        <div className="space-y-4">
                            <label className="text-[10px] md:text-[11px] font-black text-black/40 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                <User className="h-3 w-3" />
                                Your Identity
                            </label>
                            <Input
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Enter your name..."
                                className="border-b-2 border-t-0 border-l-0 border-r-0 border-black/5 rounded-none bg-transparent h-14 md:h-16 font-black text-black placeholder:text-black/10 focus:border-black focus:ring-0 transition-all text-base md:text-lg px-2"
                            />
                        </div>

                        {/* Type Toggle - High Contrast */}
                        <div className="space-y-4">
                            <label className="text-[10px] md:text-[11px] font-black text-black/40 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                <Zap className="h-3 w-3" />
                                Category
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, type: 'BUG' })}
                                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${form.type === 'BUG'
                                        ? 'bg-black border-black text-white shadow-xl'
                                        : 'bg-white border-black/5 text-black hover:border-black/20'
                                        }`}
                                >
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${form.type === 'BUG' ? 'bg-white/20' : 'bg-black/5'}`}>
                                        <Bug className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-black uppercase tracking-tight">Bug Report</div>
                                        <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${form.type === 'BUG' ? 'text-white/60' : 'text-black/40'}`}>Found a glitch?</div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, type: 'REVIEW' })}
                                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${form.type === 'REVIEW'
                                        ? 'bg-black border-black text-white shadow-xl'
                                        : 'bg-white border-black/5 text-black hover:border-black/20'
                                        }`}
                                >
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${form.type === 'REVIEW' ? 'bg-white/20' : 'bg-black/5'}`}>
                                        <Star className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-black uppercase tracking-tight">Experience</div>
                                        <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${form.type === 'REVIEW' ? 'text-white/60' : 'text-black/40'}`}>Share feedback</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <label className="text-[10px] md:text-[11px] font-black text-black/40 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                <MessageSquare className="h-3 w-3" />
                                The Briefing
                            </label>
                            <textarea
                                required
                                value={form.message}
                                onChange={e => setForm({ ...form, message: e.target.value })}
                                placeholder="Tell us what happened..."
                                className="w-full p-6 bg-black/[0.02] border-2 border-black/5 rounded-2xl min-h-[140px] md:min-h-[160px] font-bold text-black outline-none focus:border-black/20 transition-all resize-none text-sm md:text-base"
                            />
                        </div>

                        {/* Priority Selection - Moved here! */}
                        <div className="space-y-4 pt-4 border-t border-black/5">
                            <label className="text-[10px] md:text-[11px] font-black text-black/40 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                <ShieldAlert className="h-3 w-3 text-black" />
                                Priority Level
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['LOW', 'NORMAL', 'URGENT'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setForm({ ...form, priority: p })}
                                        className={`py-4 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 ${form.priority === p
                                            ? 'bg-black border-black text-white shadow-lg scale-[1.02]'
                                            : 'bg-white border-black/5 text-black/40 hover:border-black/20'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Final Action Button */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-16 md:h-20 bg-black text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xs md:text-sm mt-4"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2 animate-pulse">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                                    Processing...
                                </div>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 md:h-5 md:w-5" />
                                    Submit Feedback
                                </>
                            )}
                        </Button>
                    </form>
                </Card>
            </div>

            {/* Compact Note */}
            <p className="text-center text-[9px] md:text-[10px] text-black/30 font-bold uppercase tracking-[0.3em] px-10">
                Messages are routed via WhatsApp for instant processing and direct communication with our technical squad.
            </p>
        </div>
    );
};
