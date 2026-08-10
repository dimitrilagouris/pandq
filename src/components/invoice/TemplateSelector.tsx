import React from 'react';
import { RiCheckLine } from 'react-icons/ri';
import { templates } from './templates/registry';

export interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelect: (id: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selectedTemplateId, onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
      {templates.map((t) => {
        const isSelected = selectedTemplateId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`flex flex-col text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer ${isSelected
                ? 'border-stone-800 bg-stone-50/50 shadow-sm ring-1 ring-stone-800'
                : 'border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm'
              }`}
          >
            {/* Mini visual mockup of the template */}
            <div className="h-24 w-full rounded-lg bg-stone-50 border border-stone-200/60 overflow-hidden mb-3 flex flex-col relative">
              {t.id === 'classic' ? (
                <>
                  {/* Clean white top */}
                  <div className="h-6 w-full flex items-center px-2 justify-between">
                    <div className="h-2 w-12 rounded-sm" style={{ backgroundColor: '#4281A4' }} />
                  </div>
                  {/* Body lines */}
                  <div className="px-2 pb-2 flex-1 flex flex-col gap-1">
                    {/* 3 columns */}
                    <div className="flex justify-between gap-1">
                      <div className="h-1 w-6 bg-stone-300 rounded" />
                      <div className="h-1 w-6 bg-stone-300 rounded" />
                      <div className="h-1 w-6 bg-stone-300 rounded" />
                    </div>
                    {/* Table blue header line */}
                    <div className="h-[1.5px] w-full mt-1" style={{ backgroundColor: '#4281A4' }} />
                    {/* Table row */}
                    <div className="h-0.5 w-full bg-stone-200 rounded mt-0.5" />
                    <div className="h-0.5 w-full bg-stone-200 rounded" />
                    {/* Totals split */}
                    <div className="flex justify-between items-end mt-auto pt-1">
                      <div className="h-2 w-8 rounded" style={{ backgroundColor: '#4281A4' }} />
                      <div className="flex flex-col gap-0.5 items-end">
                        <div className="h-0.5 w-6 bg-stone-300 rounded" />
                        <div className="h-0.5 w-6 bg-stone-300 rounded" />
                      </div>
                    </div>
                  </div>
                </>
              ) : t.id === 'minimal' ? (
                <>
                  {/* Thin accent line at top */}
                  <div className="h-1 bg-stone-300 w-full" />
                  {/* Body lines */}
                  <div className="p-2.5 flex-1 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <div className="h-1.5 w-6 bg-stone-700 rounded" />
                        <div className="h-1 w-4 bg-stone-300 rounded" />
                      </div>
                      <div className="h-2 w-8 bg-stone-400 rounded" />
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded" />
                    <div className="h-1 w-full bg-stone-200 rounded" />
                    <div className="h-1.5 w-8 bg-stone-500 rounded self-end mt-auto" />
                  </div>
                </>
              ) : (
                <>
                  {/* Solid black top bar */}
                  <div className="h-1 bg-stone-900 w-full" />
                  {/* Body lines */}
                  <div className="p-2 flex-1 flex flex-col gap-1 items-center justify-center">
                    {/* Centered ABN */}
                    <div className="h-0.5 w-6 bg-stone-300 rounded mt-0.5" />
                    {/* Big cursive header */}
                    <div className="h-2 w-10 bg-stone-400 rounded-full mt-1.5" style={{ borderRadius: '100px' }} />
                    {/* Billed Block layout */}
                    <div className="w-full flex justify-between gap-2 px-1 mt-1.5">
                      <div className="h-1.5 w-8 bg-stone-250 rounded" />
                      <div className="h-1.5 w-6 bg-stone-250 rounded" />
                    </div>
                    <div className="h-0.5 w-full bg-stone-300 rounded mt-1.5" />
                    {/* Bottom Created date indicator */}
                    <div className="h-[2px] w-full bg-stone-200 rounded mt-auto" />
                  </div>
                </>
              )}

              {/* Selected overlay check badge */}
              {isSelected && (
                <span className="absolute top-2 right-2 bg-stone-800 text-white rounded-full p-0.5 flex items-center justify-center shadow-sm">
                  <RiCheckLine className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            <span className="text-xs font-semibold text-stone-900 text-center w-full">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
};
