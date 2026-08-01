import React, { useState, useCallback } from 'react';
import {
  RiBuildingLine,
  RiBankCardLine,
} from 'react-icons/ri';
import { Input } from '../common/Input.tsx';
import { Button } from '../common/Button.tsx';
import { TactileIconBox } from '../common/TactileIconBox.tsx';

/** Essential first-launch settings: organisation identity and payment details. */
export interface OnboardingFormState {
  setting_org_name: string;
  setting_org_abn: string;
  setting_org_address: string;
  setting_org_phone: string;
  setting_org_email: string;
  setting_bank_name: string;
  setting_bsb: string;
  setting_account_number: string;
  setting_payment_instructions: string;
}

const INITIAL_FORM: OnboardingFormState = {
  setting_org_name: '',
  setting_org_abn: '',
  setting_org_address: '',
  setting_org_phone: '',
  setting_org_email: '',
  setting_bank_name: '',
  setting_bsb: '',
  setting_account_number: '',
  setting_payment_instructions: '',
};

type SlideDirection = 'forward' | 'backward';

interface OnboardingWizardProps {
  /** Called when the user finishes or skips setup. */
  onComplete: () => void;
}

/** Active/inactive progress pip below the slide heading. */
function OnboardingPip({ active }: { active: boolean }): React.JSX.Element {
  return (
    <div
      className={`h-1 rounded-full flex-shrink-0 transition-all duration-300 ${
        active
          ? 'w-6 bg-stone-800'
          : 'w-2 bg-stone-200'
      }`}
    />
  );
}

/**
 * Full-screen onboarding wizard shown on first launch.
 * Covers the 2 essential setup steps: organisation and payment details.
 */
export function OnboardingWizard({ onComplete }: OnboardingWizardProps): React.JSX.Element {
  const [step, setStep] = useState<number>(0);
  const [direction, setDirection] = useState<SlideDirection>('forward');
  const [animKey, setAnimKey] = useState<number>(0);
  const [form, setForm] = useState<OnboardingFormState>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  /** Play the exit animation, then unmount by calling onComplete. */
  const dismiss = useCallback((): void => {
    setIsExiting(true);
    setTimeout(onComplete, 350);
  }, [onComplete]);

  const TOTAL_STEPS = 2;

  const updateField = useCallback(
    <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]): void => {
      setForm(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const navigate = (next: number, dir: SlideDirection): void => {
    setDirection(dir);
    setAnimKey(k => k + 1);
    setStep(next);
  };

  const handleNext = (): void => {
    if (step < TOTAL_STEPS - 1) {
      navigate(step + 1, 'forward');
    } else {
      handleFinish();
    }
  };

  const handleBack = (): void => {
    if (step > 0) {
      navigate(step - 1, 'backward');
    }
  };

  /** Persist all gathered settings then play exit animation. */
  const handleFinish = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const toSave: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        toSave[k] = String(v);
      }
      await window.electronAPI.saveSettings(toSave);
      window.dispatchEvent(new Event('settings-updated'));
    } catch (err) {
      console.error('Onboarding save failed:', err);
    } finally {
      setIsSaving(false);
      dismiss();
    }
  };

  const slides = buildSlides(form, updateField);
  const currentSlide = slides[step];
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#f5f4f2] ${isExiting ? 'animate-onboarding-out' : 'animate-onboarding-in'}`}>
      <div className="w-full max-w-[480px] bg-white rounded-[20px] shadow-22 overflow-hidden flex flex-col">

        {/* Slide content */}
        <div
          key={animKey}
          className={`px-9 pt-9 pb-7 ${direction === 'forward' ? 'animate-slide-forward' : 'animate-slide-backward'}`}
        >
          <TactileIconBox
            icon={currentSlide.icon}
            size="lg"
            className="mb-5"
          />

          {/* Heading */}
          <h1 className="text-[28px] font-semibold text-stone-900 mb-1 leading-snug">
            {currentSlide.title}
          </h1>
          <p className="text-sm text-stone-400 mb-6 leading-relaxed">
            {currentSlide.subtitle}
          </p>

          {/* Step progress pips */}
          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <OnboardingPip key={i} active={i === step} />
            ))}
          </div>

          {/* Form fields */}
          {currentSlide.fields}
        </div>

        {/* Footer */}
        <div className="px-9 pb-7 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button variant="secondary" onClick={handleBack} size="md">
                Back
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isSaving}
              fullWidth
              size="md"
            >
              {isLastStep ? (isSaving ? 'Saving…' : 'Finish Setup') : 'Continue'}
            </Button>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors mx-auto"
          >
            Set up later
          </button>
        </div>

      </div>
    </div>
  );
}

/** Slide definition for a single step. */
interface Slide {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  fields: React.ReactNode;
}

/**
 * Builds the five slide definitions, keeping render logic separate from the main component.
 * Each slide corresponds to one settings category.
 */
function buildSlides(
  form: OnboardingFormState,
  update: <K extends keyof OnboardingFormState>(key: K, val: OnboardingFormState[K]) => void,
): Slide[] {
  return [
    /* ── Slide 1: Organisation ── */
    {
      icon: <RiBuildingLine size={22} />,
      title: 'Your organisation',
      subtitle: 'Tell us about your business so invoices look professional from day one.',
      fields: (
        <div className="flex flex-col gap-4">
          <Input
            label="Organisation Name"
            value={form.setting_org_name}
            onChange={v => update('setting_org_name', v)}
            placeholder="e.g. Acme Pty Ltd"
          />
          <Input
            label="Business Number / ABN"
            value={form.setting_org_abn}
            onChange={v => update('setting_org_abn', v)}
            placeholder="e.g. 12 345 678 901"
          />
          <Input
            label="Address"
            value={form.setting_org_address}
            onChange={v => {
              if (v.split('\n').length <= 3) {
                update('setting_org_address', v);
              }
            }}
            placeholder="Full mailing address"
            multiline
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={form.setting_org_phone}
              onChange={v => update('setting_org_phone', v)}
              placeholder="+61 400 000 000"
            />
            <Input
              label="Billing Email"
              value={form.setting_org_email}
              onChange={v => update('setting_org_email', v)}
              placeholder="accounts@acme.com"
              type="email"
            />
          </div>
        </div>
      ),
    },

    /* ── Slide 2: Payment Details ── */
    {
      icon: <RiBankCardLine size={22} />,
      title: 'Payment details',
      subtitle: 'Add your bank details so clients know exactly how to pay you.',
      fields: (
        <div className="flex flex-col gap-4">
          <Input
            label="Bank Name"
            value={form.setting_bank_name}
            onChange={v => update('setting_bank_name', v)}
            placeholder="e.g. Commonwealth Bank"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="BSB"
              value={form.setting_bsb}
              onChange={v => update('setting_bsb', v)}
              placeholder="e.g. 062-900"
            />
            <Input
              label="Account Number"
              value={form.setting_account_number}
              onChange={v => update('setting_account_number', v)}
              placeholder="e.g. 1234 5678"
            />
          </div>
        </div>
      ),
    },

  ];
}
