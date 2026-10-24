import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmRecord({ open, onOpenChange, title, description, pending, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  pending: boolean; onConfirm: () => void;
}) {
  return <AlertDialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
    <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-lg">
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter className="gap-2">
        <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Go back</Button>
        <Button disabled={pending} onClick={onConfirm}>{pending ? "Saving…" : "Confirm and save"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}