import * as React from 'react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  name?: string;
}

const Select = ({ value = '', onValueChange = () => {}, children, name }: SelectProps) => {
  const [internalValue, setInternalValue] = React.useState(value);
  const [isOpen, setIsOpen] = React.useState(false);
  
  const currentValue = value || internalValue;
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange(newValue);
    setIsOpen(false); // Close dropdown when value is selected
  };

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {name && <input type="hidden" name={name} value={currentValue} />}
        {children}
      </div>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectTrigger must be used within Select');
    
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => context.setIsOpen(!context.isOpen)}
        {...props}
      >
        {children}
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={cn('transition-transform', context.isOpen && 'rotate-180')}
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectValue must be used within Select');

    return (
      <span
        ref={ref}
        className={cn('block truncate', className)}
        {...props}
      >
        {context.value || 'Select an option'}
      </span>
    );
  }
);
SelectValue.displayName = 'SelectValue';

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectContent must be used within Select');

    // Don't render if not open
    if (!context.isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => context.setIsOpen(false)}
        />
        
        {/* Dropdown */}
        <div
          ref={ref}
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-white shadow-lg max-h-60 overflow-auto',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
SelectContent.displayName = 'SelectContent';

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectItem must be used within Select');

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        onClick={() => context.onValueChange(value)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
};