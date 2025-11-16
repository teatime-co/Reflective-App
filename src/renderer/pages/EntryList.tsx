import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
import { EntryCard } from '../components/EntryCard';
import { PenSquare, RefreshCw } from 'lucide-react';
import { useEntriesStore } from '../stores/useEntriesStore';
import { useTagsStore } from '../stores/useTagsStore';
import { useUIStore } from '../stores/useUIStore';

export function EntryList() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { entries, isLoading, loadEntries, createEntry } = useEntriesStore();
  const { entryTags, getTagsForEntry } = useTagsStore();
  const { markEntryAsVisited, isEntryVisited } = useUIStore();

  useEffect(() => {
    loadEntries();
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 162,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    virtualItems.forEach((virtualRow) => {
      const entry = entries[virtualRow.index];
      if (entry) {
        getTagsForEntry(entry.id);
      }
    });
  }, [virtualItems, entries]);

  useEffect(() => {
    const savedScroll = sessionStorage.getItem('entryListScroll');
    if (savedScroll && scrollContainerRef.current && entries.length > 0) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
        }
      }, 0);
      sessionStorage.removeItem('entryListScroll');
    }
  }, [entries]);

  const handleNewEntry = async () => {
    const newEntry = await createEntry({ content: '', word_count: 0 });
    if (newEntry) {
      navigate(`/editor/${newEntry.id}`);
    }
  };

  const handleEntryClick = (entryId: string) => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem('entryListScroll', scrollContainerRef.current.scrollTop.toString());
    }
    markEntryAsVisited(entryId);
    navigate(`/editor/${entryId}`, { state: { from: '/entries' } });
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 p-4 flex items-center justify-between bg-white">
        <h2 className="text-lg font-semibold">Your Entries</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadEntries} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleNewEntry}>
            <PenSquare className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollContainerRef} className="flex-1 p-6">
        {isLoading && entries.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-500">Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <PenSquare className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-700 mb-2">No entries yet</p>
            <p className="text-sm text-slate-500 mb-4">
              Start your journaling journey by creating your first entry
            </p>
            <Button onClick={handleNewEntry}>
              <PenSquare className="h-4 w-4 mr-2" />
              Create Entry
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualRow) => {
                const entry = entries[virtualRow.index];
                return (
                  <div
                    key={entry.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: '1rem',
                    }}
                  >
                    <EntryCard
                      entry={entry}
                      tags={entryTags.get(entry.id) || []}
                      onClick={() => handleEntryClick(entry.id)}
                      isVisited={isEntryVisited(entry.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
