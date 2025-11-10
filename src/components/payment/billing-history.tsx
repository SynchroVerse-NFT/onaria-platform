import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Download,
  CreditCard,
  Wallet,
  Check,
  Clock,
  XCircle,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Payment status type
 */
export type PaymentStatus = 'paid' | 'pending' | 'failed';

/**
 * Payment method type
 */
export type PaymentMethod = 'credit_card' | 'crypto';

/**
 * Billing history record
 */
export interface BillingRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
}

/**
 * Sort column type
 */
export type SortColumn = 'date' | 'amount' | 'status';

/**
 * Sort order type
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Props for the BillingHistory component
 */
export interface BillingHistoryProps {
  billingHistory: BillingRecord[];
  itemsPerPage?: number;
  onDownloadReceipt?: (recordId: string) => void;
  className?: string;
}

/**
 * Status badge configuration
 */
const STATUS_CONFIG: Record<PaymentStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  color: string;
}> = {
  paid: {
    label: 'Paid',
    variant: 'default',
    icon: <Check className="size-3" />,
    color: 'text-green-600 bg-green-100 dark:bg-green-900',
  },
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: <Clock className="size-3" />,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    icon: <XCircle className="size-3" />,
    color: 'text-red-600 bg-red-100 dark:bg-red-900',
  },
};

/**
 * Payment method icon
 */
function getPaymentMethodIcon(method: PaymentMethod): React.ReactNode {
  return method === 'credit_card' ? (
    <CreditCard className="size-4" />
  ) : (
    <Wallet className="size-4" />
  );
}

/**
 * BillingHistory component displays a sortable, filterable, and paginated table
 * of payment history with status badges and receipt download functionality.
 */
export function BillingHistory({
  billingHistory,
  itemsPerPage = 10,
  onDownloadReceipt,
  className,
}: BillingHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...billingHistory].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [billingHistory, sortColumn, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>
          View and download receipts for all your past payments
        </CardDescription>
      </CardHeader>

      <CardContent>
        {billingHistory.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            No billing history yet
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1 hover:text-text-primary"
                      >
                        Date
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center gap-1 hover:text-text-primary"
                      >
                        Amount
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-text-primary"
                      >
                        Status
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((record) => {
                    const statusConfig = STATUS_CONFIG[record.status];
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell className="font-semibold">
                          {record.currency === 'USD' ? '$' : record.currency}
                          {record.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(statusConfig.color, 'gap-1')}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-text-secondary">
                            {getPaymentMethodIcon(record.paymentMethod)}
                            <span className="capitalize">
                              {record.paymentMethod.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {record.receiptUrl && onDownloadReceipt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadReceipt(record.id)}
                            >
                              <Download className="size-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={cn(
                        currentPage === 1 && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={cn(
                        currentPage === totalPages && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
