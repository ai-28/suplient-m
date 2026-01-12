"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Input } from "@/app/components/ui/input";
import { 
  Calendar,
  Users,
  CheckCircle,
  Search,
  Info
} from "lucide-react";

export function TaskCompletionModal({ open, onOpenChange, task }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  if (!task) return null;

  const completedMembers = task.completions.filter(c => c.completed);
  const pendingMembers = task.completions.filter(c => !c.completed);

  const filteredCompletedMembers = completedMembers.filter(member =>
    member.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingMembers = pendingMembers.filter(member =>
    member.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  );

    const handleMemberClick = (memberId) => {
      router.push(`/coach/client/${memberId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">{task.title}</DialogTitle>
          <DialogDescription className="sr-only">
            View task completion status and member details for {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Task Details - Fixed at top */}
          <div className="bg-muted/30 p-4 rounded-lg flex-shrink-0">
            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
            
            <div className="flex items-center justify-between text-sm mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due: {task.dueDate}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {task.completedCount}/{task.assignedCount} completed
                </span>
              </div>
            </div>

            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${(task.completedCount / task.assignedCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Coach Tip - Fixed at top */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              <strong>Take Action:</strong> Reach out to members who haven't completed their tasks yet. They may need extra encouragement, clarification, or support to stay on track. Click on any member's name to visit their profile and start a conversation.
            </p>
          </div>

          {/* Search - Fixed at top of scrollable area */}
          <div className="relative flex-shrink-0">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Scrollable Members List */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4 pr-4">
                {/* Pending Members - Show First */}
                {filteredPendingMembers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-orange-500" />
                      Pending ({filteredPendingMembers.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredPendingMembers.map((member) => (
                        <div
                          key={member.memberId}
                          onClick={() => handleMemberClick(member.memberId)}
                          className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {member.memberInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{member.memberName}</p>
                            <p className="text-xs text-muted-foreground">Pending completion</p>
                          </div>
                          <CheckCircle className="h-4 w-4 text-orange-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Members - Show Second */}
                {filteredCompletedMembers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Completed ({filteredCompletedMembers.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredCompletedMembers.map((member) => (
                        <div
                          key={member.memberId}
                          onClick={() => handleMemberClick(member.memberId)}
                          className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {member.memberInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{member.memberName}</p>
                            <p className="text-xs text-muted-foreground">
                              Completed {member.completedAt ? new Date(member.completedAt).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {searchTerm && filteredCompletedMembers.length === 0 && filteredPendingMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No members found matching "{searchTerm}"</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
