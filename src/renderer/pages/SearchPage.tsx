import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Search } from 'lucide-react';

export function SearchPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 p-4 bg-white">
        <h2 className="text-lg font-semibold">Semantic Search</h2>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-400" />
              <CardTitle>Coming in Phase 4</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Semantic search with vector embeddings will be implemented in Phase 4.
              This will allow you to find journal entries based on meaning, not just keywords.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
