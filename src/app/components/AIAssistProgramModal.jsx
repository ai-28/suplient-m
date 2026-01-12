"use client"

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { QuestionnaireSteps } from "./QuestionnaireSteps";
import { ProgramReviewScreen } from "./ProgramReviewScreen";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function AIAssistProgramModal({ open, onOpenChange }) {
  const [step, setStep] = useState(1); // 1: Questionnaire, 2: Generation, 3: Review
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [generatedProgram, setGeneratedProgram] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [showDraftSelector, setShowDraftSelector] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const originalProgramRef = useRef(null);

  // Load drafts when modal opens
  useEffect(() => {
    if (open) {
      const loadDrafts = async () => {
        try {
          const response = await fetch('/api/ai/drafts');
          if (response.ok) {
            const data = await response.json();
            setDrafts(data.drafts || []);
            // If there are drafts and we're starting fresh, show selector
            if (data.drafts?.length > 0 && step === 1 && !draftId && !questionnaireData) {
              setShowDraftSelector(true);
            }
          }
        } catch (error) {
          console.error('Error loading drafts:', error);
        }
      };
      loadDrafts();
      // Reset state when opening fresh (only if no existing state)
      if (step === 1 && !draftId && !questionnaireData) {
        setQuestionnaireData(null);
        setGeneratedProgram(null);
        setDraftId(null);
        setHasUnsavedChanges(false);
        originalProgramRef.current = null;
        setShowDraftSelector(false);
      }
    } else {
      // Reset when closing
      setShowDraftSelector(false);
    }
  }, [open, step, draftId, questionnaireData]);

  const handleLoadDraft = async (selectedDraftId) => {
    try {
      const response = await fetch(`/api/ai/load-draft/${selectedDraftId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load draft');
      }
      const data = await response.json();
      
      // Log for debugging
      console.log('Draft loaded:', {
        hasDraft: !!data.draft,
        hasProgramData: !!data.draft?.programData,
        hasQuestionnaireData: !!data.draft?.questionnaireData,
        programDataType: typeof data.draft?.programData,
        programDataKeys: data.draft?.programData ? Object.keys(data.draft.programData) : null
      });

      if (!data.draft || !data.draft.programData || !data.draft.questionnaireData) {
        throw new Error('Draft data is incomplete');
      }

      setDraftId(data.draft.id);
      setQuestionnaireData(data.draft.questionnaireData);
      setGeneratedProgram(data.draft.programData);
      originalProgramRef.current = JSON.stringify(data.draft.programData);
      setStep(3); // Go directly to review step
      setShowDraftSelector(false);
      toast.success("Draft loaded successfully");
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error(error.message || 'Failed to load draft');
    }
  };

  const handleDeleteDraft = async (draftIdToDelete, event) => {
    event.stopPropagation(); // Prevent triggering the resume action
    setDraftToDelete(draftIdToDelete);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    
    try {
      const response = await fetch(`/api/ai/delete-draft/${draftToDelete}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }

      // Remove from local state
      setDrafts(drafts.filter(d => d.id !== draftToDelete));
      setDraftToDelete(null);
      setShowDeleteConfirmation(false);
      toast.success("Draft deleted successfully");
      
      // If we deleted the current draft, reset state
      if (draftId === draftToDelete) {
        setDraftId(null);
      }

      // If no drafts left, hide selector
      if (drafts.length === 1) {
        setShowDraftSelector(false);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Failed to delete draft');
    }
  };

  const handleQuestionnaireComplete = (data) => {
    setQuestionnaireData(data);
    setStep(2); // Move to generation
  };

  const handleGenerationComplete = (program) => {
    setGeneratedProgram(program);
    originalProgramRef.current = JSON.stringify(program);
    setStep(3); // Move to review
  };

  const handleDraftSaved = (savedDraftId) => {
    setDraftId(savedDraftId);
    setHasUnsavedChanges(false);
    if (generatedProgram) {
      originalProgramRef.current = JSON.stringify(generatedProgram);
    }
  };

  const handleClose = (force = false) => {
    if (!force && hasUnsavedChanges && step === 3) {
      setPendingClose(true);
      setShowCloseConfirmation(true);
      return;
    }
    // Reset state when closing
    setStep(1);
    setQuestionnaireData(null);
    setGeneratedProgram(null);
    setDraftId(null);
    setHasUnsavedChanges(false);
    originalProgramRef.current = null;
    setPendingClose(false);
    onOpenChange(false);
  };

  const handleConfirmClose = async (saveBeforeClose = false) => {
    if (saveBeforeClose && step === 3) {
      // Save draft before closing
      try {
        const response = await fetch('/api/ai/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programData: generatedProgram,
            questionnaireData: questionnaireData,
            draftId: draftId
          })
        });
        if (response.ok) {
          const result = await response.json();
          setDraftId(result.draft.id);
          toast.success("Draft saved before closing");
        }
      } catch (error) {
        console.error('Error saving draft:', error);
        toast.error('Failed to save draft');
      }
    }
    setShowCloseConfirmation(false);
    handleClose(true);
  };

  const handleImportComplete = () => {
    // Reset and close
    handleClose();
    // Optionally redirect to programs page
    if (typeof window !== 'undefined') {
      window.location.href = '/coach/programs';
    }
  };

  const handleBackToQuestionnaire = () => {
    // Clear generated program when going back to edit prompts
    setGeneratedProgram(null);
    setDraftId(null);
    setHasUnsavedChanges(false);
    originalProgramRef.current = null;
    setStep(1);
  };

  // Track changes to program
  useEffect(() => {
    if (step === 3 && generatedProgram) {
      if (originalProgramRef.current) {
        const currentProgram = JSON.stringify(generatedProgram);
        setHasUnsavedChanges(currentProgram !== originalProgramRef.current);
      } else {
        // Set original if not set yet
        originalProgramRef.current = JSON.stringify(generatedProgram);
      }
    }
  }, [generatedProgram, step]);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        }
      }}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assist Program Builder
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Answer a few questions to generate your program"}
            {step === 2 && "Generating your program with AI..."}
            {step === 3 && "Review and edit your generated program"}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {step === 1 && showDraftSelector && drafts.length > 0 ? (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Resume a Draft?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You have {drafts.length} saved draft{drafts.length > 1 ? 's' : ''}. Would you like to resume one?
                </p>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted"
                  >
                    <div 
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => handleLoadDraft(draft.id)}
                    >
                      <p className="font-medium truncate">{draft.name || draft.programName || 'Untitled Draft'}</p>
                      <p className="text-xs text-muted-foreground">
                        Saved {new Date(draft.lastSavedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleLoadDraft(draft.id)}
                      >
                        Resume
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowDraftSelector(false)}
                >
                  Start New Program
                </Button>
              </div>
            </div>
          ) : step === 1 ? (
            <QuestionnaireSteps
              onComplete={handleQuestionnaireComplete}
              onCancel={handleClose}
            />
          ) : null}

          {step === 2 && questionnaireData && (
            <ProgramGenerationStep
              questionnaireData={questionnaireData}
              onComplete={handleGenerationComplete}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && generatedProgram && questionnaireData && (
            <ProgramReviewScreen
              generatedProgram={generatedProgram}
              questionnaireData={questionnaireData}
              onImportComplete={handleImportComplete}
              onBack={handleBackToQuestionnaire}
              draftId={draftId}
              onDraftSaved={handleDraftSaved}
              onProgramChange={(updatedProgram) => {
                setGeneratedProgram(updatedProgram);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog for Unsaved Changes */}
    <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to your program. Would you like to save them as a draft before closing?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleConfirmClose(false)}>
            Close Without Saving
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => handleConfirmClose(true)}
          >
            Save Draft & Close
          </Button>
          <AlertDialogAction onClick={() => setShowCloseConfirmation(false)}>
            Cancel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this draft? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setDraftToDelete(null);
            setShowDeleteConfirmation(false);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteDraft}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

// Premium loading messages that show active, meaningful work
const loadingMessages = [
  { text: "Reviewing your insights...", duration: 2000 },
  { text: "Organizing your data...", duration: 2500 },
  { text: "Researching best practices...", duration: 3000 },
  { text: "Crafting a personalized plan...", duration: 3500 },
  { text: "Adding extra value...", duration: 4000 },
  { text: "Preparing your program...", duration: 8000 }
];

// Generation step component
function ProgramGenerationStep({ questionnaireData, onComplete, onBack }) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(loadingMessages[0].text);
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    generateProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotate through premium loading messages
  useEffect(() => {
    if (!isGenerating) return;

    const currentMessage = loadingMessages[progressIndex];
    if (!currentMessage) return;

    const timer = setTimeout(() => {
      setProgress(currentMessage.text);
      setProgressIndex((prev) => {
        const nextIndex = prev + 1;
        // Loop back to start if we've gone through all messages
        return nextIndex >= loadingMessages.length ? 0 : nextIndex;
      });
    }, currentMessage.duration);

    return () => clearTimeout(timer);
  }, [progressIndex, isGenerating, loadingMessages]);

  const generateProgram = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgressIndex(0);
      setProgress(loadingMessages[0].text);
      
      // Let the messages rotate for a bit before starting the actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch('/api/ai/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionnaireData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate program');
      }

      const data = await response.json();
      
      // Final premium message before completion
      setProgress("Finalizing your personalized program...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onComplete(data);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate program');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 py-8">
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center space-y-6 py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold text-foreground transition-all duration-500">
              {progress}
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              We're carefully crafting a program tailored specifically for your needs. This thoughtful process ensures the highest quality experience.
            </p>
          </div>
          <div className="w-full max-w-md">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(90, 20 + (progressIndex * 12))}%` 
                }}
              />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <div className="text-destructive text-lg font-medium">Error</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="px-4 py-2 border rounded-md hover:bg-muted"
            >
              Back
            </button>
            <button
              onClick={generateProgram}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

