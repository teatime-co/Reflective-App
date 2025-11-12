import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { EditorToolbar } from '../components/EditorToolbar';
import { TagBadge } from '../components/TagBadge';
import { Input } from '../components/ui/input';
import { Save, Plus, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { useEntriesStore } from '../stores/useEntriesStore';
import { useTagsStore } from '../stores/useTagsStore';
import { useThemesStore } from '../stores/useThemesStore';
import { Badge } from '../components/ui/badge';

export function EntryEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { currentEntry, getEntry, createEntry, updateEntry, deleteEntry, setCurrentEntry, isLoading, generateAndSaveEmbedding, isGeneratingEmbedding } = useEntriesStore();
  const { tags, entryTags, loadTags, getTagsForEntry, addTagToEntry, removeTagFromEntry, createTag } = useTagsStore();
  const { themes, isGenerating, generateThemes, loadThemesByEntry } = useThemesStore();

  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const embeddingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const lastSavedContentRef = useRef<string>('');
  const currentEntryIdRef = useRef<string | null>(null);
  const currentContentRef = useRef<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your thoughts...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-6',
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      currentContentRef.current = content;

      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);

      if (id && currentEntry) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          handleAutoSave(content, words);
        }, 3000);
      }
    },
  });

  useEffect(() => {
    if (id) {
      currentEntryIdRef.current = id;
      isInitialLoadRef.current = true;
      getEntry(id);
      getTagsForEntry(id);
      loadThemesByEntry(id);
    } else {
      currentEntryIdRef.current = null;
      isInitialLoadRef.current = true;
    }
    loadTags();
  }, [id]);

  useEffect(() => {
    if (
      editor &&
      currentEntry &&
      isInitialLoadRef.current &&
      currentEntry.id === currentEntryIdRef.current
    ) {
      editor.commands.setContent(currentEntry.content);
      setWordCount(currentEntry.word_count);
      lastSavedContentRef.current = currentEntry.content;
      currentContentRef.current = currentEntry.content;
      isInitialLoadRef.current = false;
    }
  }, [editor, currentEntry]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (embeddingTimeoutRef.current) {
        clearTimeout(embeddingTimeoutRef.current);
      }

      if (currentEntryIdRef.current && currentContentRef.current) {
        const content = currentContentRef.current;
        const text = editor?.getText() || '';
        const words = text.trim().split(/\s+/).filter(Boolean).length;

        if (content !== lastSavedContentRef.current) {
          updateEntry(currentEntryIdRef.current, {
            content,
            word_count: words,
          });
        }
      }
    };
  }, [editor]);

  const handleAutoSave = async (content: string, words: number) => {
    if (!id || !currentEntry) return;
    if (isSaving) return;

    if (content === lastSavedContentRef.current) {
      return;
    }

    setIsSaving(true);
    await updateEntry(id, {
      content,
      word_count: words,
    });
    lastSavedContentRef.current = content;
    setIsSaving(false);

    if (embeddingTimeoutRef.current) {
      clearTimeout(embeddingTimeoutRef.current);
    }
    embeddingTimeoutRef.current = setTimeout(() => {
      const text = editor?.getText() || '';
      if (text.trim().length > 20) {
        generateAndSaveEmbedding(id, text);
      }
    }, 2000);
  };

  const handleSave = async () => {
    if (!editor) return;

    const content = editor.getHTML();
    const words = wordCount;

    if (id && currentEntry) {
      setIsSaving(true);
      const success = await updateEntry(id, { content, word_count: words });
      setIsSaving(false);
      if (success) {
        navigate('/entries');
      }
    } else {
      setIsSaving(true);
      const newEntry = await createEntry({ content, word_count: words });
      setIsSaving(false);
      if (newEntry) {
        navigate(`/editor/${newEntry.id}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    const confirmed = confirm('Are you sure you want to delete this entry?');
    if (confirmed) {
      const success = await deleteEntry(id);
      if (success) {
        navigate('/entries');
      }
    }
  };

  const handleAddTag = async (tagId: number) => {
    if (!id) return;
    await addTagToEntry(id, tagId);

    if (currentEntry?.content) {
      console.log('[EntryEditor] Tag added, re-generating embedding in background...');
      generateAndSaveEmbedding(id, currentEntry.content).catch(err =>
        console.error('[EntryEditor] Background re-embedding failed:', err)
      );
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!id) return;
    await removeTagFromEntry(id, tagId);

    if (currentEntry?.content) {
      console.log('[EntryEditor] Tag removed, re-generating embedding in background...');
      generateAndSaveEmbedding(id, currentEntry.content).catch(err =>
        console.error('[EntryEditor] Background re-embedding failed:', err)
      );
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const tag = await createTag({ name: newTagName.trim() });
    if (tag && id) {
      await addTagToEntry(id, tag.id);

      if (currentEntry?.content) {
        console.log('[EntryEditor] New tag created and added, re-generating embedding in background...');
        generateAndSaveEmbedding(id, currentEntry.content).catch(err =>
          console.error('[EntryEditor] Background re-embedding failed:', err)
        );
      }
    }
    setNewTagName('');
    setShowTagInput(false);
  };

  const handleGenerateThemes = async () => {
    if (!id || !currentEntry?.content) return;

    const text = editor?.getText() || currentEntry.content;
    if (text.trim().length < 50) {
      alert('Entry is too short to generate themes. Please write at least 50 characters.');
      return;
    }

    await generateThemes(id, currentEntry.content);
  };

  const currentEntryTags = id ? entryTags.get(id) || [] : [];
  const availableTags = tags.filter(t => !currentEntryTags.some(et => et.id === t.id));

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {id ? 'Edit Entry' : 'New Entry'}
          </h2>
          <span className="text-sm text-slate-500">{wordCount} words</span>
          {isSaving && <span className="text-xs text-slate-400">Saving...</span>}
          {isGeneratingEmbedding && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Generating embedding...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateThemes}
              disabled={isGenerating || !currentEntry?.content}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Themes'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            const from = (location.state as any)?.from;
            if (from === '/search') {
              navigate('/search');
            } else {
              navigate('/entries');
            }
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {id && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {id && (
        <>
          <div className="border-b border-slate-200 p-4 bg-slate-50">
            <div className="flex flex-wrap gap-2 items-center">
              {currentEntryTags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onRemove={() => handleRemoveTag(tag.id)}
                />
              ))}

              {showTagInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTag();
                      } else if (e.key === 'Escape') {
                        setShowTagInput(false);
                        setNewTagName('');
                      }
                    }}
                    placeholder="New tag name"
                    className="h-8 w-32"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateTag}>
                    Add
                  </Button>
                </div>
              ) : (
                <>
                  {availableTags.slice(0, 5).map((tag) => (
                    <Button
                      key={tag.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tag.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {tag.name}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTagInput(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New Tag
                  </Button>
                </>
              )}
            </div>
          </div>

          {(themes.length > 0 || (currentEntry?.sentiment_score !== null && currentEntry?.sentiment_score !== undefined)) && (
            <div className="border-b border-slate-200 p-4 bg-white">
              <div className="flex items-start justify-between gap-6">
                {themes.length > 0 && (
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">AI-Generated Themes</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {themes.map((theme) => (
                        <Badge key={theme.id} variant="secondary" className="text-sm">
                          {theme.theme_name} ({Math.round(theme.confidence * 100)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {currentEntry?.sentiment_score !== null && currentEntry?.sentiment_score !== undefined && (
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">Sentiment</span>
                    </div>
                    <Badge
                      className={`text-sm ${
                        currentEntry.sentiment_score > 0.1
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : currentEntry.sentiment_score < -0.1
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-gray-100 text-gray-800 border-gray-300'
                      }`}
                      variant="outline"
                    >
                      {currentEntry.sentiment_score > 0.1
                        ? `Positive +${currentEntry.sentiment_score.toFixed(2)}`
                        : currentEntry.sentiment_score < -0.1
                        ? `Negative ${currentEntry.sentiment_score.toFixed(2)}`
                        : `Neutral ${currentEntry.sentiment_score.toFixed(2)}`}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <EditorToolbar editor={editor} />

      <div className="flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
