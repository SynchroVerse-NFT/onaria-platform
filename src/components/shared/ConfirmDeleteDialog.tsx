import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  isLoading?: boolean;
  appTitle?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete App",
  description,
  isLoading = false,
  appTitle
}: ConfirmDeleteDialogProps) {
  const defaultDescription = appTitle
    ? `Are you sure you want to delete "${appTitle}"? This action cannot be undone and all associated data will be permanently removed.`
    : 'Are you sure you want to delete this app? This action cannot be undone and all associated data will be permanently removed.';

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px] bg-[#0f0f1a]/95 backdrop-blur-xl border-white/10 text-white">
        {/* Cosmic background glow */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 blur-xl -z-10"
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/30"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.3)',
                  '0 0 30px rgba(239, 68, 68, 0.5)',
                  '0 0 20px rgba(239, 68, 68, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </motion.div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left text-white">{title}</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left pt-2 text-white/60">
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
          >
            Cancel
          </AlertDialogCancel>
          <motion.button
            onClick={handleConfirm}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-9 px-4 bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {/* Shimmer effect */}
            {!isLoading && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete App
                </>
              )}
            </span>
          </motion.button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}