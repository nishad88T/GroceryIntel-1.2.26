import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X, ChevronDown } from "lucide-react";

export default function MultiTagFilter({ allTags, selectedTags, onTagsChange }) {
    const [isOpen, setIsOpen] = useState(false);

    // Sort tags alphabetically and normalize casing
    const sortedTags = [...new Set(allTags.map(t => t.toLowerCase()))]
        .sort((a, b) => a.localeCompare(b))
        .map(t => t.charAt(0).toUpperCase() + t.slice(1));

    const toggleTag = (tag) => {
        const normalizedTag = tag.toLowerCase();
        if (selectedTags.includes(normalizedTag)) {
            onTagsChange(selectedTags.filter(t => t !== normalizedTag));
        } else {
            onTagsChange([...selectedTags, normalizedTag]);
        }
    };

    const clearTags = () => {
        onTagsChange([]);
    };

    return (
        <div className="relative">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Tags
                        {selectedTags.length > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {selectedTags.length}
                            </Badge>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Filter by Tags</span>
                        {selectedTags.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearTags}
                                className="h-6 px-2 text-xs"
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {sortedTags.map((tag) => (
                            <label
                                key={tag}
                                className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                            >
                                <Checkbox
                                    checked={selectedTags.includes(tag.toLowerCase())}
                                    onCheckedChange={() => toggleTag(tag)}
                                />
                                <span className="text-sm text-slate-700">{tag}</span>
                            </label>
                        ))}
                        {sortedTags.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">No tags available</p>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Selected tags display */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1 cursor-pointer"
                            onClick={() => toggleTag(tag)}
                        >
                            {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            <X className="w-3 h-3" />
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}