import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { EditorToolbar } from '../components/EditorToolbar';
import { TagBadge } from '../components/TagBadge';
import { Input } from '../components/ui/input';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useEntriesStore } from '../stores/useEntriesStore';
import { useTagsStore } from '../stores/useTagsStore';

export function EntryEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentEntry, getEntry, createEntry, updateEntry, deleteEntry, isLoading } = useEntriesStore();
  const { tags, entryTags, loadTags, getTagsForEntry, addTagToEntry, removeTagFromEntry, createTag } = useTagsStore();

  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);

      if (id && currentEntry) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          handleAutoSave(editor.getHTML(), words);
        }, 300);
      }
    },
  });

  useEffect(() => {
    if (id) {
      const entryId = parseInt(id, 10);
      getEntry(entryId);
      getTagsForEntry(entryId);
    }
    loadTags();
  }, [id]);

  useEffect(() => {
    if (editor && currentEntry) {
      editor.commands.setContent(currentEntry.content);
      setWordCount(currentEntry.word_count);
    }
  }, [editor, currentEntry]);

  const handleAutoSave = async (content: string, words: number) => {
    if (!id || !currentEntry) return;

    setIsSaving(true);
    await updateEntry(parseInt(id, 10), {
      content,
      word_count: words,
    });
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!editor) return;

    const content = editor.getHTML();
    const words = wordCount;

    if (id && currentEntry) {
      setIsSaving(true);
      const success = await updateEntry(parseInt(id, 10), { content, word_count: words });
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
      const success = await deleteEntry(parseInt(id, 10));
      if (success) {
        navigate('/entries');
      }
    }
  };

  const handleAddTag = async (tagId: number) => {
    if (!id) return;
    await addTagToEntry(parseInt(id, 10), tagId);
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!id) return;
    await removeTagFromEntry(parseInt(id, 10), tagId);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const tag = await createTag({ name: newTagName.trim() });
    if (tag && id) {
      await addTagToEntry(parseInt(id, 10), tag.id);
    }
    setNewTagName('');
    setShowTagInput(false);
  };

  const currentEntryTags = id ? entryTags.get(parseInt(id, 10)) || [] : [];
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
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/entries')}>
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
      )}

      <EditorToolbar editor={editor} />

      <div className="flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
