import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  id?: string;
}

/**
 * A standard toggle switch component.
 * Uses styling matching the "Enable GST calculations" switch in Settings.
 */
export function Toggle({ enabled, onChange, id }: ToggleProps): React.JSX.Element {
  return (
    <button
      id={id}
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 shadow-26
        ${enabled ? 'bg-stone-800' : 'bg-stone-200'}
      `}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out shadow-1
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}
