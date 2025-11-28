import React from 'react';
import type { FileItem } from '../hooks/useConverter';
import { X, FileType, AlertCircle, Loader2, Download, ArrowRight } from 'lucide-react';

interface FileCardProps {
    fileItem: FileItem;
    onRemove: (id: string) => void;
    onFormatChange: (id: string, format: FileItem['outputFormat']) => void;
    onConvert: (id: string) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
    fileItem,
    onRemove,
    onFormatChange,
    onConvert,
}) => {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 transition-all hover:shadow-md">
            <div className="flex items-center gap-4">
                {/* Preview / Icon */}
                <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {fileItem.file.type.startsWith('image/') ? (
                        <img
                            src={URL.createObjectURL(fileItem.file)}
                            alt={fileItem.file.name}
                            className="w-full h-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                        />
                    ) : (
                        <FileType className="w-8 h-8 text-slate-400" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate" title={fileItem.file.name}>
                        {fileItem.file.name}
                    </h3>
                    <p className="text-sm text-slate-500">{formatSize(fileItem.file.size)}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {fileItem.status === 'idle' && (
                        <>
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                                <span className="text-xs font-medium text-slate-500 px-2">Convert to</span>
                                <select
                                    value={fileItem.outputFormat}
                                    onChange={(e) => onFormatChange(fileItem.id, e.target.value as FileItem['outputFormat'])}
                                    className="bg-white text-sm font-medium text-slate-700 border-none rounded-md py-1 pl-2 pr-8 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none"
                                >
                                    <option value="png">PNG</option>
                                    <option value="jpeg">JPG</option>
                                    <option value="webp">WEBP</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>
                            <button
                                onClick={() => onConvert(fileItem.id)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Convert"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {fileItem.status === 'converting' && (
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Converting...</span>
                        </div>
                    )}

                    {fileItem.status === 'completed' && (
                        <a
                            href={fileItem.outputUrl}
                            download={`converted.${fileItem.outputFormat === 'jpeg' ? 'jpg' : fileItem.outputFormat}`}
                            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-sm font-medium">Download</span>
                        </a>
                    )}

                    {fileItem.status === 'error' && (
                        <div className="flex items-center gap-2 text-red-600" title={fileItem.errorMessage}>
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Failed</span>
                        </div>
                    )}

                    <button
                        onClick={() => onRemove(fileItem.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            {fileItem.status === 'converting' && (
                <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-pulse w-full origin-left" />
                </div>
            )}
        </div>
    );
};
