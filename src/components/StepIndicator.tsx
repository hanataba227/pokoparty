'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isClickable = onStepClick && (isCompleted || isCurrent);

        return (
          <div key={index} className="flex items-center gap-2">
            {/* 스텝 원 */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(stepNumber)}
              disabled={!isClickable}
              className="flex flex-col items-center gap-1 bg-transparent border-none p-0 disabled:cursor-default"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  transition-colors duration-200
                  ${
                    isCompleted
                      ? 'bg-indigo-600 text-white'
                      : isCurrent
                      ? 'border-2 border-indigo-600 text-indigo-600'
                      : 'border-2 border-slate-300 text-slate-400'
                  }
                  ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1' : ''}`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap
                  ${
                    isCompleted
                      ? 'text-indigo-600'
                      : isCurrent
                      ? 'text-indigo-600 font-semibold'
                      : 'text-slate-400'
                  }
                  ${isClickable ? 'hover:underline' : ''}`}
              >
                {step}
              </span>
            </button>

            {/* 연결선 (마지막 스텝 제외) */}
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-5
                  ${isCompleted ? 'bg-indigo-600' : 'bg-slate-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
