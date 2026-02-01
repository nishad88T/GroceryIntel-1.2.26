import * as React from "react"

const Collapsible = ({ children, open, onOpenChange, ...props }) => {
    return (
        <div {...props}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { open, onOpenChange });
                }
                return child;
            })}
        </div>
    );
};

const CollapsibleTrigger = React.forwardRef(({ children, open, onOpenChange, asChild, ...props }, ref) => {
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onOpenChange) {
            onOpenChange(!open);
        }
    };

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            ref,
            onClick: handleClick
        });
    }

    return (
        <button ref={ref} type="button" onClick={handleClick} {...props}>
            {children}
        </button>
    );
});

CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = ({ children, open, ...props }) => {
    const [height, setHeight] = React.useState(open ? 'auto' : 0);
    const contentRef = React.useRef(null);

    React.useEffect(() => {
        if (open) {
            const contentHeight = contentRef.current?.scrollHeight || 0;
            setHeight(contentHeight);
            const timer = setTimeout(() => {
                setHeight('auto');
            }, 300);
            return () => clearTimeout(timer);
        } else {
            const contentHeight = contentRef.current?.scrollHeight || 0;
            setHeight(contentHeight);
            requestAnimationFrame(() => {
                setHeight(0);
            });
        }
    }, [open]);

    return (
        <div
            ref={contentRef}
            style={{
                height: height === 'auto' ? 'auto' : `${height}px`,
                overflow: 'hidden',
                transition: 'height 300ms ease-in-out'
            }}
            {...props}
        >
            {children}
        </div>
    );
};

CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent }