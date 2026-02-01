import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, FolderInput, X, Loader2 } from "lucide-react";

export default function RecipeBulkActions({
    selectedRecipes,
    folders,
    onClearSelection,
    onActionComplete,
    isAdmin
}) {
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [moveToFolder, setMoveToFolder] = useState("");

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            for (const recipe of selectedRecipes) {
                // Check if user can delete (admin can delete any, users only their own)
                if (isAdmin || recipe.type === 'user_parsed') {
                    await base44.entities.Recipe.delete(recipe.id);
                }
            }
            onActionComplete();
        } catch (err) {
            console.error("Failed to delete recipes:", err);
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleBulkMove = async () => {
        if (!moveToFolder) return;
        setLoading(true);
        try {
            const folderId = moveToFolder === "uncategorized" ? null : moveToFolder;
            for (const recipe of selectedRecipes) {
                if (isAdmin || recipe.type === 'user_parsed') {
                    await base44.entities.Recipe.update(recipe.id, { folder_id: folderId });
                }
            }
            setMoveToFolder("");
            onActionComplete();
        } catch (err) {
            console.error("Failed to move recipes:", err);
        } finally {
            setLoading(false);
        }
    };

    const deletableCount = selectedRecipes.filter(r => isAdmin || r.type === 'user_parsed').length;

    return (
        <div className="p-2 md:p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex flex-wrap items-center gap-2">
                {/* Selection count */}
                <span className="text-xs md:text-sm font-medium text-emerald-800 whitespace-nowrap">
                    {selectedRecipes.length} selected
                </span>

                {/* Move to Folder */}
                <Select value={moveToFolder} onValueChange={setMoveToFolder}>
                    <SelectTrigger className="w-28 md:w-36 h-8 text-xs md:text-sm">
                        <FolderInput className="w-3 h-3 md:w-4 md:h-4 mr-1 shrink-0" />
                        <SelectValue placeholder="Move..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                        {folders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                                {folder.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {moveToFolder && (
                    <Button
                        size="sm"
                        onClick={handleBulkMove}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2 md:px-3 text-xs md:text-sm"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Move"}
                    </Button>
                )}

                {/* Delete */}
                {deletableCount > 0 && (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={loading}
                        className="h-8 px-2 md:px-3 text-xs md:text-sm"
                    >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        <span className="hidden sm:inline">Delete </span>({deletableCount})
                    </Button>
                )}

                {/* Clear Selection */}
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClearSelection();
                    }}
                    className="h-8 px-2 ml-auto"
                    type="button"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deletableCount} recipe(s)?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The selected recipes will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}