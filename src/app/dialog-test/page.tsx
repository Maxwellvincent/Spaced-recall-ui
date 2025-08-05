import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function DialogTestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a minimal always-open dialog for debugging.</DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center">If you see this, Dialog is working at a basic level.</div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 