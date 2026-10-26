
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

type OverlayProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
  zIndex?: number;
};

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  OverlayProps
>(({ className, zIndex = 10050, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 bg-black/55", className)}
    style={{ zIndex }}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  overlayClassName?: string;
  hideCloseButton?: boolean;
  accessibleTitle?: string;
  /** Overlay z-index. Content uses zIndex + 1. Raise for stacked dialogs. */
  zIndex?: number;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({
  className,
  children,
  overlayClassName,
  hideCloseButton,
  accessibleTitle = "Dialog",
  zIndex = 10050,
  ...props
}, ref) => (
  <DialogPortal>
    <div className="ams-pos-portal ams-tw" style={{ position: "relative", zIndex }}>
      <DialogOverlay className={overlayClassName} zIndex={zIndex} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl",
          className
        )}
        style={{ zIndex: zIndex + 1 }}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{accessibleTitle}</DialogPrimitive.Title>
        {children}
        {!hideCloseButton && (
          <DialogClose className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-900">
            <X className="h-4 w-4" />
          </DialogClose>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2", className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle };
