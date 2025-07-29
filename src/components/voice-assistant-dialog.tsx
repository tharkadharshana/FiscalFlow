
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Mic, MicOff, Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { assistantAction } from '@/lib/actions';
import { useAppContext } from '@/contexts/app-context';
import { cn } from '@/lib/utils';
import type { VoiceAction } from '@/ai/flows/assistant-flow';

type VoiceAssistantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ViewState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export function VoiceAssistantDialog({ open, onOpenChange }: VoiceAssistantDialogProps) {
  const { addTransaction, addBudget, showNotification } = useAppContext();

  const [view, setView] = useState<ViewState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [finalAction, setFinalAction] = useState<VoiceAction | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showNotification({
            type: 'error',
            title: 'Microphone Access Denied',
            description: "Please allow microphone access in your browser's site settings to use this feature.",
          });
        }
        setView('idle');
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (transcript.trim()) {
            handleProcessCommand(transcript);
        } else {
            setView('idle');
        }
      };
    }
  }, [transcript, showNotification]);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setView('idle');
      setTranscript('');
      setFinalAction(null);
    }
  }, [open]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
      showNotification({ type: 'error', title: 'Not Supported', description: "Speech recognition is not supported in your browser." });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setFinalAction(null);
      recognitionRef.current.start();
      setIsRecording(true);
      setView('recording');
    }
  };
  
  const handleProcessCommand = async (command: string) => {
    if (!command) return;
    setView('processing');
    const result = await assistantAction({ command });
    setFinalAction(result);

    try {
        switch (result.action) {
            case 'logTransaction':
                await addTransaction({ ...result.params, date: new Date().toISOString() });
                setView('success');
                break;
            case 'createBudget':
                await addBudget(result.params);
                setView('success');
                break;
            case 'unknown':
                // This is not an exception, but a handled failure state.
                setView('error');
                break;
        }
    } catch(e: any) {
        // This catches actual exceptions from addTransaction/addBudget
        console.error("Error executing action: ", e);
        setView('error');
    }
  }
  
  const getFeedbackMessage = () => {
      if (!finalAction) return '';
      switch (finalAction.action) {
          case 'logTransaction':
              return `Logged a ${finalAction.params.type} of $${finalAction.params.amount} for "${finalAction.params.source}".`;
          case 'createBudget':
              return `Created a new budget of $${finalAction.params.limit} for "${finalAction.params.category}".`;
          case 'unknown':
              return `Sorry, I couldn't understand that. ${finalAction.reason}`;
          default:
              return "An unexpected error occurred.";
      }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary" />
            Voice Assistant
          </DialogTitle>
          <DialogDescription>
            Tell me what you'd like to do. Try "Add a $5 coffee at Starbucks" or "Set a $500 budget for groceries".
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-4 min-h-[150px]">
            {view === 'idle' && (
                <p className="text-muted-foreground">Press the button to start speaking.</p>
            )}
            {view === 'recording' && (
                <p className="text-primary font-medium">Listening...</p>
            )}
            {view === 'processing' && (
                <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin" /> Processing...</p>
            )}
            {(view === 'success' || view === 'error') && (
                <div className="text-center">
                    {view === 'success' ? (
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    ) : (
                        <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    )}
                    <p className="font-medium">{getFeedbackMessage()}</p>
                </div>
            )}
            
            <p className="text-lg text-center h-12">{transcript}</p>
        </div>

        <div className="flex justify-center pt-4">
            <Button 
                onClick={handleToggleRecording} 
                size="icon"
                className={cn(
                    "h-16 w-16 rounded-full",
                    isRecording && "bg-destructive hover:bg-destructive/90 animate-pulse"
                )}
                disabled={view === 'processing'}
            >
                {isRecording ? <MicOff /> : <Mic />}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
