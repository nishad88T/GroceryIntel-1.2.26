import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Trash2 } from "lucide-react";

const ISSUE_OPTIONS = [
    { id: "gibberish_text", label: "Gibberish / Wrong text" },
    { id: "missed_items", label: "Missed most items" },
    { id: "wrong_prices", label: "Prices were all wrong" },
    { id: "missed_discounts", label: "Missed discounts" },
    { id: "wrong_store", label: "Wrong store or date" },
    { id: "other", label: "Other" }
];

export default function FailureFeedbackModal({ isOpen, onClose, onSubmit, onDiscard }) {
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleIssueToggle = (issueId) => {
        setSelectedIssues(prev =>
            prev.includes(issueId)
                ? prev.filter(id => id !== issueId)
                : [...prev, issueId]
        );
    };

    const handleSubmit = async () => {
        if (selectedIssues.length === 0 && !comment) {
            onDiscard();
            return;
        }
        setSubmitting(true);
        await onSubmit({ issues: selectedIssues, comment });
        setSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report a Problem</DialogTitle>
                    <DialogDescription>
                        Sorry this scan didn't work. Help us improve by telling us what went wrong before you discard it.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <p className="text-sm font-medium">What was the main issue?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {ISSUE_OPTIONS.map((option) => (
                                <label key={option.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                    <Checkbox
                                        checked={selectedIssues.includes(option.id)}
                                        onCheckedChange={() => handleIssueToggle(option.id)}
                                    />
                                    <span className="text-sm">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Textarea
                            placeholder="Optional: Add more details, e.g., 'I tried scanning 5 times and it failed each time.'"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onDiscard} className="flex-1">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Just Discard
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        {submitting ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Submit & Discard</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}