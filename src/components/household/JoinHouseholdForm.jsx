import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { appClient } from '@/api/appClient';

const JoinHouseholdForm = ({ onSuccess }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!code || code.length !== 6) {
            setError('Please enter a valid 6-character code');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await appClient.functions.invoke('joinHouseholdByCode', {
                invite_code: code.toUpperCase()
            });

            if (response.data.success) {
                setSuccess(response.data.message);
                setCode('');
                
                // Force a full page reload to ensure all data including user's household_id is refreshed
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error('Failed to join household:', error);
            setError(error.response?.data?.error || 'Failed to join household. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    Join a Household
                </CardTitle>
                <CardDescription>
                    Enter the invitation code you received to join a household
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            type="text"
                            placeholder="Enter 6-character code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            disabled={loading}
                            className="text-lg tracking-wider text-center font-mono"
                        />
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={loading || code.length !== 6}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Join Household
                            </>
                        )}
                    </Button>
                </form>

                {error && (
                    <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800 text-sm">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 text-sm">
                            <strong>{success}</strong> Reloading page...
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default JoinHouseholdForm;