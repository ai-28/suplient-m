"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useTranslation } from '@/app/context/LanguageContext';

export function DailyNotes({ currentDate, analyticsData, loading, error }) {
  const t = useTranslation();
  
  // Get notes from analyticsData
  const notes = analyticsData?.currentDateNotes || null;

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">{t('client.dashboard.loadingNotes', 'Loading notes...')}</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">{t('client.dashboard.errorLoadingNotes', 'Error loading notes')}: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t('client.dashboard.dailyNotes', 'Daily Notes')} - {currentDate ? formatDate(currentDate) : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes ? (
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            {t('client.dashboard.noNotesForDate', 'No notes saved for this date')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DailyNotes;

