import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const AlertDialogContext = React.createContext(null);

export const AlertDialog = ({ children, open, onOpenChange }) => {
  return (
    <AlertDialogContext.Provider value={{ onOpenChange }}>
      {React.Children.map(children, child => {
        if (child?.type === AlertDialogTrigger) {
          return React.cloneElement(child, { onOpenChange });
        }
        return null;
      })}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80"
              onClick={() => onOpenChange(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {React.Children.map(children, child => {
                  if (child?.type === AlertDialogContent) {
                    return child;
                  }
                  return null;
                })}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </AlertDialogContext.Provider>
  );
};

export const AlertDialogTrigger = ({ children, asChild, onOpenChange }) => {
  if (asChild) {
    return React.cloneElement(children, {
      onClick: () => onOpenChange(true)
    });
  }
  return <button onClick={() => onOpenChange(true)}>{children}</button>;
};

export const AlertDialogContent = ({ children, className = '' }) => {
  return (
    <Card className={`bg-white p-6 shadow-lg ${className}`}>
      {children}
    </Card>
  );
};

export const AlertDialogHeader = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-col space-y-2 text-center sm:text-left mb-4 ${className}`}>
      {children}
    </div>
  );
};

export const AlertDialogFooter = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 ${className}`}>
      {children}
    </div>
  );
};

export const AlertDialogTitle = ({ children, className = '' }) => {
  return (
    <h2 className={`text-lg font-semibold ${className}`}>
      {children}
    </h2>
  );
};

export const AlertDialogDescription = ({ children, className = '' }) => {
  return (
    <div className={`text-sm text-slate-500 ${className}`}>
      {children}
    </div>
  );
};

export const AlertDialogAction = ({ children, onClick, className = '', disabled = false }) => {
  return (
    <Button
      onClick={onClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};

export const AlertDialogCancel = ({ children, onClick, className = '', disabled = false }) => {
  const context = React.useContext(AlertDialogContext);
  
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
    if (context?.onOpenChange) {
      context.onOpenChange(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={`mt-2 sm:mt-0 ${className}`}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};

export const AlertDialogPortal = ({ children }) => children;
export const AlertDialogOverlay = ({ children }) => children;