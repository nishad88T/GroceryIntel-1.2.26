import React, { useRef, useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, AlertTriangle, Upload, Zap, Info, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CameraCapture({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [permissionState, setPermissionState] = useState('unknown');
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [showTips, setShowTips] = useState(true);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack && typeof videoTrack.getCapabilities === 'function' && videoTrack.getCapabilities().torch) {
                 videoTrack.applyConstraints({ advanced: [{ torch: false }] })
                    .catch(e => console.warn("Failed to turn off torch on camera stop:", e));
            }
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsReady(false);
        setIsTorchOn(false);
        setIsTorchSupported(false);
    }, []);

    const startCamera = useCallback(async () => {
        try {
            const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            
            if (!isSecureContext) {
                setError("Camera requires HTTPS. Please use the file upload option instead.");
                setPermissionState('insecure');
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("Camera not supported in this browser. Please use the file upload option.");
                setPermissionState('unsupported');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            
            streamRef.current = stream;
            setPermissionState('granted');

            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
                const capabilities = videoTrack.getCapabilities();
                if (capabilities.torch) {
                    setIsTorchSupported(true);
                } else {
                    setIsTorchSupported(false);
                }
            } else {
                setIsTorchSupported(false);
            }
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => {
                    console.error("Video play() failed:", e);
                    setError("Could not start the camera view.");
                });
                
                videoRef.current.onloadedmetadata = () => {
                    setIsReady(true);
                    setError(null);
                };
            }
        } catch (err) {
            console.error("Camera error:", err);
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError("Camera permission denied. Please allow camera access or use file upload.");
                setPermissionState('denied');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError("No camera found. Please use the file upload option.");
                setPermissionState('no-device');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setError("Camera is being used by another application. Please close other apps and try again.");
                setPermissionState('busy');
            } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                setError("Camera doesn't meet requirements. Please use the file upload option.");
                setPermissionState('constrained');
            } else {
                setError("Camera access failed. Please use the file upload option.");
                setPermissionState('failed');
            }
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    const toggleTorch = async () => {
        if (!streamRef.current || !isTorchSupported) return;
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (!videoTrack || typeof videoTrack.applyConstraints !== 'function') {
            console.warn("Video track or applyConstraints not available for torch.");
            return;
        }
        try {
            await videoTrack.applyConstraints({
                advanced: [{ torch: !isTorchOn }]
            });
            setIsTorchOn(!isTorchOn);
        } catch (err) {
            console.error('Failed to toggle torch:', err);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !isReady) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            const file = new File([blob], `receipt-${Date.now()}.jpg`, { 
                type: 'image/jpeg' 
            });
            onCapture(file);
            stopCamera();
        }, 'image/jpeg', 0.95);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            onCapture(file);
            stopCamera();
        }
    };

    const getErrorContent = () => {
        switch (permissionState) {
            case 'denied':
                return {
                    icon: AlertTriangle,
                    title: "Camera Permission Denied",
                    message: "To use the camera, please:",
                    steps: [
                        "Click the camera/lock icon in your browser's address bar",
                        "Select 'Allow' for camera access",
                        "Refresh the page and try again"
                    ]
                };
            case 'insecure':
                return {
                    icon: AlertTriangle,
                    title: "Secure Connection Required",
                    message: "Camera access requires HTTPS. Please use file upload instead.",
                    steps: []
                };
            case 'no-device':
                return {
                    icon: Camera,
                    title: "No Camera Found",
                    message: "No camera was detected on this device.",
                    steps: []
                };
            case 'busy':
                return {
                    icon: AlertTriangle,
                    title: "Camera In Use",
                    message: "Close other apps that might be using the camera and try again.",
                    steps: []
                };
            default:
                return {
                    icon: AlertTriangle,
                    title: "Camera Error",
                    message: "Unable to access camera. Please use file upload instead.",
                    steps: []
                };
        }
    };

    const errorContent = getErrorContent();

    const photographyTips = [
        { icon: Camera, text: "Place receipt on flat surface", color: "text-blue-400" },
        { icon: Zap, text: "Use good lighting, avoid shadows", color: "text-yellow-400" },
        { icon: CheckCircle, text: "Ensure all text is readable", color: "text-green-400" },
        { icon: Info, text: "Tap center to focus before capture", color: "text-purple-400" }
    ];

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-full w-full h-full p-0 overflow-hidden bg-black border-none">
                {/* Fullscreen camera view */}
                <div className="relative w-full h-full bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ display: isReady && !error ? 'block' : 'none' }}
                    />
                    
                    {/* Smart guidance overlays - only when ready */}
                    {isReady && !error && (
                        <>
                            {/* Top darkened gradient for readability */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/50 to-transparent pointer-events-none" />
                            
                            {/* Bottom darkened gradient for controls */}
                            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
                            
                            {/* Subtle corner guides - NOT a rigid frame */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                                <div className="relative w-full max-w-md h-[70vh]">
                                    {/* Top left corner */}
                                    <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/30" />
                                    {/* Top right corner */}
                                    <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white/30" />
                                    {/* Bottom left corner */}
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white/30" />
                                    {/* Bottom right corner */}
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/30" />
                                </div>
                            </div>
                            
                            {/* Photography Tips - Dismissible */}
                            <AnimatePresence>
                                {showTips && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="absolute top-20 left-4 right-4 z-10"
                                    >
                                        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                                    <Camera className="w-4 h-4" />
                                                    Photography Tips
                                                </h3>
                                                <button 
                                                    onClick={() => setShowTips(false)}
                                                    className="text-white/60 hover:text-white transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {photographyTips.map((tip, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <tip.icon className={`w-4 h-4 ${tip.color} flex-shrink-0`} />
                                                        <span className="text-white/90 text-xs">{tip.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                <p className="text-white/70 text-xs italic">
                                                    💡 For long receipts: Step back to capture in one photo
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* Show tips button if dismissed */}
                            {!showTips && (
                                <button
                                    onClick={() => setShowTips(true)}
                                    className="absolute top-20 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/80 transition-colors"
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                            )}
                            
                            {/* Center instruction - Always visible */}
                            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center pointer-events-none">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="inline-block bg-black/70 backdrop-blur-sm text-white text-sm px-6 py-3 rounded-full border border-white/20"
                                >
                                    Ensure entire receipt is visible and readable
                                </motion.div>
                            </div>
                        </>
                    )}

                    {/* Loading state */}
                    {!isReady && !error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto" />
                                <p className="text-lg">Starting camera...</p>
                                <p className="text-sm text-white/60 mt-2">Initializing rear camera</p>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black text-white p-6">
                            <div className="text-center max-w-md">
                                <errorContent.icon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-3">{errorContent.title}</h3>
                                <p className="text-gray-300 mb-4">{errorContent.message}</p>
                                
                                {errorContent.steps.length > 0 && (
                                    <div className="text-left mb-6 bg-white/10 p-4 rounded-lg">
                                        <ol className="text-sm text-gray-200 space-y-2">
                                            {errorContent.steps.map((step, index) => (
                                                <li key={index} className="flex items-start">
                                                    <span className="text-emerald-400 font-bold mr-2 flex-shrink-0">{index + 1}.</span>
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <Button 
                                        onClick={startCamera} 
                                        variant="outline" 
                                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Try Again
                                    </Button>
                                    <Button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Image Instead
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Native-style bottom controls */}
                    {isReady && !error && (
                        <div className="absolute bottom-0 left-0 right-0 pb-safe">
                            <div className="flex items-center justify-between px-6 pb-8">
                                {/* Left: Close button */}
                                <button
                                    onClick={onClose}
                                    className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all border border-white/20 active:scale-95"
                                    aria-label="Close camera"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                {/* Center: Capture button - Large and prominent */}
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={capturePhoto}
                                    className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-2xl hover:border-emerald-400 transition-all relative"
                                    aria-label="Take photo"
                                >
                                    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600" />
                                    <div className="absolute inset-0 rounded-full border-2 border-white/30" />
                                </motion.button>

                                {/* Right: Flash/Gallery controls */}
                                <div className="flex flex-col gap-3">
                                    {isTorchSupported && (
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={toggleTorch}
                                            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm transition-all border border-white/20 active:scale-95 ${
                                                isTorchOn 
                                                    ? 'bg-yellow-400 text-black' 
                                                    : 'bg-black/60 text-white hover:bg-black/80'
                                            }`}
                                            aria-label={isTorchOn ? "Turn flash off" : "Turn flash on"}
                                        >
                                            <Zap className="w-6 h-6" />
                                        </motion.button>
                                    )}
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all border border-white/20 active:scale-95"
                                        aria-label="Upload from gallery"
                                    >
                                        <Upload className="w-6 h-6" />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </DialogContent>
        </Dialog>
    );
}