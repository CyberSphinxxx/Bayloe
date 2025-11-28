import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { clsx } from 'clsx';

interface DropzoneProps {
    onFilesAdded: (files: File[]) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                onFilesAdded(files);
            }
        },
        [onFilesAdded]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                onFilesAdded(Array.from(e.target.files));
            }
        },
        [onFilesAdded]
    );

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={clsx(
                'relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group',
                isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
            )}
        >
            <input
                type="file"
                multiple
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/*,.heic,.heif"
            />

            <div className="flex flex-col items-center space-y-4 text-slate-500 group-hover:text-indigo-600 transition-colors">
                <div className={clsx(
                    "p-4 rounded-full transition-all duration-300",
                    isDragging ? "bg-indigo-100" : "bg-slate-100 group-hover:bg-indigo-50"
                )}>
                    <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                    <p className="text-lg font-semibold">
                        {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                        or click to browse
                    </p>
                </div>
                <div className="flex gap-2 text-xs text-slate-400 uppercase tracking-wider">
                    <span>JPG</span>
                    <span>PNG</span>
                    <span>WEBP</span>
                    <span>HEIC</span>
                </div>
            </div>
        </div>
    );
};
