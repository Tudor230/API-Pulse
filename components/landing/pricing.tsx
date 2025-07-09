"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { useTheme } from "next-themes";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
  planType: 'free' | 'pro' | 'enterprise';
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();
  const { data: subscriptionData } = useSubscription();

  const currentPlan = subscriptionData?.subscription?.plan || null;

  const handleCheckout = async (plan: PricingPlan) => {
    // If user is already on this plan, do nothing
    if (currentPlan === plan.planType) {
      return;
    }

    if (plan.planType === 'free') {
      // For free plan, just redirect to sign up
      window.location.href = plan.href;
      return;
    }

    if (plan.planType === 'enterprise') {
      // For enterprise plan, redirect to contact page
      window.location.href = '/contact';
      return;
    }

    if (!plan.stripeMonthlyPriceId || !plan.stripeYearlyPriceId) {
      console.error('Missing Stripe price IDs for plan:', plan.name);
      return;
    }

    setIsLoading(plan.name);

    try {
      const priceId = isMonthly ? plan.stripeMonthlyPriceId : plan.stripeYearlyPriceId;

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          plan: plan.planType,
          theme: theme || 'light',
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Checkout error:', data.error);
        // If unauthorized (401), redirect to sign in
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "hsl(var(--primary))",
          "hsl(var(--accent))",
          "hsl(var(--secondary))",
          "hsl(var(--muted))",
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="container py-20">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h2>
        <p className="text-muted-foreground text-lg whitespace-pre-line">
          {description}
        </p>
      </div>

      <div className="flex justify-center mb-10">
        <label className="relative inline-flex items-center cursor-pointer">
          <Label>
            <Switch
              ref={switchRef as any}
              checked={!isMonthly}
              onCheckedChange={handleToggle}
              className="relative"
            />
          </Label>
        </label>
        <span className="ml-2 font-semibold">
          Annual billing <span className="text-primary">(Save 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-4">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                  y: plan.isPopular ? -20 : 0,
                  opacity: 1,
                  x: index === 2 ? -30 : index === 0 ? 30 : 0,
                  scale: index === 0 || index === 2 ? 0.94 : 1.0,
                }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              `rounded-2xl border-[1px] p-6 bg-background text-center lg:flex lg:flex-col lg:justify-center relative`,
              plan.isPopular ? "border-primary border-2" : "border-border",
              "flex flex-col",
              !plan.isPopular && "mt-5",
              index === 0 || index === 2
                ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                : "z-10",
              index === 0 && "origin-right",
              index === 2 && "origin-left"
            )}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                <Star className="text-primary-foreground h-4 w-4 fill-current" />
                <span className="text-primary-foreground ml-1 font-sans font-semibold">
                  Popular
                </span>
              </div>
            )}
            <div className="flex-1 flex flex-col h-full">
              <p className="text-base font-semibold text-muted-foreground">
                {plan.name}
              </p>
              <div className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  <NumberFlow
                    value={
                      isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
                    }
                    format={{
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }}
                    transformTiming={{
                      duration: 500,
                      easing: "ease-out",
                    }}
                    willChange
                    className="font-variant-numeric: tabular-nums"
                  />
                </span>
                {plan.period !== "Next 3 months" && (
                  <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                    / {plan.period}
                  </span>
                )}
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                {isMonthly ? "billed monthly" : "billed annually"}
              </p>

              <ul className="mt-5 gap-2 flex flex-col flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <span className="text-left">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <hr className="w-full my-4" />

                {currentPlan === plan.planType ? (
                  <div
                    className={cn(
                      buttonVariants({
                        variant: "outline",
                      }),
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                      "bg-primary/10 text-primary border-primary cursor-default"
                    )}
                  >
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={isLoading === plan.name}
                    className={cn(
                      buttonVariants({
                        variant: "outline",
                      }),
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                      "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground",
                      plan.isPopular
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground",
                      isLoading === plan.name && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isLoading === plan.name
                      ? "Processing..."
                      : currentPlan === 'pro' && plan.planType === 'free'
                        ? "Downgrade to Free"
                        : plan.buttonText
                    }
                  </button>
                )}
                <p className="mt-6 text-xs leading-5 text-muted-foreground">
                  {plan.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
