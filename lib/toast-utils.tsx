import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function toastWithUndo(
  message: string,
  undoAction: () => void,
  duration?: number
) {
  toast(message, {
    description: "This action can be undone.",
    duration: duration ?? 5000,
    action: (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          undoAction();
          toast.dismiss();
        }}
      >
        Undo
      </Button>
    ),
  });
}

export function toastSuccessUndo(
  message: string,
  undoAction: () => void
) {
  toast.success(message, {
    action: (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          undoAction();
          toast.dismiss();
        }}
      >
        Undo
      </Button>
    ),
  });
}

export function toastWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
  });
}
