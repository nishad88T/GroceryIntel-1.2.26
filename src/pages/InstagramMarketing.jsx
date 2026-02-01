import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, Copy, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export default function InstagramMarketing() {
    const [customText1, setCustomText1] = useState('');
    const [customText2, setCustomText2] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    
    const slide1Ref = useRef(null);
    const slide2Ref = useRef(null);
    const slide3Ref = useRef(null);
    const slide4Ref = useRef(null);
    const slide5Ref = useRef(null);
    const slide6Ref = useRef(null);
    const slide7Ref = useRef(null);
    const slide8Ref = useRef(null);
    const slide9Ref = useRef(null);

    const handleDownload = async (slideRef, filename) => {
        if (!slideRef.current) return;
        
        try {
            const element = slideRef.current;
            
            // Wait for all images to load
            const images = element.getElementsByTagName('img');
            await Promise.all(
                Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                })
            );

            // Force reflow and wait a moment for layout to stabilize
            element.offsetHeight;
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(element, {
                scale: 3,
                backgroundColor: '#f0fdf4',
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: element.offsetWidth,
                height: element.offsetHeight,
                windowWidth: element.offsetWidth,
                windowHeight: element.offsetHeight,
                x: 0,
                y: 0,
            });
            
            const url = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.download = `${filename}.jpg`;
            link.href = url;
            link.click();
            
            toast.success('Slide downloaded!');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download slide');
        }
    };

    const handleCopyText = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Text copied!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const gradientBg = "bg-gradient-to-br from-emerald-50 via-white to-teal-50";

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Instagram Marketing Slides</h1>
                    <p className="text-slate-600">Create branded Instagram posts for GroceryIntel™</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Slide 1: Logo + Tagline at Top */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Blank Slide - Header Style</span>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDownload(slide1Ref, 'groceryintel-header-template')}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Enter custom text for this slide..."
                                value={customText1}
                                onChange={(e) => setCustomText1(e.target.value)}
                                className="h-24"
                            />
                            
                            <div 
                                ref={slide1Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Header with Logo */}
                                <div className="flex items-center gap-2 mb-4" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div style={{ flex: '1 1 auto', position: 'relative' }}>
                                    <p className="text-xl font-bold text-slate-800 leading-relaxed" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', padding: '0 8px', boxSizing: 'border-box', textAlign: 'center' }}>
                                        {customText1 || 'Your custom text will appear here'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 2: Logo + Tagline at Footer */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Blank Slide - Footer Style</span>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDownload(slide2Ref, 'groceryintel-footer-template')}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Enter custom text for this slide..."
                                value={customText2}
                                onChange={(e) => setCustomText2(e.target.value)}
                                className="h-24"
                            />
                            
                            <div 
                                ref={slide2Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Content Area */}
                                <div style={{ flex: '1 1 auto', position: 'relative' }}>
                                    <p className="text-xl font-bold text-slate-800 leading-relaxed" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', padding: '0 8px', boxSizing: 'border-box', textAlign: 'center' }}>
                                        {customText2 || 'Your custom text will appear here'}
                                    </p>
                                </div>

                                {/* Footer with Logo */}
                                <div className="flex items-center gap-2 mt-4" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 3: What is GroceryIntel */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>What is GroceryIntel™?</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleCopyText("What is GroceryIntel™?\n\nGroceryIntel™ is a smart budgeting web app that helps you plan, shop, and track your grocery spending.\n\nWe provide detailed insights into price changes, spending patterns, and nutritional information—empowering you to make wiser financial and food choices week after week.", 'slide3')}
                                    >
                                        {copiedId === 'slide3' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Text
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDownload(slide3Ref, 'what-is-groceryintel')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={slide3Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Header with Logo */}
                                <div className="flex items-center gap-2 mb-3" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">What is GroceryIntel™?</h3>
                                    <p className="text-sm text-slate-700 leading-snug">
                                        GroceryIntel™ is a <span className="font-semibold text-emerald-700">smart budgeting web app</span> that helps you plan, shop, and track your grocery spending.
                                    </p>
                                    <p className="text-sm text-slate-700 leading-snug">
                                        We provide detailed insights into <span className="font-semibold text-emerald-700">price changes, spending patterns, and nutritional information</span>—empowering you to make wiser financial and food choices.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 4: How GroceryIntel Works */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>How GroceryIntel™ Works</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleCopyText("How GroceryIntel™ Works\n\n1. PLAN: Browse recipes & create meal plans\n2. SHOP: Generate AI-powered shopping lists\n3. TRACK: Snap receipts or email to receipts@groceryintel.com\n4. ANALYZE: Get instant insights on spending, inflation & nutrition", 'slide4')}
                                    >
                                        {copiedId === 'slide4' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Text
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDownload(slide4Ref, 'how-groceryintel-works')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={slide4Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Header with Logo */}
                                <div className="flex items-center gap-2 mb-3" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="space-y-3">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">How It Works</h3>
                                    <div className="space-y-2.5">
                                        <div className="flex items-start gap-2">
                                            <div className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{lineHeight: '1'}}>1</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">PLAN</h4>
                                                <p className="text-slate-700 text-xs">Browse recipes & create meal plans</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{lineHeight: '1'}}>2</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">SHOP</h4>
                                                <p className="text-slate-700 text-xs">Generate AI-powered shopping lists</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{lineHeight: '1'}}>3</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">TRACK</h4>
                                                <p className="text-slate-700 text-xs">Snap receipts or email them</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{lineHeight: '1'}}>4</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">ANALYZE</h4>
                                                <p className="text-slate-700 text-xs">Get insights on spending & nutrition</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 5: Why Track Groceries? */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Why Track Groceries?</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleCopyText("Why Track Groceries?\n\n• Groceries make up 12-15% of household budgets\n• One of the few expenses you can truly control\n• 10-15% improvement can save hundreds yearly\n• Small consistent changes reduce waste & improve health", 'slide5')}
                                    >
                                        {copiedId === 'slide5' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Text
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDownload(slide5Ref, 'why-track-groceries')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={slide5Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <div className="flex items-center gap-2 mb-3" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Why Track Groceries?</h3>
                                    <div className="space-y-2.5">
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-lg font-bold mt-0.5">•</span>
                                            <p className="text-sm text-slate-700 leading-snug">Groceries make up 12-15% of household budgets</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-lg font-bold mt-0.5">•</span>
                                            <p className="text-sm text-slate-700 leading-snug">One of the few expenses you can truly control</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-lg font-bold mt-0.5">•</span>
                                            <p className="text-sm text-slate-700 leading-snug">10-15% improvement can save hundreds yearly</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-lg font-bold mt-0.5">•</span>
                                            <p className="text-sm text-slate-700 leading-snug">Small consistent changes reduce waste & improve health</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 6: Why GroceryIntel? */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Why GroceryIntel™?</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleCopyText("Why GroceryIntel™?\n\n✓ Plan meals & generate shopping lists\n✓ Snap receipts in seconds—AI does the work\n✓ Track spending with detailed analytics\n✓ Spot trends & see where your money goes\n✓ Link nutrition insights to your spending", 'slide6')}
                                    >
                                        {copiedId === 'slide6' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Text
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDownload(slide6Ref, 'why-groceryintel')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={slide6Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <div className="flex items-center gap-2 mb-3" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Why GroceryIntel™?</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-base font-bold mt-0.5">✓</span>
                                            <p className="text-sm text-slate-700 leading-snug">Plan meals & generate shopping lists</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-base font-bold mt-0.5">✓</span>
                                            <p className="text-sm text-slate-700 leading-snug">Snap receipts in seconds—AI does the work</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-base font-bold mt-0.5">✓</span>
                                            <p className="text-sm text-slate-700 leading-snug">Track spending with detailed analytics</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-base font-bold mt-0.5">✓</span>
                                            <p className="text-sm text-slate-700 leading-snug">Spot trends & see where your money goes</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-600 text-base font-bold mt-0.5">✓</span>
                                            <p className="text-sm text-slate-700 leading-snug">Link nutrition insights to your spending</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 7: Stop Guessing. Start Saving. */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Stop Guessing. Start Saving.</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleCopyText("Stop Guessing. Start Saving.\n\nTired of checkout surprises? GroceryIntel™ turns your receipts into actionable insights—so you know exactly where your money goes and how to spend smarter.", 'slide7')}
                                    >
                                        {copiedId === 'slide7' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Text
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDownload(slide7Ref, 'stop-guessing-start-saving')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={slide7Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <div className="flex items-center gap-2 mb-3" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }} className="space-y-3">
                                    <h3 className="text-2xl font-bold text-slate-900 text-center leading-tight">Stop Guessing.<br/>Start Saving.</h3>
                                    <p className="text-sm text-slate-700 text-center leading-snug">
                                        Tired of checkout surprises? GroceryIntel™ turns your receipts into actionable insights—so you know exactly where your money goes and how to spend smarter.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 8: Launching Soon - Have Your Say */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Launching Soon - Join Beta</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleCopyText("We're Building Something Special—And We Want YOUR Input!\n\nGroceryIntel™ is launching soon, and we're inviting early users to help shape the future of smart grocery tracking.\n\n✓ Get early access\n✓ Influence new features\n✓ Join a community of savvy shoppers\n\nSign up now at groceryintel.com", 'slide8')}
                                    >
                                        {copiedId === 'slide8' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Text
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDownload(slide8Ref, 'launching-soon-beta')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={slide8Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <div className="flex items-center gap-2 mb-3" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="space-y-3">
                                    <div className="text-center space-y-2">
                                        <div className="inline-block px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full mb-2">BETA ACCESS</div>
                                        <h3 className="text-xl font-bold text-slate-900 leading-tight">We're Building Something Special—<br/>And We Want YOUR Input!</h3>
                                    </div>
                                    <p className="text-sm text-slate-700 text-center leading-snug px-2">
                                        GroceryIntel™ is launching soon, and we're inviting early users to help shape the future of smart grocery tracking.
                                    </p>
                                    <div className="space-y-1.5 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-600 text-base font-bold">✓</span>
                                            <p className="text-sm text-slate-700">Get early access</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-600 text-base font-bold">✓</span>
                                            <p className="text-sm text-slate-700">Influence new features</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-600 text-base font-bold">✓</span>
                                            <p className="text-sm text-slate-700">Join a community of savvy shoppers</p>
                                        </div>
                                    </div>
                                    <p className="text-center text-emerald-700 font-bold text-sm mt-2">Sign up now at groceryintel.com</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Slide 9: How GroceryIntel Was Born */}
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>How GroceryIntel Was Born</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleCopyText("How GroceryIntel Was Born\n\nCreated by a qualified accountant tired of tedious spreadsheets and manual entry, we realized: tracking groceries shouldn't be a chore.\n\nGroceryIntel transforms receipts into instant insights—linking meal planning, shopping lists, and spending analytics all in one place. Making it easy to understand your spending, spot trends, and take control of one of your biggest household expenses.", 'slide9')}
                                    >
                                        {copiedId === 'slide9' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Text
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDownload(slide9Ref, 'how-groceryintel-was-born')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={slide9Ref}
                                className={`w-full aspect-square ${gradientBg} rounded-xl overflow-hidden p-4`}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <div className="flex items-center gap-2 mb-3" style={{ flex: '0 0 auto' }}>
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8d253ddee_Roundedlogo21.png"
                                        alt="GroceryIntel Logo"
                                        className="w-10 h-10 rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">GroceryIntel™</h2>
                                        <p className="text-emerald-600 text-xs font-medium">Track Smarter. Spend Better.</p>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '12px', paddingRight: '12px' }} className="space-y-3">
                                    <h3 className="text-lg font-bold text-slate-900 text-center leading-tight">How GroceryIntel Was Born</h3>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        Created by a qualified accountant tired of tedious spreadsheets and manual entry, we realized: <span className="font-semibold text-emerald-700">tracking groceries shouldn't be a chore</span>.
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        GroceryIntel transforms receipts into instant insights—linking meal planning, shopping lists, and spending analytics all in one place. Making it easy to understand your spending, spot trends, and take control of one of your biggest household expenses.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}