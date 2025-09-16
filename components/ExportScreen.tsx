import React, { useState, useRef, useEffect } from 'react';
import type { Message, Service } from '../types';
import { getStyledReport, downloadHtml, downloadPdf } from '../utils/exportUtils';
import { generateExportReport } from '../services/geminiService';
import { DownloadIcon, FileCodeIcon, HomeIcon } from './icons';

interface ExportScreenProps {
  conversation: Message[];
  onStartNew: () => void;
  userName: string;
  service: Service;
}

const ExportScreen: React.FC<ExportScreenProps> = ({ conversation, onStartNew, userName, service }) => {
  const [fileName, setFileName] = useState(`${service.name.toLowerCase().replace(/ /g, '-')}-report-${new Date().toISOString().split('T')[0]}`);
  const [fullReportHtml, setFullReportHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const generateReport = async () => {
        setIsGenerating(true);
        try {
            const reportContent = await generateExportReport(conversation, service, userName);
            const styledReport = getStyledReport(reportContent, service.id, fileName);
            setFullReportHtml(styledReport);
        } catch (error) {
            console.error("Failed to generate report:", error);
            const fallbackHtml = getStyledReport("<p>Sorry, there was an error generating the report.</p>", "dev", fileName);
            setFullReportHtml(fallbackHtml);
        } finally {
            setIsGenerating(false);
        }
    };
    generateReport();
  }, [conversation, service, userName, fileName]);

  const handleDownloadHTML = () => {
    if (fullReportHtml) {
      downloadHtml(fullReportHtml, fileName);
    }
  };

  const handleDownloadPDF = () => {
    if (previewRef.current?.contentWindow?.document?.body) {
      downloadPdf(previewRef.current.contentWindow.document.body, fileName);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold mb-2">Export Conversation Report</h1>
        <p className="text-gray-400">Your conversation has been analyzed and formatted into a professional report.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                 <h3 className="text-lg font-bold mb-4">Download Options</h3>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="fileName" className="block text-sm font-medium text-gray-300 mb-1">File Name</label>
                        <input
                        type="text"
                        id="fileName"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <button onClick={handleDownloadPDF} disabled={isGenerating || !fullReportHtml} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <DownloadIcon /> Download PDF
                    </button>
                    <button onClick={handleDownloadHTML} disabled={isGenerating || !fullReportHtml} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileCodeIcon /> Download HTML
                    </button>
                 </div>
            </div>
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                 <h3 className="text-lg font-bold mb-4">New Simulation</h3>
                <button onClick={onStartNew} className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                    <HomeIcon /> Start New
                </button>
             </div>
        </div>

        {/* Preview */}
        <div className="md:col-span-2">
            <h3 className="text-lg font-bold mb-4">Report Preview</h3>
            <div className="bg-gray-700 p-1 rounded-lg shadow-lg h-[70vh] w-full">
                {isGenerating && (
                    <div className="p-6 text-center text-white h-full flex flex-col justify-center items-center">
                        <p className="text-lg font-semibold mb-2">Generating your report...</p>
                        <p className="text-gray-400">The AI is analyzing the conversation and designing your document.</p>
                        <div className="w-full bg-gray-600 rounded-full h-2.5 mt-4 max-w-sm"><div className="bg-blue-500 h-2.5 rounded-full animate-pulse w-3/4 mx-auto"></div></div>
                    </div>
                )}
                {!isGenerating && fullReportHtml && (
                     <iframe
                        ref={previewRef}
                        srcDoc={fullReportHtml}
                        title="Report Preview"
                        className="w-full h-full border-0 rounded-md"
                        sandbox="allow-scripts"
                     />
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExportScreen;