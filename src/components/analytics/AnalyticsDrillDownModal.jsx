
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/utils/currency';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Package, Eye, Store, Calendar } from 'lucide-react';
import { User } from '@/entities/all';

// Define color classes for categories
const categoryColorClasses = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-red-100 text-red-800",
  "bg-yellow-100 text-yellow-800",
];

const stringToHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const getCategoryColorClass = (category) => {
  if (!category) return "bg-gray-100 text-gray-800";
  const normalizedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, ''); 
  const hash = stringToHash(normalizedCategory);
  const index = Math.abs(hash % categoryColorClasses.length);
  return categoryColorClasses[index];
};

export default function AnalyticsDrillDownModal({ isOpen, onClose, type, title, data, onViewReceipt }) {
  const [userCurrency, setUserCurrency] = useState('GBP');

  useEffect(() => {
    User.me().then(user => user && user.currency && setUserCurrency(user.currency));
  }, []);

  if (!isOpen || !data) return null;

  const handleViewReceiptClick = (receiptId) => {
    // console.log('View Receipt clicked:', receiptId, 'Handler exists:', !!onViewReceipt); // For debugging
    if (onViewReceipt && receiptId) {
      onViewReceipt(receiptId);
    }
  };

  const renderCategoryOrSupermarketDrillDown = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {data.length} items found
      </p>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Item</TableHead>
                <TableHead className="w-[140px]">Store</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[100px] text-right">Price</TableHead>
                <TableHead className="w-[120px]">Category</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.canonical_name || item.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Store className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{item.supermarket}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="whitespace-nowrap">{format(new Date(item.purchase_date), 'MMM d, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.total_price || 0, userCurrency)}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`text-xs whitespace-nowrap ${getCategoryColorClass(item.category || 'other')}`}
                      >
                        {(item.category || 'other').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewReceiptClick(item.receipt_id)} 
                        className="whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderInflationDrillDown = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-slate-600">Previous Period Avg (per unit)</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(data.avgLastMonth, userCurrency)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">Recent Period Avg (per unit)</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(data.avgThisMonth, userCurrency)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">Price Change</p>
          <Badge className={data.priceChange > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
            {data.priceChange > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {data.priceChange > 0 ? '+' : ''}{(data.priceChange * 100).toFixed(1)}%
          </Badge>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-3">Purchase History (showing normalized prices per unit)</h4>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px]">Store</TableHead>
                  <TableHead className="w-[100px] text-right">Total Paid</TableHead>
                  <TableHead className="w-[80px] text-right">Quantity</TableHead>
                  <TableHead className="w-[120px] text-right">Price per Unit</TableHead>
                  <TableHead className="w-[100px] text-right">Pack Size</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases?.map((purchase, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(purchase.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{purchase.store}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchase.totalPrice, userCurrency)}</TableCell>
                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(purchase.pricePerUnit, userCurrency)}</TableCell>
                    <TableCell className="text-right">{purchase.packSize} {purchase.unit}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewReceiptClick(purchase.receiptId)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-4 text-slate-500">
                      Purchase details not available for drill-down
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShrinkflationDrillDown = () => (
    <div className="space-y-4">
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-orange-800">Shrinkflation Detected</span>
        </div>
        <p className="text-orange-700 text-sm">
          This product's pack size decreased while maintaining similar pricing, effectively increasing the cost per unit.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-slate-600">Previous Pack Size</p>
          <p className="text-lg font-bold text-slate-900">{data.packSizeLastMonth} {data.unit}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">Current Pack Size</p>
          <p className="text-lg font-bold text-slate-900">{data.packSizeThisMonth} {data.unit}</p>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-3">Recent Purchases Showing Size Change</h4>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px]">Store</TableHead>
                  <TableHead className="w-[100px] text-right">Total Paid</TableHead>
                  <TableHead className="w-[80px] text-right">Quantity</TableHead>
                  <TableHead className="w-[100px] text-right">Pack Size</TableHead>
                  <TableHead className="w-[120px] text-right">Price per Unit</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases?.map((purchase, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(purchase.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{purchase.store}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchase.totalPrice, userCurrency)}</TableCell>
                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                    <TableCell className="text-right">{purchase.packSize} {purchase.unit}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(purchase.pricePerUnit, userCurrency)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewReceiptClick(purchase.receiptId)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-4 text-slate-500">
                      Purchase details not available for drill-down
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVolatilityDrillDown = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-slate-600">Min Price (per unit)</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(data.minPrice, userCurrency)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">Max Price (per unit)</p>
          <p className="text-lg font-bold text-red-700">{formatCurrency(data.maxPrice, userCurrency)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">Average Price (per unit)</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(data.avgPrice, userCurrency)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">Volatility</p>
          <p className="text-lg font-bold text-purple-700">{(data.volatility * 100).toFixed(1)}%</p>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-3">Price History Over Time (normalized by quantity)</h4>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px]">Store</TableHead>
                  <TableHead className="w-[100px] text-right">Total Paid</TableHead>
                  <TableHead className="w-[80px] text-right">Quantity</TableHead>
                  <TableHead className="w-[120px] text-right">Price per Unit</TableHead>
                  <TableHead className="w-[100px] text-right">Pack Size</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases?.map((purchase, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(purchase.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{purchase.store}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchase.totalPrice, userCurrency)}</TableCell>
                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(purchase.pricePerUnit, userCurrency)}</TableCell>
                    <TableCell className="text-right">{purchase.packSize} {purchase.unit}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewReceiptClick(purchase.receiptId)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-4 text-slate-500">
                      Purchase details not available for drill-down
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'category':
      case 'supermarket':
        return renderCategoryOrSupermarketDrillDown();
      case 'inflation':
        return renderInflationDrillDown();
      case 'shrinkflation':
        return renderShrinkflationDrillDown();
      case 'volatility':
        return renderVolatilityDrillDown();
      default:
        return <p>No data available for this drill-down type.</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {type === 'category' && 'Items purchased in this category during the selected period'}
            {type === 'supermarket' && 'Items purchased from this store during the selected period'}
            {type === 'inflation' && 'Detailed price comparison and purchase history (prices normalized by quantity)'}
            {type === 'shrinkflation' && 'Pack size reduction analysis with purchase history'}
            {type === 'volatility' && 'Price variation analysis across all purchases (prices normalized by quantity)'}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 pb-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
