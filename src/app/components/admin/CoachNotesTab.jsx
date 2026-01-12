"use client"

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Plus, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CreateCoachNoteDialog } from "./CreateCoachNoteDialog";

export function CoachNotesTab({ coachId, coachName }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [coachId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/coaches/${coachId}/notes`);
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.notes || []);
      } else {
        toast.error('Failed to load notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Error loading notes');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteCreated = (note) => {
    setNotes(prev => [note, ...prev]);
    setShowCreateDialog(false);
    toast.success('Note created successfully');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Notes about {coachName}</h3>
          <p className="text-sm text-muted-foreground">
            Keep track of important information and observations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No notes yet</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{note.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.createdByName && `Created by ${note.createdByName}`} • {formatDate(note.createdAt)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {note.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {note.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <CreateCoachNoteDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        coachId={coachId}
        onNoteCreated={handleNoteCreated}
      />
    </div>
  );
}
