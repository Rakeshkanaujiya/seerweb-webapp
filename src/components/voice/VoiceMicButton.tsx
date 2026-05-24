import { useState } from "react";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VoiceState } from "@/hooks/useVoiceOrder";

interface VoiceMicButtonProps {
  voiceState: VoiceState;
  onStart: () => void;
  onStop: () => void;
  size?: "sm" | "lg";
  micVolume?: number;
}

const VoiceMicButton = ({ voiceState, onStart, onStop }: VoiceMicButtonProps) => {
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";

  return (
    <Button
      onClick={isListening ? onStop : onStart}
      disabled={isProcessing}
      variant="outline"
      className={cn(
        "relative h-10 w-10 rounded-full p-0 transition-all duration-300",
        isListening && "bg-destructive text-destructive-foreground border-destructive animate-pulse shadow-[0_0_15px_hsl(var(--destructive)/0.4)]",
        isProcessing && "bg-muted cursor-wait",
        !isListening && !isProcessing && "hover:bg-primary hover:text-primary-foreground hover:border-primary"
      )}
      title={isListening ? "Stop listening" : isProcessing ? "Processing..." : "Voice order"}
    >
      {isProcessing ? (
        <Loader2 size={18} className="animate-spin" />
      ) : isListening ? (
        <MicOff size={18} />
      ) : (
        <Mic size={18} />
      )}
      
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full animate-ping bg-destructive/30" />
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-destructive whitespace-nowrap">
            Listening…
          </span>
        </>
      )}
      {isProcessing && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
          Processing…
        </span>
      )}
    </Button>
  );
};

export default VoiceMicButton;
