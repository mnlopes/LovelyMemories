
"use client";

import React, { useState, useRef } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';
import { Loader2, ShieldCheck, CreditCard, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface StripePaymentFormProps {
  amount: number;
  onSuccess: (paymentIntent: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onValidityChange?: (isValid: boolean) => void;
  confirmLabel?: string;
}

export default function StripePaymentForm({ 
  amount, 
  onSuccess, 
  isLoading, 
  setIsLoading,
  onValidityChange,
  confirmLabel = "Confirm Payment"
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || submittingRef.current) {
      return;
    }

    try {
      submittingRef.current = true;
      setIsLoading(true);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/booking/confirmation`,
        },
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message || "Ocorreu um erro no cartão.");
          toast.error(error.message);
        } else {
          setMessage("Ocorreu um erro inesperado.");
          toast.error("Ocorreu um erro inesperado.");
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      setMessage(err.message || "Ocorreu um erro.");
      toast.error(err.message || "Ocorreu um erro.");
    } finally {
      // Always reset if we didn't redirect or didn't purely succeed without further needs
      setIsLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <form id="stripe-payment-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="p-8 border border-gray-100 bg-white shadow-xl shadow-navy-950/5 rounded-[40px] space-y-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12">
            <ShieldCheck className="w-40 h-40" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-[#B08D4A]" />
            <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">
              Detalhes do Cartão
            </label>
          </div>
          
          <PaymentElement 
            onChange={(event) => {
              onValidityChange?.(event.complete);
            }}
            options={{
              layout: 'tabs'
            }}
          />
        </div>

        {message && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600 animate-in fade-in slide-in-from-top-1">
            {message}
          </div>
        )}

        {/* The submit button is now in the sidebar (CheckoutPage) and triggers this form via ID */}
        
        <div className="pt-4 flex flex-col items-center gap-2">
            <p className="text-[10px] text-navy-900/40 font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Pagamento 100% Seguro por Stripe
            </p>
        </div>
      </div>
    </form>
  );
}
