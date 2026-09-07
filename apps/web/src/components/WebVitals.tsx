"use client";

import { useReportWebVitals } from "next/web-vitals";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const BUDGETS_MS: Partial<Record<string, number>> = {
  TTFB: 800,
  FCP: 1800,
  LCP: 2500,
  INP: 200,
};

const CLS_BUDGET = 0.1;

const reportWebVitals: ReportWebVitalsCallback = (metric) => {
  if (metric.name === "CLS") {
    if (metric.value > CLS_BUDGET) {
      console.warn(
        `[Perf] CLS ${metric.value.toFixed(3)} exceeds budget ${CLS_BUDGET}`,
      );
    }
    return;
  }

  const budget = BUDGETS_MS[metric.name];
  if (budget === undefined) return;

  if (metric.value > budget) {
    console.warn(
      `[Perf] ${metric.name} ${Math.round(metric.value)}ms exceeds budget ${budget}ms (${metric.rating})`,
    );
  } else if (process.env.NODE_ENV === "production" && metric.rating === "poor") {
    console.warn(
      `[Perf] ${metric.name} ${Math.round(metric.value)}ms rated ${metric.rating}`,
    );
  }
};

export function WebVitals() {
  useReportWebVitals(reportWebVitals);
  return null;
}