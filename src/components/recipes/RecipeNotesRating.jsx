import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Star, Save, Edit2, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function RecipeNotesRating({ recipe, currentUser }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [userNote, setUserNote] = useState(null);
    
    // Form state
    const [noteText, setNoteText] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [triedDate, setTriedDate] = useState("");
    const [modifications, setModifications] = useState("");

    useEffect(() => {
        if (recipe && currentUser) {
            loadNotes();
        }
    }, [recipe?.id, currentUser?.email]);

    const loadNotes = async () => {
        try {
            setLoading(true);
            const notesData = await appClient.entities.RecipeNote.filter({
                recipe_id: recipe.id,
                household_id: currentUser.household_id
            });
            setNotes(notesData || []);
            
            // Find user's own note
            const myNote = notesData?.find(n => n.user_email === currentUser.email);
            if (myNote) {
                setUserNote(myNote);
                setNoteText(myNote.note_text || "");
                setRating(myNote.rating || 0);
                setTriedDate(myNote.tried_date || "");
                setModifications(myNote.modifications || "");
            }
        } catch (err) {
            console.error("Failed to load notes:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!currentUser?.household_id) return;
        
        setSaving(true);
        try {
            const noteData = {
                recipe_id: recipe.id,
                user_email: currentUser.email,
                household_id: currentUser.household_id,
                note_text: noteText,
                rating: rating || null,
                tried_date: triedDate || null,
                modifications: modifications || null
            };

            if (userNote) {
                await appClient.entities.RecipeNote.update(userNote.id, noteData);
                toast.success("Note updated!");
            } else {
                await appClient.entities.RecipeNote.create(noteData);
                toast.success("Note saved!");
            }
            
            setEditing(false);
            loadNotes();
        } catch (err) {
            console.error("Failed to save note:", err);
            toast.error("Failed to save note");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!userNote || !confirm("Delete your note?")) return;
        
        try {
            await appClient.entities.RecipeNote.delete(userNote.id);
            setUserNote(null);
            setNoteText("");
            setRating(0);
            setTriedDate("");
            setModifications("");
            setEditing(false);
            toast.success("Note deleted");
            loadNotes();
        } catch (err) {
            console.error("Failed to delete note:", err);
            toast.error("Failed to delete note");
        }
    };

    const averageRating = notes.length > 0 
        ? (notes.filter(n => n.rating).reduce((sum, n) => sum + n.rating, 0) / notes.filter(n => n.rating).length).toFixed(1)
        : null;

    const StarRating = ({ value, onChange, readonly = false }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => !readonly && onChange(star === value ? 0 : star)}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    className="focus:outline-none"
                >
                    <Star
                        className={`w-5 h-5 transition-colors ${
                            star <= (readonly ? value : (hoverRating || value))
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-300'
                        }`}
                    />
                </button>
            ))}
        </div>
    );

    if (loading) {
        return (
            <Card className="border-slate-200">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Notes & Rating</CardTitle>
                    {averageRating && (
                        <div className="flex items-center gap-2">
                            <StarRating value={parseFloat(averageRating)} readonly />
                            <span className="text-sm text-slate-600">({notes.filter(n => n.rating).length})</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* User's Note Form */}
                {(editing || !userNote) ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-4 border-t pt-4"
                    >
                        <div>
                            <Label className="mb-2">Your Rating</Label>
                            <StarRating value={rating} onChange={setRating} />
                        </div>

                        <div>
                            <Label htmlFor="tried-date" className="mb-2">Date Tried (Optional)</Label>
                            <Input
                                id="tried-date"
                                type="date"
                                value={triedDate}
                                onChange={(e) => setTriedDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="note-text" className="mb-2">Your Notes</Label>
                            <Textarea
                                id="note-text"
                                placeholder="How was it? Any thoughts?"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="modifications" className="mb-2">Modifications (Optional)</Label>
                            <Textarea
                                id="modifications"
                                placeholder="Any changes you made?"
                                value={modifications}
                                onChange={(e) => setModifications(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSaveNote}
                                disabled={saving || (!noteText && !rating)}
                                className="flex-1"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Note
                            </Button>
                            {userNote && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditing(false);
                                            setNoteText(userNote.note_text || "");
                                            setRating(userNote.rating || 0);
                                            setTriedDate(userNote.tried_date || "");
                                            setModifications(userNote.modifications || "");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteNote}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-t pt-4"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-slate-900">Your Review</span>
                                    {userNote.rating && <StarRating value={userNote.rating} readonly />}
                                </div>
                                {userNote.tried_date && (
                                    <p className="text-xs text-slate-500">
                                        Tried on {new Date(userNote.tried_date).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditing(true)}
                            >
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        {userNote.note_text && (
                            <p className="text-slate-700 mb-2">{userNote.note_text}</p>
                        )}
                        
                        {userNote.modifications && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs font-medium text-blue-900 mb-1">Modifications:</p>
                                <p className="text-sm text-blue-800">{userNote.modifications}</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Household Members' Notes */}
                {notes.filter(n => n.user_email !== currentUser?.email).length > 0 && (
                    <div className="border-t pt-4 space-y-3">
                        <h4 className="font-medium text-slate-900 text-sm">Household Reviews</h4>
                        <AnimatePresence>
                            {notes.filter(n => n.user_email !== currentUser?.email).map((note) => (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 bg-slate-50 rounded-lg"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-900">
                                            {note.user_email.split('@')[0]}
                                        </span>
                                        {note.rating && <StarRating value={note.rating} readonly />}
                                    </div>
                                    {note.note_text && (
                                        <p className="text-sm text-slate-700">{note.note_text}</p>
                                    )}
                                    {note.tried_date && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Tried on {new Date(note.tried_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}