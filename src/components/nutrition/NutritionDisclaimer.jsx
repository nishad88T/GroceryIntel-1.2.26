import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function NutritionDisclaimer() {
  return (
    <Card className="border-orange-200 bg-orange-50/80 shadow-lg mb-8">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-orange-500 rounded-lg mt-1">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-orange-900 text-lg mb-2">Important Disclaimer</h3>
            <p className="text-orange-800 text-sm">
              This nutrition analysis is an <strong>estimation based on general food categories</strong>, not a precise scientific calculation. It's designed to give you a high-level overview of your purchasing habits to help you make more mindful decisions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}