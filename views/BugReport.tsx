
import React, { useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { Bug, Send, MessageSquare, User, Smartphone, AlertCircle } from 'lucide-react';

export const BugReport: React.FC = () => {
    const [form, setForm] = useState({
        name: '',
        type: 'BUG', // BUG or REVIEW
        message: '',
        priority: 'NORMAL'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
        }, 800);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 mb-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Feedback Center
                </div>
                <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight leading-none">Report Bug or Review</h2>
                <p className="text-slate-400 font-medium">Your feedback helps us make Acropolis AMS better for everyone.</p>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-indigo-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50" />

                <form onSubmit={handleSubmit} className="relative space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                                <User className="h-3 w-3" />
                                Your Name
                            </label>
                            <Input
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Enter your full name"
                                className="border-none bg-slate-50 rounded-2xl h-14 font-bold text-slate-700 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                                <AlertCircle className="h-3 w-3" />
                                Feedback Type
                            </label>
                            <select
                                value={form.type}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                                className="w-full h-14 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 px-4 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="BUG">🪲 Report a Bug</option>
                                <option value="REVIEW">⭐️ General Review</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                            <Smartphone className="h-3 w-3" />
                            Priority Level
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {['LOW', 'NORMAL', 'URGENT'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setForm({ ...form, priority: p })}
                                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${form.priority === p
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md'
                                            : 'border-slate-50 bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" />
                            Detailed Description
                        </label>
                        <textarea
                            required
                            value={form.message}
                            onChange={e => setForm({ ...form, message: e.target.value })}
                            placeholder="Explain the issue or share your experience..."
                            className="w-full p-5 bg-slate-50 border-none rounded-3xl min-h-[150px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-16 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white" />
                        ) : (
                            <>
                                <Send className="h-5 w-5" />
                                Submit to WhatsApp
                            </>
                        )}
                    </Button>
                </form>
            </Card>

            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Why WhatsApp?</h4>
                    <p className="text-xs text-amber-700/80 font-medium leading-relaxed mt-1">
                        We use WhatsApp for direct communication. Once you click submit, you'll be redirected to your WhatsApp app to send the pre-filled message directly to our support team for a faster response.
                    </p>
                </div>
            </div>
        </div>
    );
};
