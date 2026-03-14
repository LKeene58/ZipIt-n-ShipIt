"use client";

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { approveProduct, rejectProduct } from '@/app/admin/actions';

export default function ReviewButtons({ productId }: { productId: string }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    await approveProduct(productId);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await rejectProduct(productId);
    setIsProcessing(false);
  };

  return (
    <div className="flex gap-2">
      <button 
        type="button" 
        onClick={handleApprove}
        disabled={isProcessing}
        aria-label="Approve Product"
        title="Approve Product"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-500/20 text-emerald-400 transition hover:bg-emerald-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
      </button>

      <button 
        type="button" 
        onClick={handleReject}
        disabled={isProcessing}
        aria-label="Reject Product"
        title="Reject Product"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/50 bg-red-500/20 text-red-400 transition hover:bg-red-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}