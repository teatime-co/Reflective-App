import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { TagBadge } from '../components/TagBadge';
import { Plus, Trash2 } from 'lucide-react';
import { useTagsStore } from '../stores/useTagsStore';

export function TagsPage() {
  const { tags, loadTags, createTag, deleteTag, isLoading } = useTagsStore();
  const [newTagName, setNewTagName] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const tag = await createTag({ name: newTagName.trim() });
    if (tag) {
      setNewTagName('');
      setShowInput(false);
    }
  };

  const handleDeleteTag = async (id: number, name: string) => {
    const confirmed = confirm(`Are you sure you want to delete the tag "${name}"?`);
    if (confirmed) {
      await deleteTag(id);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 p-4 flex items-center justify-between bg-white">
        <h2 className="text-lg font-semibold">Tags</h2>
        <Button onClick={() => setShowInput(!showInput)}>
          <Plus className="h-4 w-4 mr-2" />
          New Tag
        </Button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {showInput && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTag();
                      } else if (e.key === 'Escape') {
                        setShowInput(false);
                        setNewTagName('');
                      }
                    }}
                    placeholder="Tag name"
                    autoFocus
                  />
                  <Button onClick={handleCreateTag} disabled={isLoading}>
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInput(false);
                      setNewTagName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading && tags.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-500">Loading tags...</p>
            </div>
          ) : tags.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-lg font-medium text-slate-700 mb-2">No tags yet</p>
                <p className="text-sm text-slate-500 mb-4">
                  Create tags to organize your journal entries
                </p>
                <Button onClick={() => setShowInput(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map((tag) => (
                <Card key={tag.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <TagBadge tag={tag} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">
                      Used in {tag.usage_count} {tag.usage_count === 1 ? 'entry' : 'entries'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
