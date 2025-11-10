import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart3 } from 'lucide-react';

export function InsightsPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 p-4 bg-white">
        <h2 className="text-lg font-semibold">Insights & Analytics</h2>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-400" />
              <CardTitle>Coming in Phase 5</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              AI-powered insights will be implemented in Phase 5, including:
            </p>
            <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
              <li>Theme detection and distribution</li>
              <li>Sentiment analysis over time</li>
              <li>Keyword extraction and trending topics</li>
              <li>Writing statistics and streaks</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
