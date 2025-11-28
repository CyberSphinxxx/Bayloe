import { useState, useCallback, useRef, useEffect } from 'react';
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

// Helper to manage the isolation iframe
class HeicConverter {
    private iframe: HTMLIFrameElement | null = null;
    private conversionCount = 0;
    private readonly MAX_CONVERSIONS_PER_IFRAME = 5;

    private async getIframe(): Promise<HTMLIFrameElement> {
        if (this.iframe && this.conversionCount < this.MAX_CONVERSIONS_PER_IFRAME) {
            return this.iframe;
        }

        // Recycle iframe
        if (this.iframe) {
            document.body.removeChild(this.iframe);
            this.iframe = null;
            // Small delay to allow GC
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.conversionCount = 0;
        this.iframe = document.createElement('iframe');
        this.iframe.style.display = 'none';
        document.body.appendChild(this.iframe);

        // Setup iframe content
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/heic2any.js"></script>
      </head>
      <body>
        <script>
          window.onmessage = async function(e) {
            try {
              const { file, toType, quality } = e.data;
              const result = await heic2any({
                blob: file,
                toType,
                quality
              });
              // heic2any can return array or blob
              const blob = Array.isArray(result) ? result[0] : result;
              window.parent.postMessage({ success: true, blob }, '*');
            } catch (error) {
              window.parent.postMessage({ success: false, error: error.message || 'Unknown error' }, '*');
            }
          };
        </script>
      </body>
      </html>
    `;

        this.iframe.contentWindow!.document.open();
        this.iframe.contentWindow!.document.write(htmlContent);
        this.iframe.contentWindow!.document.close();

        // Wait for script to load (simple timeout for now, could be better)
        await new Promise(resolve => setTimeout(resolve, 500));

        return this.iframe;
    }

    public convert(file: File, toType: string, quality: number): Promise<Blob> {
        return new Promise(async (resolve, reject) => {
            try {
                const iframe = await this.getIframe();

                const handler = (e: MessageEvent) => {
                    if (e.source !== iframe.contentWindow) return;

                    window.removeEventListener('message', handler);
                    this.conversionCount++;

                    if (e.data.success) {
                        resolve(e.data.blob);
                    } else {
                        reject(new Error(e.data.error));
                    }
                };

                window.addEventListener('message', handler);

                iframe.contentWindow!.postMessage({ file, toType, quality }, '*');
            } catch (err) {
                reject(err);
            }
        });
    }
}

export const useConverter = () => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const converterRef = useRef<HeicConverter | null>(null);

    useEffect(() => {
        converterRef.current = new HeicConverter();
        return () => {
            // Cleanup logic if needed
        };
    }, []);

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
        setFiles((prev) => {
            const file = prev.find(f => f.id === id);
            if (file?.outputUrl) {
                URL.revokeObjectURL(file.outputUrl);
            }
            return prev.filter((f) => f.id !== id);
        });
    }, []);

    const updateFileFormat = useCallback((id: string, format: FileItem['outputFormat']) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, outputFormat: format } : f)));
    }, []);

    const processFile = async (fileItem: FileItem, retryCount = 0): Promise<Blob> => {
        let resultBlob: Blob;

        try {
            // HEIC Conversion using Iframe Isolation
            if (fileItem.file.name.toLowerCase().endsWith('.heic') || fileItem.file.name.toLowerCase().endsWith('.heif')) {
                if (!converterRef.current) converterRef.current = new HeicConverter();

                resultBlob = await converterRef.current.convert(
                    fileItem.file,
                    fileItem.outputFormat === 'pdf' ? 'image/jpeg' : `image/${fileItem.outputFormat}`,
                    0.9
                );
            } else {
                // Standard Image Conversion
                resultBlob = await new Promise<Blob>((resolve, reject) => {
                    const img = new Image();
                    const objectUrl = URL.createObjectURL(fileItem.file);

                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            URL.revokeObjectURL(objectUrl);
                            reject(new Error('Failed to get canvas context'));
                            return;
                        }
                        ctx.drawImage(img, 0, 0);

                        const mimeType = fileItem.outputFormat === 'pdf' ? 'image/jpeg' : `image/${fileItem.outputFormat}`;
                        canvas.toBlob((blob) => {
                            URL.revokeObjectURL(objectUrl);
                            if (blob) resolve(blob);
                            else reject(new Error('Conversion failed'));
                        }, mimeType, 0.9);
                    };

                    img.onerror = () => {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error('Failed to load image'));
                    };

                    img.src = objectUrl;
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

        } catch (error) {
            if (retryCount < 2) { // Retry up to 2 times
                console.log(`Retrying conversion for ${fileItem.file.name} (Attempt ${retryCount + 2})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                return processFile(fileItem, retryCount + 1);
            }
            throw error;
        }
    };

    const convertFile = useCallback(async (id: string) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'converting', progress: 0, errorMessage: undefined } : f)));

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
        const filesToConvert = files.filter(f => f.status === 'idle' || f.status === 'error');

        for (const fileItem of filesToConvert) {
            setFiles((prev) => prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'converting', progress: 0, errorMessage: undefined } : f)));

            try {
                // Force a small delay before starting to let UI update and GC run
                await new Promise(resolve => setTimeout(resolve, 200));

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

            // Delay between files to prevent browser freezing and allow memory cleanup
            await new Promise(resolve => setTimeout(resolve, 500));
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
