
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { formatCurrency } from "@/components/utils/currency";
import { format } from "date-fns";
import { ArrowRight, Receipt, Store, Calendar } from "lucide-react";

export default function RecentReceipts({ receipts, loading }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-emerald-600" />
                        Recent Receipts
                    </CardTitle>
                    <Link to={createPageUrl("Receipts")}>
                        <Button variant="outline" size="sm" className="hover:bg-emerald-50 border-emerald-200">
                            View All
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array(3).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-12 h-12 rounded-lg" />
                                        <div>
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24 mt-1" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : receipts.length > 0 ? (
                        <ScrollArea className="h-[280px] pr-4"> {/* Added ScrollArea */}
                            <div className="space-y-4">
                                {receipts.map((receipt, index) => (
                                    <motion.div
                                        key={receipt.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                                <Store className="w-6 h-6 text-white" /> {/* Changed ShoppingBag to Store */}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{receipt.supermarket}</p>
                                                <p className="text-sm text-slate-600">
                                                    {format(new Date(receipt.purchase_date), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-900">{formatCurrency(receipt.total_amount)}</p> {/* Used formatCurrency */}
                                            <Badge variant="outline" className="text-xs">
                                                {receipt.items?.length || 0} items
                                            </Badge>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-center py-8">
                            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" /> {/* Changed ReceiptIcon to Receipt */}
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Receipts Yet</h3>
                            <p className="text-slate-600 mb-4">Start tracking your grocery spending</p>
                            <Link to={createPageUrl("ScanReceipt")}>
                                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                                    Scan Your First Receipt
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
