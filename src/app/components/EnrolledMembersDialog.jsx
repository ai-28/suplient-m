"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Progress } from '@/app/components/ui/progress';
import { User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const getStatusColor = (status) => {
  switch (status) {
    case 'enrolled':
      return 'bg-gray-500/10 text-gray-600 border-gray-200';
    case 'active':
      return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'paused':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
    case 'completed':
      return 'bg-green-500/10 text-green-600 border-green-200';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-200';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'enrolled':
      return <User className="h-3 w-3" />;
    case 'active':
      return <Clock className="h-3 w-3" />;
    case 'paused':
      return <AlertCircle className="h-3 w-3" />;
    case 'completed':
      return <CheckCircle2 className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

export default function EnrolledMembersDialog({
  isOpen,
  onClose,
  programName,
  enrolledClients
}) {
  const router = useRouter();
console.log("enrolledClients", enrolledClients);
  const handleClientClick = (clientId) => {
    router.push(`/coach/clients/${clientId}?tab=programs`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Enrolled Members - {programName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {enrolledClients.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No enrolled clients</h3>
              <p className="text-muted-foreground">
                This program doesn't have any enrolled clients yet.
              </p>
            </div>
          ) : (
            enrolledClients.map((client, index) => {
              const completedElements = client.progress?.completedElements || 0;
              const totalElements = client.progress?.totalElements || 0;
              const completionRate = totalElements > 0 ? (completedElements / totalElements) * 100 : 0;
              
              return (
                <div 
                  key={client.enrollmentId || client.id || `enrolled-client-${index}`} 
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleClientClick(client.id)}
                >
                  <Avatar className="h-12 w-12">
                    {client.avatar && (
                      <AvatarImage
                        src={client.avatar}
                        alt={client.name || 'Client'}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback>
                      {client.name ? client.name.split(' ').map(n => n && n[0] ? n[0] : '').filter(Boolean).join('').toUpperCase().slice(0, 2) || 'U' : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{client.name || 'Unknown Client'}</h4>
                        <p className="text-sm text-muted-foreground">{client.email || 'No email'}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(client.progress?.status || 'unknown')}
                      >
                        {getStatusIcon(client.progress?.status || 'unknown')}
                        <span className="ml-1 capitalize">
                          {(client.progress?.status || 'unknown').replace('-', ' ')}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{client.progress?.completedElements || 0}/{client.progress?.totalElements || 0} elements</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Day {client.progress?.currentDay || 0}</span>
                        <span>{Math.round(completionRate)}% complete</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Enrolled on {client.enrolledDate ? new Date(client.enrolledDate).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}