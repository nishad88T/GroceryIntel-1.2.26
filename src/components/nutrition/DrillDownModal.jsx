import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/components/utils/currency';
import { Badge } from '@/components/ui/badge';

export default function DrillDownModal({ isOpen, onClose, title, items, currency }) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">{title}</DialogTitle>
          <DialogDescription>
            A breakdown of items purchased in this category, sorted by total spend.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-4 mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-center">Times Purchased</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{item.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost, currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="3" className="text-center text-slate-500 py-8">
                    No items to display.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}