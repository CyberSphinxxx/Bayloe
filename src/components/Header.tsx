import React from 'react';
import { Zap } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/30 backdrop-blur-md shadow-sm">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <Zap className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                        Bayloe Converter
                    </h1>
                </div>
                <nav className="flex items-center gap-6">
                    <a href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                        How it works
                    </a>
                    <a href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                        Privacy
                    </a>
                </nav>
            </div>
        </header>
    );
};
