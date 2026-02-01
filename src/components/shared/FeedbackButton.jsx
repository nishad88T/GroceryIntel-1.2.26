import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SendEmail } from "@/integrations/Core";

export default function FeedbackButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({
        type: '',
        subject: '',
        message: '',
        email: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!feedback.email.trim()) {
            toast.error("Please enter your email address");
            return;
        }
        
        if (!feedback.subject.trim()) {
            toast.error("Please enter a subject");
            return;
        }
        
        if (!feedback.message.trim()) {
            toast.error("Please enter your feedback message");
            return;
        }

        setLoading(true);
        try {
            const emailSubject = feedback.subject || `GroceryIntel Feedback: ${feedback.type}`;
            const emailBody = `
Feedback Type: ${feedback.type}
From: ${feedback.email}

Message:
${feedback.message}

---
Sent from GroceryIntel feedback form
            `.trim();

            await SendEmail({
                to: 'hello@grocerytrack.co.uk',
                subject: emailSubject,
                body: emailBody
            });

            toast.success("Thank you for your feedback! We'll get back to you soon.");
            setFeedback({ type: '', subject: '', message: '', email: '' });
            setOpen(false);
        } catch (error) {
            console.error('Failed to send feedback:', error);
            toast.error("Failed to send feedback. Please try emailing us directly at support@groceryintel.com");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    size="sm"
                    className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 shadow-lg bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700 hover:text-emerald-800"
                >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Feedback
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                        Send Feedback
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="feedback-type">Feedback Type</Label>
                        <Select 
                            value={feedback.type} 
                            onValueChange={(value) => setFeedback(prev => ({ ...prev, type: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="What's this about?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="improvement">Improvement Suggestion</SelectItem>
                                <SelectItem value="ocr">Receipt Scanning Issue</SelectItem>
                                <SelectItem value="general">General Feedback</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                        <Label htmlFor="feedback-email">Your Email</Label>
                        <Input
                            id="feedback-email"
                            type="email"
                            placeholder="your@email.com"
                            value={feedback.email}
                            onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                            required
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="feedback-subject">Subject</Label>
                        <Input
                            id="feedback-subject"
                            placeholder="Brief summary..."
                            value={feedback.subject}
                            onChange={(e) => setFeedback(prev => ({ ...prev, subject: e.target.value }))}
                            required
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="feedback-message">Your Feedback *</Label>
                        <Textarea
                            id="feedback-message"
                            placeholder="Tell us what you think, what could be improved, or report any issues..."
                            value={feedback.message}
                            onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                            className="h-24"
                            required
                        />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Feedback
                                </>
                            )}
                        </Button>
                    </div>
                </form>
                
                <div className="text-center pt-2 border-t">
                    <p className="text-xs text-slate-500">
                        Or email us directly at{' '}
                        <a 
                            href="mailto:support@groceryintel.com" 
                            className="text-emerald-600 hover:underline"
                        >
                            support@groceryintel.com
                        </a>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}