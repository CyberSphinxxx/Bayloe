
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { FileCard } from './components/FileCard';
import { useConverter } from './hooks/useConverter';
import { ArrowRight, Trash2 } from 'lucide-react';

function App() {
  const { files, addFiles, removeFile, updateFileFormat, convertFile, convertAll } = useConverter();

  const handleClearAll = () => {
    files.forEach((f) => removeFile(f.id));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />

      <main className="pt-28 px-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
            Convert your images <br />
            <span className="text-indigo-600">securely in the browser</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            No server uploads. No file limits. Convert HEIC, PNG, JPG, and WEBP files instantly using advanced client-side technology.
          </p>
        </div>

        <Dropzone onFilesAdded={addFiles} />

        {files.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Queue ({files.length})
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
                <button
                  onClick={convertAll}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 text-sm font-medium"
                >
                  Convert All
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  fileItem={file}
                  onRemove={removeFile}
                  onFormatChange={updateFileFormat}
                  onConvert={convertFile}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
