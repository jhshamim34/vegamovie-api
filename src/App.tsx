import React, { useState } from 'react';
import { Search, Loader2, Code2, Info, Download, Film, Tv, Clock } from 'lucide-react';

export default function App() {
  const [endpoint, setEndpoint] = useState<'search' | 'info' | 'download' | 'movies' | 'series' | 'latest'>('search');
  const [inputValue, setInputValue] = useState('');
  const [quality, setQuality] = useState('480p');
  const [season, setSeason] = useState('');
  const [page, setPage] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && endpoint !== 'movies' && endpoint !== 'series' && endpoint !== 'latest') return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let url = '';
      if (endpoint === 'search') {
        url = `/api/search?q=${encodeURIComponent(inputValue)}`;
      } else if (endpoint === 'info') {
        url = `/api/info?id=${encodeURIComponent(inputValue)}`;
      } else if (endpoint === 'download') {
        url = `/api/download?id=${encodeURIComponent(inputValue)}&quality=${encodeURIComponent(quality)}`;
        if (season.trim()) {
          url += `&se=${encodeURIComponent(season)}`;
        }
      } else if (endpoint === 'movies') {
        url = `/api/movies?page=${encodeURIComponent(page)}`;
      } else if (endpoint === 'series') {
        url = `/api/series?page=${encodeURIComponent(page)}`;
      } else if (endpoint === 'latest') {
        url = `/api/latest-releases?page=${encodeURIComponent(page)}`;
      }
        
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    if (endpoint === 'search') return "Enter movie keyword (e.g. batman)";
    if (endpoint === 'info') return "Enter movie ID (e.g. download-bloodhounds-netflix-web-series)";
    if (endpoint === 'download') return "Enter movie ID (e.g. download-bloodhounds-netflix-web-series)";
    return "";
  };

  const getIcon = () => {
    if (endpoint === 'search') return <Search className="h-5 w-5 text-gray-400" />;
    if (endpoint === 'info') return <Info className="h-5 w-5 text-gray-400" />;
    if (endpoint === 'download') return <Download className="h-5 w-5 text-gray-400" />;
    if (endpoint === 'movies') return <Film className="h-5 w-5 text-gray-400" />;
    if (endpoint === 'series') return <Tv className="h-5 w-5 text-gray-400" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-2 text-blue-600">
            <Code2 className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Movie Scraper API</h1>
          <p className="text-gray-500 text-lg">
            Test the API endpoints for searching, fetching info, extracting download links, and listing movies/series.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={() => { setEndpoint('search'); setInputValue(''); setResult(null); setError(''); }}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${endpoint === 'search' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Search API
          </button>
          <button
            onClick={() => { setEndpoint('info'); setInputValue(''); setResult(null); setError(''); }}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${endpoint === 'info' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Info API
          </button>
          <button
            onClick={() => { setEndpoint('download'); setInputValue(''); setResult(null); setError(''); }}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${endpoint === 'download' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Download API
          </button>
          <button
            onClick={() => { setEndpoint('movies'); setInputValue(''); setResult(null); setError(''); }}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${endpoint === 'movies' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Movies API
          </button>
          <button
            onClick={() => { setEndpoint('series'); setInputValue(''); setResult(null); setError(''); }}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${endpoint === 'series' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Series API
          </button>
          <button
            onClick={() => { setEndpoint('latest'); setInputValue(''); setResult(null); setError(''); }}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${endpoint === 'latest' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Latest Releases
          </button>
        </div>

        <form onSubmit={handleFetch} className="flex flex-col gap-4 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            {(endpoint === 'search' || endpoint === 'info' || endpoint === 'download') && (
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  {getIcon()}
                </div>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                />
              </div>
            )}
            
            {(endpoint === 'movies' || endpoint === 'series' || endpoint === 'latest') && (
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  {getIcon()}
                </div>
                <input
                  type="number"
                  min="1"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="Page number (e.g. 1)"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || ((endpoint === 'search' || endpoint === 'info' || endpoint === 'download') && !inputValue.trim())}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg min-w-[140px]"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Fetch Data'}
            </button>
          </div>

          {endpoint === 'download' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Quality</label>
                <input
                  type="text"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  placeholder="e.g. 480p, 720p, 1080p"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Season (Optional)</label>
                <input
                  type="text"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g. 1, 2"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          )}
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl max-w-2xl mx-auto">
            <p className="font-medium">Error occurred</p>
            <p className="text-sm mt-1 opacity-90">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <span className="text-sm font-mono text-gray-600 font-medium">Response JSON</span>
              <span className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1 rounded-full">
                Status: 200 OK
              </span>
            </div>
            <div className="p-6 overflow-auto max-h-[600px] bg-[#0d1117] text-[#c9d1d9]">
              <pre className="font-mono text-sm whitespace-pre-wrap break-words">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
