"use client"
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { CreateGroupNoteDialog } from "./CreateGroupNoteDialog";

export function GroupNotesPanel({ groupId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 640);
      }
    };

    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  const fetchGroupNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/groups/${groupId}/notes`);
      if (!response.ok) {
        throw new Error('Failed to fetch group notes');
      }
      const result = await response.json();
      setNotes(result.notes || []);
    } catch (err) {
      console.error('Error fetching group notes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroupNotes();
    }
  }, [groupId]);

  const handleNoteCreated = (newNote) => {
    setNotes(prev => [newNote, ...prev]);
  };

  return (
    <Card className={`${isMobile ? 'p-0 shadow-none border-0' : 'shadow-soft border-border'} bg-card`}>
      <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : 'pb-3'}>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Notes</CardTitle>
          <CreateGroupNoteDialog 
            groupId={groupId}
            onNoteCreated={handleNoteCreated}
          >
            <Button size={isMobile ? "sm" : "sm"} variant="ghost" className={isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}>
              <svg className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </CreateGroupNoteDialog>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
        <ScrollArea className={isMobile ? 'h-[200px]' : 'h-[250px]'}>
          {loading ? (
            <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
              <div className="text-center">
                <Loader2 className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
                <p className={`${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'} text-muted-foreground`}>Loading notes...</p>
              </div>
            </div>
          ) : error ? (
            <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
              <div className="text-center">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-destructive ${isMobile ? 'mb-1' : 'mb-2'} break-words`}>Error: {error}</p>
                <Button size={isMobile ? "sm" : "sm"} variant="outline" onClick={fetchGroupNotes} className={isMobile ? 'text-xs h-7 mt-1' : ''}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : notes.length === 0 ? (
            <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
              <div className="text-center">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>No notes yet</p>
              </div>
            </div>
          ) : (
            <div className={`${isMobile ? 'space-y-1.5 pr-2' : 'space-y-2 pr-4'}`}>
              {notes.map((note) => (
                <div key={note.id} className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer`}>
                  <h4 className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-foreground break-words`}>{note.title}</h4>
                  <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1 line-clamp-2 break-words`}>
                    {note.description || 'No description'}
                  </p>
                  <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1`}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
