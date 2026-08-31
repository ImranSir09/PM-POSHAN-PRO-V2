import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Button from './Button';
import { saveOrDownloadFile } from '../../services/fileDownloadService';
import { Loader2, ZoomIn, ZoomOut, RotateCw, Download, Printer, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';

// Configure worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    pdfBlob: Blob | null;
    filename: string;
    onRegenerate: () => void;
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
    isOpen,
    onClose,
    pdfUrl,
    pdfBlob,
    filename,
    onRegenerate
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

    // Reset state when modal opens or document changes
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setLoading(true);
        setError(null);
        setPdfDoc(null);
        setCurrentPage(1);

        const loadPdf = async () => {
            try {
                let arrayBuffer: ArrayBuffer;

                if (pdfBlob) {
                    arrayBuffer = await pdfBlob.arrayBuffer();
                } else if (pdfUrl) {
                    const response = await fetch(pdfUrl);
                    arrayBuffer = await response.arrayBuffer();
                } else {
                    throw new Error("No PDF source available.");
                }

                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const doc = await loadingTask.promise;

                if (isMounted) {
                    setPdfDoc(doc);
                    setNumPages(doc.numPages);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error("PDF.js loading error:", err);
                if (isMounted) {
                    setError("Could not render PDF preview directly. You can still download or print the document.");
                    setLoading(false);
                }
            }
        };

        loadPdf();

        return () => {
            isMounted = false;
        };
    }, [isOpen, pdfUrl, pdfBlob]);

    // Render page canvases when document or scale changes
    useEffect(() => {
        if (!pdfDoc || !isOpen) return;

        let cancelled = false;

        const renderAllPages = async () => {
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                if (cancelled) break;
                const canvas = pageCanvasRefs.current.get(pageNum);
                if (!canvas) continue;

                try {
                    const page = await pdfDoc.getPage(pageNum);
                    const context = canvas.getContext('2d');
                    if (!context) continue;

                    // Calculate viewport based on device pixel ratio and container width
                    const viewport = page.getViewport({ scale: scale });
                    
                    // High-DPI support
                    const dpr = window.devicePixelRatio || 1;
                    canvas.width = Math.floor(viewport.width * dpr);
                    canvas.height = Math.floor(viewport.height * dpr);
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = `${Math.floor(viewport.height)}px`;

                    context.scale(dpr, dpr);

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                        canvas: canvas,
                    };

                    await page.render(renderContext as any).promise;
                } catch (e) {
                    console.warn(`Error rendering PDF page ${pageNum}:`, e);
                }
            }
        };

        renderAllPages();

        return () => {
            cancelled = true;
        };
    }, [pdfDoc, scale, isOpen]);

    if (!isOpen) return null;

    const handleDownload = async () => {
        try {
            await saveOrDownloadFile(pdfBlob || pdfUrl, filename, 'application/pdf');
        } catch (err) {
            console.error('Failed to download PDF:', err);
        }
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const handleResetZoom = () => setScale(1.0);

    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 text-slate-100 animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-preview-title"
        >
            {/* Header Controls */}
            <div className="flex-shrink-0 flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center space-x-2 truncate">
                    <h3 id="pdf-preview-title" className="text-sm sm:text-base font-semibold text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                        {filename}
                    </h3>
                    {numPages > 0 && (
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                            {numPages} {numPages === 1 ? 'Page' : 'Pages'}
                        </span>
                    )}
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                    {/* Zoom controls */}
                    <div className="hidden sm:flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                        <button
                            onClick={handleZoomOut}
                            disabled={scale <= 0.5}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white disabled:opacity-40"
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs px-2 font-mono text-slate-300">{Math.round(scale * 100)}%</span>
                        <button
                            onClick={handleZoomIn}
                            disabled={scale >= 2.5}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white disabled:opacity-40"
                            title="Zoom In"
                        >
                            <ZoomIn size={16} />
                        </button>
                        <button
                            onClick={handleResetZoom}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs border-l border-slate-700 ml-0.5 pl-1.5"
                            title="Reset Zoom"
                        >
                            Reset
                        </button>
                    </div>

                    <Button 
                        variant="secondary" 
                        onClick={onRegenerate} 
                        className="!py-1.5 !px-2.5 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
                    >
                        <RefreshCw size={14} className="sm:mr-1.5" />
                        <span className="hidden sm:inline">Regenerate</span>
                    </Button>

                    <Button 
                        variant="secondary" 
                        onClick={() => window.print()} 
                        className="!py-1.5 !px-2.5 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
                    >
                        <Printer size={14} className="sm:mr-1.5" />
                        <span className="hidden sm:inline">Print</span>
                    </Button>

                    <Button 
                        onClick={handleDownload} 
                        className="!py-1.5 !px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-sm"
                    >
                        <Download size={14} className="mr-1.5" />
                        <span>Download</span>
                    </Button>

                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100 ml-1" 
                        aria-label="Close PDF Preview"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Document Render Area */}
            <div 
                ref={containerRef}
                className="flex-grow overflow-auto p-4 flex flex-col items-center justify-start bg-slate-900/60 rounded-xl mt-3 border border-slate-800/80 shadow-inner custom-scrollbar"
            >
                {loading && (
                    <div className="flex flex-col items-center justify-center my-auto py-12 text-slate-400 space-y-3">
                        <Loader2 size={36} className="animate-spin text-indigo-400" />
                        <p className="text-sm font-medium">Rendering PDF preview...</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center my-auto py-12 px-4 text-center max-w-md bg-slate-850 rounded-2xl border border-slate-800">
                        <p className="text-sm text-amber-300 mb-4">{error}</p>
                        <Button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-500">
                            <Download size={16} className="mr-2" />
                            Download & Open Document
                        </Button>
                    </div>
                )}

                {!loading && !error && numPages > 0 && (
                    <div className="space-y-6 flex flex-col items-center py-2 w-full">
                        {Array.from({ length: numPages }, (_, index) => {
                            const pageNum = index + 1;
                            return (
                                <div key={pageNum} className="flex flex-col items-center">
                                    <div className="bg-white rounded shadow-2xl overflow-hidden border border-slate-700">
                                        <canvas
                                            ref={(el) => {
                                                if (el) pageCanvasRefs.current.set(pageNum, el);
                                                else pageCanvasRefs.current.delete(pageNum);
                                            }}
                                            className="block max-w-full h-auto"
                                        />
                                    </div>
                                    {numPages > 1 && (
                                        <span className="text-[11px] text-slate-400 mt-2 font-mono">
                                            Page {pageNum} of {numPages}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFPreviewModal;
