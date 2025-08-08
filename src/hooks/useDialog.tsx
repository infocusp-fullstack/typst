"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type PromptOptions = {
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  validate?: (value: string) => string | undefined;
};

interface DialogContextValue {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
  prompt: (options?: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    options: ConfirmOptions;
  }>({ open: false, options: {} });
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  const [promptState, setPromptState] = useState<{
    open: boolean;
    options: PromptOptions;
    value: string;
    error?: string;
  }>({ open: false, options: {}, value: "" });
  const promptResolverRef = useRef<((value: string | null) => void) | null>(
    null,
  );

  const closeAll = () => {
    setConfirmState({ open: false, options: {} });
    setPromptState((prev) => ({ ...prev, open: false }));
  };

  const confirm = useCallback((options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ open: true, options: options || {} });
    });
  }, []);

  const prompt = useCallback((options?: PromptOptions) => {
    const defaultValue = options?.defaultValue ?? "";
    return new Promise<string | null>((resolve) => {
      promptResolverRef.current = resolve;
      setPromptState({
        open: true,
        options: options || {},
        value: defaultValue,
      });
    });
  }, []);

  const onConfirmCancel = () => {
    confirmResolverRef.current?.(false);
    closeAll();
  };
  const onConfirmOk = () => {
    confirmResolverRef.current?.(true);
    closeAll();
  };

  const onPromptCancel = () => {
    promptResolverRef.current?.(null);
    closeAll();
  };
  const onPromptOk = () => {
    const val = promptState.value;
    if (promptState.options.validate) {
      const err = promptState.options.validate(val);
      if (err) {
        setPromptState((prev) => ({ ...prev, error: err }));
        return;
      }
    } else if (promptState.options.required !== false && val.trim() === "") {
      setPromptState((prev) => ({ ...prev, error: "This field is required" }));
      return;
    }
    promptResolverRef.current?.(val);
    closeAll();
  };

  const value = useMemo<DialogContextValue>(
    () => ({ confirm, prompt }),
    [confirm, prompt],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmState.open}
        onOpenChange={(open) => !open && onConfirmCancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmState.options.title ?? "Are you sure?"}
            </DialogTitle>
            {confirmState.options.description && (
              <DialogDescription>
                {confirmState.options.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onConfirmCancel}>
              {confirmState.options.cancelText ?? "Cancel"}
            </Button>
            <Button
              onClick={onConfirmOk}
              variant={
                confirmState.options.destructive ? "destructive" : "default"
              }
            >
              {confirmState.options.confirmText ?? "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt Dialog */}
      <Dialog
        open={promptState.open}
        onOpenChange={(open) => !open && onPromptCancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {promptState.options.title ?? "Input required"}
            </DialogTitle>
            {promptState.options.description && (
              <DialogDescription>
                {promptState.options.description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-2">
            {promptState.options.label && (
              <Label htmlFor="dialog-prompt-input">
                {promptState.options.label}
              </Label>
            )}
            <Input
              id="dialog-prompt-input"
              placeholder={promptState.options.placeholder}
              value={promptState.value}
              autoFocus
              onChange={(e) =>
                setPromptState((prev) => ({
                  ...prev,
                  value: e.target.value,
                  error: undefined,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") onPromptOk();
                if (e.key === "Escape") onPromptCancel();
              }}
            />
            {promptState.error && (
              <p className="text-sm text-destructive">{promptState.error}</p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onPromptCancel}>
              {promptState.options.cancelText ?? "Cancel"}
            </Button>
            <Button onClick={onPromptOk}>
              {promptState.options.confirmText ?? "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}
