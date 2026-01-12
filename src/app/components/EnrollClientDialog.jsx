"use client"

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Clock, Target, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function EnrollClientDialog({
  open,
  onOpenChange,
  clientName,
  availablePrograms,
  onEnroll,
  loading = false
}) {
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async () => {
    if (!selectedProgramId) return;
    
    setIsEnrolling(true);
    try {
      await onEnroll(selectedProgramId);
      toast.success(`${clientName} has been enrolled in the program`);
      onOpenChange(false);
      setSelectedProgramId(null);
    } catch (error) {
      toast.error('Failed to enroll client');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Enroll {clientName} in Program</DialogTitle>
          <DialogDescription>
            Select a program to enroll this client in. They will start immediately upon enrollment.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading available programs...</p>
              </div>
            ) : availablePrograms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available programs. The client is already enrolled in all existing programs.
              </div>
            ) : (
              availablePrograms.map((program) => (
                <Card 
                  key={program.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProgramId === program.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : ''
                  }`}
                  onClick={() => setSelectedProgramId(program.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{program.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {program.description || 'No description available'}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{program.category || 'General'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{program.duration || 4} weeks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>{program.elements?.length || 0} elements</span>
                      </div>
                      {program.targetConditions && program.targetConditions.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{program.targetConditions.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEnroll} 
            disabled={!selectedProgramId || isEnrolling || availablePrograms.length === 0 || loading}
            className="min-w-[120px]"
          >
            {isEnrolling ? 'Enrolling...' : 'Enroll Client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}