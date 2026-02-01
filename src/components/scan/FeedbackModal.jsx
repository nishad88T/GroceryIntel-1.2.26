import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { OCRFeedback } from '@/entities/all';
import { Star, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

const ISSUE_OPTIONS = [
    { id: 'missed_items', label: 'Items were missed/not detected' },
    { id: 'wrong_prices', label: 'Prices were incorrect' },
    { id: 'wrong_quantities', label: 'Quantities were wrong' },
    { id: 'missed_discounts', label: 'Discounts/offers were missed' },
    { id: 'gibberish_text', label: 'Extracted gibberish/unreadable text' },
    { id: 'wrong_store', label: 'Wrong store name detected' },
    { id: 'wrong_date', label: 'Wrong purchase date' },
    { id: 'other', label: 'Other issues' }
];

export default function FeedbackModal({ receiptId, totalItems, onClose, onSubmit }) {
    const [rating, setRating] = useState(0);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [feedbackText, setFeedbackText] = useState('');
    const [scanWasPerfect, setScanWasPerfect] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0 && !scanWasPerfect) {
            alert('Please provide a rating or mark the scan as perfect.');
            return;
        }

        setSubmitting(true);
        try {
            await OCRFeedback.create({
                receipt_id: receiptId,
                rating: rating,
                issues: scanWasPerfect ? [] : selectedIssues,
                feedback_text: feedbackText,
                total_items: totalItems,
                scan_was_perfect: scanWasPerfect
            });
            
            onSubmit();
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        }
        setSubmitting(false);
    };

    const toggleIssue = (issueId) => {
        if (scanWasPerfect) return;
        
        setSelectedIssues(prev => 
            prev.includes(issueId) 
                ? prev.filter(id => id !== issueId)
                : [...prev, issueId]
        );
    };

    const handlePerfectToggle = (checked) => {
        setScanWasPerfect(checked);
        if (checked) {
            setSelectedIssues([]);
            setRating(5);
            setFeedbackText('');
        } else {
            setRating(0);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-4 md:p-6 pb-3 md:pb-4 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        How was the receipt scan?
                    </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-1 overflow-y-auto px-4 md:px-6">
                    <div className="py-4 space-y-6">
                        {/* Perfect Scan Toggle */}
                        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <Checkbox 
                                id="perfect-scan"
                                checked={scanWasPerfect}
                                onCheckedChange={handlePerfectToggle}
                            />
                            <label htmlFor="perfect-scan" className="flex items-center gap-2 text-green-800 font-medium cursor-pointer">
                                <CheckCircle className="w-4 h-4" />
                                The scan was perfect - no corrections needed!
                            </label>
                        </div>

                        {!scanWasPerfect && (
                            <>
                                {/* Rating */}
                                <div>
                                    <Label className="text-sm font-medium">Overall scan accuracy</Label>
                                    <div className="flex gap-1 mt-2">
                                        {[1,2,3,4,5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => setRating(star)}
                                                className={`p-1 ${rating >= star ? 'text-yellow-400' : 'text-slate-300'}`}
                                            >
                                                <Star className="w-6 h-6 fill-current" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Issues */}
                                <div>
                                    <Label className="text-sm font-medium">What were the issues? (optional)</Label>
                                    <div className="space-y-2 mt-2">
                                        {ISSUE_OPTIONS.map(issue => (
                                            <div key={issue.id} className="flex items-center">
                                                <Checkbox
                                                    id={issue.id}
                                                    checked={selectedIssues.includes(issue.id)}
                                                    onCheckedChange={() => toggleIssue(issue.id)}
                                                />
                                                <label htmlFor={issue.id} className="ml-2 text-sm text-slate-700 cursor-pointer">
                                                    {issue.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Additional Comments */}
                        <div>
                            <Label htmlFor="feedback-text" className="text-sm font-medium">Additional comments (optional)</Label>
                            <Textarea
                                id="feedback-text"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Any other feedback to help us improve?"
                                className="mt-2 h-20"
                                disabled={scanWasPerfect}
                            />
                        </div>
                    </div>
                </ScrollArea>
                
                <DialogFooter className="flex justify-end gap-2 p-4 md:p-6 pt-3 md:pt-4 border-t flex-shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Skip
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || (!scanWasPerfect && rating === 0)}>
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Feedback'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}