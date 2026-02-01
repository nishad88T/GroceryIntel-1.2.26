import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderPlus, Folder, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";

export default function RecipeFolderManager({ 
    folders, 
    selectedFolder, 
    onFolderSelect, 
    onFoldersChange,
    householdId 
}) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [folderName, setFolderName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateFolder = async () => {
        if (!folderName.trim() || !householdId) return;
        setLoading(true);
        try {
            await base44.entities.RecipeFolder.create({
                name: folderName.trim(),
                household_id: householdId,
                sort_order: folders.length
            });
            setFolderName("");
            setShowCreateDialog(false);
            onFoldersChange();
        } catch (err) {
            console.error("Failed to create folder:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditFolder = async () => {
        if (!folderName.trim() || !editingFolder) return;
        setLoading(true);
        try {
            await base44.entities.RecipeFolder.update(editingFolder.id, {
                name: folderName.trim()
            });
            setFolderName("");
            setEditingFolder(null);
            setShowEditDialog(false);
            onFoldersChange();
        } catch (err) {
            console.error("Failed to update folder:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFolder = async (folder) => {
        if (!confirm(`Delete folder "${folder.name}"? Recipes in this folder will be moved to "Uncategorized".`)) return;
        try {
            await base44.entities.RecipeFolder.delete(folder.id);
            if (selectedFolder === folder.id) {
                onFolderSelect("all");
            }
            onFoldersChange();
        } catch (err) {
            console.error("Failed to delete folder:", err);
        }
    };

    const openEditDialog = (folder) => {
        setEditingFolder(folder);
        setFolderName(folder.name);
        setShowEditDialog(true);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Folders</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                    className="h-7 px-2"
                >
                    <FolderPlus className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                <Badge
                    variant={selectedFolder === "all" ? "default" : "outline"}
                    className="cursor-pointer hover:bg-emerald-100"
                    onClick={() => onFolderSelect("all")}
                >
                    All Recipes
                </Badge>
                <Badge
                    variant={selectedFolder === "uncategorized" ? "default" : "outline"}
                    className="cursor-pointer hover:bg-emerald-100"
                    onClick={() => onFolderSelect("uncategorized")}
                >
                    Uncategorized
                </Badge>
                {folders.map((folder) => (
                    <div key={folder.id} className="flex items-center gap-1">
                        <Badge
                            variant={selectedFolder === folder.id ? "default" : "outline"}
                            className="cursor-pointer hover:bg-emerald-100 flex items-center gap-1"
                            onClick={() => onFolderSelect(folder.id)}
                        >
                            <Folder className="w-3 h-3" />
                            {folder.name}
                        </Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="w-3 h-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => handleDeleteFolder(folder)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>

            {/* Create Folder Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="Folder name"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFolder} disabled={loading || !folderName.trim()}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Folder Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Folder</DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="Folder name"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEditFolder()}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditFolder} disabled={loading || !folderName.trim()}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}