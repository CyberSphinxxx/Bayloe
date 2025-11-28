import { useState, useCallback } from 'react';
import heic2any from 'heic2any';
import jsPDF from 'jspdf';

export type FileStatus = 'idle' | 'converting' | 'completed' | 'error';

export interface FileItem {
    id: string;
    file: File;
    status: FileStatus;
    progress: number;
    outputFormat: 'png' | 'jpeg' | 'webp' | 'pdf';
    outputUrl?: string;
    errorMessage?: string;
}

export const useConverter = () => {
    const [files, setFiles] = useState<FileItem[]>([]);

    const addFiles = useCallback((newFiles: File[]) => {
        const fileItems: FileItem[] = newFiles.map((file) => ({
            id: crypto.randomUUID(),
            file,
            status: 'idle',
            progress: 0,
            outputFormat: 'png', // Default format
        }));
        setFiles((prev) => [...prev, ...fileItems]);
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const updateFileFormat = useCallback((id: string, format: FileItem['outputFormat']) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, outputFormat: format } : f)));
    }, []);

    const processFile = async (fileItem: FileItem): Promise<Blob> => {
        let resultBlob: Blob;

        // HEIC Conversion
        if (fileItem.file.name.toLowerCase().endsWith('.heic') || fileItem.file.name.toLowerCase().endsWith('.heif')) {
            const conversionResult = await heic2any({
                blob: fileItem.file,
                toType: fileItem.outputFormat === 'pdf' ? 'image/jpeg' : `image/${fileItem.outputFormat}`,
                quality: 0.9,
            });

            // Handle array result (should be single blob for single file)
            resultBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        } else {
            // Standard Image Conversion
            resultBlob = await new Promise<Blob>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0);

                    const mimeType = fileItem.outputFormat === 'pdf' ? 'image/jpeg' : `image/${fileItem.outputFormat}`;
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Conversion failed'));
                    }, mimeType, 0.9);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = URL.createObjectURL(fileItem.file);
            });
        }

        // PDF Generation if requested
        if (fileItem.outputFormat === 'pdf') {
            const imgData = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(resultBlob);
            });

            const pdf = new jsPDF();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            resultBlob = pdf.output('blob');
        }

        return resultBlob;
    };

    const convertFile = useCallback(async (id: string) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'converting', progress: 0, errorMessage: undefined } : f)));

        // We need to get the file item from the state, but we can't rely on 'files' dependency if we want to avoid stale closures in loops.
        // However, for single file conversion triggered by UI, it's fine.
        // Ideally, we should pass the fileItem to this function, but the UI passes ID.
        // Let's use a functional update to get the latest file item if possible, or just rely on the fact that file content doesn't change.

        // For single conversion, we can find it in the current 'files' state.
        // But for 'convertAll', we will handle it differently.

        // Actually, let's just implement the logic here using the current 'files' state for single conversion.
        // The 'convertAll' will use a different approach.

        // Wait, if I use 'files' here, it's stale in 'convertAll'.
        // So 'convertAll' should NOT call 'convertFile'. It should implement its own loop calling 'processFile'.

        const fileItem = files.find((f) => f.id === id);
        if (!fileItem) return;

        try {
            const resultBlob = await processFile(fileItem);
            const outputUrl = URL.createObjectURL(resultBlob);

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id ? { ...f, status: 'completed', progress: 100, outputUrl } : f
                )
            );
        } catch (error) {
            console.error('Conversion error:', error);
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id ? { ...f, status: 'error', errorMessage: (error as Error).message || 'Conversion failed' } : f
                )
            );
        }
    }, [files]);

    const convertAll = useCallback(async () => {
        // Filter files that need conversion
        const filesToConvert = files.filter(f => f.status === 'idle' || f.status === 'error');

        // Process sequentially
        for (const fileItem of filesToConvert) {
            // Update status to converting
            setFiles((prev) => prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'converting', progress: 0, errorMessage: undefined } : f)));

            try {
                const resultBlob = await processFile(fileItem);
                const outputUrl = URL.createObjectURL(resultBlob);

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileItem.id ? { ...f, status: 'completed', progress: 100, outputUrl } : f
                    )
                );
            } catch (error) {
                console.error('Conversion error:', error);
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileItem.id ? { ...f, status: 'error', errorMessage: (error as Error).message || 'Conversion failed' } : f
                    )
                );
            }

            // Small delay to allow UI updates and prevent browser freezing
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }, [files]);

    return {
        files,
        addFiles,
        removeFile,
        updateFileFormat,
        convertFile,
        convertAll
    };
};
