import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, Zap, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ProcessingStatus({ message }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center min-h-[400px]"
        >
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm w-full max-w-md">
                <CardContent className="p-8 text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 mx-auto mb-6"
                    >
                        <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white" />
                        </div>
                    </motion.div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">Processing Receipt</h3>
                    <p className="text-slate-600 mb-8">
                        {message || "Using intelligent scanning to extract your purchase details..."}
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            <span className="text-slate-700 font-medium">High-accuracy document scanning</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                            <Zap className="w-5 h-5 text-emerald-600" />
                            <span className="text-slate-700 font-medium">Smart price validation</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <span className="text-slate-700 font-medium">Intelligent data verification</span>
                        </div>
                    </div>

                    <div className="mt-8 text-xs text-slate-500">
                        This can take up to 2 minutes per photo for complex receipts.
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}