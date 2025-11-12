import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Search, Loader2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useEmbeddingsStore } from '../stores/useEmbeddingsStore';
import { useEntriesStore } from '../stores/useEntriesStore';
import { useUIStore } from '../stores/useUIStore';
import { useTagsStore } from '../stores/useTagsStore';
import { TagBadge } from '../components/TagBadge';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

let debounceTimer: NodeJS.Timeout;

export function SearchPage() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const {
    query,
    setQuery,
    searchResults,
    isSearching,
    isIndexing,
    indexStatus,
    error,
    searchSimilar,
    rebuildIndex,
    checkStatus,
    clearResults
  } = useEmbeddingsStore();
  const { entries, generateEmbeddingsForAllEntries, isGeneratingEmbedding } = useEntriesStore();
  const { markEntryAsVisited, isEntryVisited } = useUIStore();
  const { entryTags, getTagsForEntry } = useTagsStore();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (!query.trim() && searchResults.length > 0) {
      clearResults();
    }
  }, [query, searchResults.length, clearResults]);

  useEffect(() => {
    const savedScroll = sessionStorage.getItem('searchPageScroll');
    if (savedScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
      sessionStorage.removeItem('searchPageScroll');
    }
  }, []);

  useEffect(() => {
    searchResults.forEach((result) => {
      getTagsForEntry(result.entryId);
    });
  }, [searchResults, getTagsForEntry]);

  const handleSearch = useCallback((searchQuery: string) => {
    clearTimeout(debounceTimer);

    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    debounceTimer = setTimeout(() => {
      searchSimilar(searchQuery, 10);
    }, 300);
  }, [searchSimilar, clearResults]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    handleSearch(newQuery);
  };

  const handleResultClick = (entryId: string) => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem('searchPageScroll', scrollContainerRef.current.scrollTop.toString());
    }
    markEntryAsVisited(entryId);
    navigate(`/editor/${entryId}`, { state: { from: '/search' } });
  };

  const handleRebuildIndex = async () => {
    await rebuildIndex();
  };

  const [progress, setProgress] = React.useState({ current: 0, total: 0 });

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setProgress({ current: 0, total: entries.length });

    const result = await generateEmbeddingsForAllEntries((current, total) => {
      setProgress({ current, total });
    });

    setIsGeneratingAll(false);

    let message = `Generated embeddings:\n${result.success} successful\n${result.failed} failed`;
    if (result.errors.length > 0) {
      message += `\n\nFirst 5 errors:\n`;
      result.errors.slice(0, 5).forEach(err => {
        message += `\nEntry ${err.id} (${err.contentLength} chars): ${err.error}`;
      });
    }
    alert(message);

    if (result.success > 0) {
      await rebuildIndex();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Semantic Search</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAll}
            disabled={isGeneratingAll || isGeneratingEmbedding}
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Indexing {progress.current}/{progress.total}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Rebuild Search Index
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search entries by meaning..."
              value={query}
              onChange={handleQueryChange}
              className="pl-9"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRebuildIndex}
            disabled={isIndexing}
          >
            {isIndexing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rebuilding...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rebuild Index
              </>
            )}
          </Button>
        </div>

        {indexStatus && (
          <div className="mt-2 text-xs text-slate-500">
            Index status: {indexStatus.state} | {indexStatus.entryCount} entries indexed
          </div>
        )}
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
        {isSearching && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && !isSearching && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {!isSearching && !error && query && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm">Try a different search query</p>
          </div>
        )}

        {!isSearching && !query && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Start searching</p>
            <p className="text-sm">Enter a query to find semantically similar entries</p>
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-4">
            {searchResults.map((result) => (
              <Card
                key={result.entryId}
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:-translate-y-0.5",
                  "active:scale-[0.98] active:shadow-sm"
                )}
                onClick={() => handleResultClick(result.entryId)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">
                        {format(new Date(result.entry.created_at), 'MMM d, yyyy')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(result.score * 100)}% match
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400">
                      {result.entry.word_count} words
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 line-clamp-3">
                    {result.preview}
                  </p>

                  {entryTags.get(result.entryId)?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {entryTags.get(result.entryId)!.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} />
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
