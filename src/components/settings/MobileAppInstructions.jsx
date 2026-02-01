import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Share, MoreVertical, PlusSquare, Check } from 'lucide-react';

const iosSteps = [
  { icon: Share, text: "Tap the 'Share' icon in the browser's toolbar." },
  { icon: PlusSquare, text: "Scroll down and tap 'Add to Home Screen'." },
  { icon: Check, text: "Confirm by tapping 'Add'." }
];

const androidSteps = [
  { icon: MoreVertical, text: "Tap the 'three-dot' menu icon in the browser." },
  { icon: PlusSquare, text: "Tap 'Install app' or 'Add to Home Screen'." },
  { icon: Check, text: "Follow the on-screen instructions to confirm." }
];

export default function MobileAppInstructions() {
  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Add to Home Screen
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-slate-600 mb-6">Get instant, app-like access by adding a shortcut to your phone's home screen.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold text-slate-800 mb-3">For iPhone & iPad (Safari)</h3>
                    <div className="space-y-3">
                        {iosSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 bg-white border rounded-md flex items-center justify-center"><step.icon className="w-4 h-4 text-slate-600" /></div>
                                <p className="text-xs text-slate-700">{step.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 mb-3">For Android (Chrome)</h3>
                    <div className="space-y-3">
                        {androidSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 bg-white border rounded-md flex items-center justify-center"><step.icon className="w-4 h-4 text-slate-600" /></div>
                                <p className="text-xs text-slate-700">{step.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}