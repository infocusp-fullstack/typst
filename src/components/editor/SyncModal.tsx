"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SyncModalProps {
  open: boolean;
  onClose: () => void;
  onOverride: () => void;
  onTakeLatest: () => void;
  isLoading?: boolean;
}

export function SyncModal({
  open,
  onClose,
  onOverride,
  onTakeLatest,
  isLoading = false,
}: SyncModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOverride = async () => {
    setIsProcessing(true);
    try {
      await onOverride();
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleTakeLatest = async () => {
    setIsProcessing(true);
    try {
      await onTakeLatest();
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Changes Available</DialogTitle>
          <DialogDescription>
            The document was updated elsewhere. Do you want to replace it with
            your edits or update to the latest content?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing || isLoading}
          >
            Cancel
          </Button>
          <div className="flex w-full gap-2">
            <Button
              variant="destructive"
              onClick={handleOverride}
              disabled={isProcessing || isLoading}
              className="flex-1"
            >
              {isProcessing ? "Saving..." : "Save My Changes"}
            </Button>
            <Button
              onClick={handleTakeLatest}
              disabled={isProcessing || isLoading}
              className="flex-1"
            >
              {isProcessing ? "Loading..." : "Take Latest"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
