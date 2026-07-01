import React, { useState, useRef, useEffect } from 'react';

interface TagOption {
  label: string;
  token: string;
  description: string;
}

const AVAILABLE_TAGS: TagOption[] = [
  { label: 'Invoice ID', token: '{invoiceNumber}', description: 'Unique invoice identifier' },
  { label: 'Client Name', token: '{clientName}', description: 'Name of the billed client' },
  { label: 'Organisation Name', token: '{orgName}', description: 'Your business name' },
  { label: 'Due Date', token: '{dueDate}', description: 'Payment due date' },
  { label: 'Grand Total', token: '{grandTotal}', description: 'Total price of invoice' },
];

const TOKEN_TO_LABEL: Record<string, string> = {
  '{invoiceNumber}': 'Invoice ID',
  '{clientName}': 'Client Name',
  '{orgName}': 'Organisation Name',
  '{dueDate}': 'Due Date',
  '{grandTotal}': 'Grand Total',
};

const TOKEN_TO_ICON: Record<string, string> = {
  '{invoiceNumber}': `<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; flex-shrink: 0;"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M15 16H8"/></svg>`,
  '{clientName}': `<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; flex-shrink: 0;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  '{orgName}': `<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; flex-shrink: 0;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/></svg>`,
  '{dueDate}': `<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; flex-shrink: 0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  '{grandTotal}': `<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; flex-shrink: 0;"><circle cx="8" cy="8" r="6"/><circle cx="18" cy="18" r="4"/><path d="M12 18a6 6 0 0 0-6-6"/></svg>`,
};

/** Generate HTML representation of visual chip pill. */
const tagHtml = (token: string, label: string): string => {
  const icon = TOKEN_TO_ICON[token] || '';
  const closeButton = `
    <span class="remove-tag-btn ml-1.5 text-stone-400 hover:text-red-500 cursor-pointer flex items-center justify-center p-0.5 rounded-full hover:bg-stone-300 transition-colors" style="display: inline-flex; vertical-align: middle;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </span>
  `.trim();
  return `<span class="inline-flex items-center gap-1 bg-stone-200 text-stone-850 pl-2 pr-1 py-0.5 rounded-lg text-xs font-medium select-none mx-0.5 cursor-default border-0" data-token="${token}" contenteditable="false">${icon}<span>${label}</span>${closeButton}</span>`;
};

/** Convert raw placeholder string to HTML containing visual pills. */
const textToHtml = (text: string): string => {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  Object.entries(TOKEN_TO_LABEL).forEach(([token, label]) => {
    const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedToken, 'g');
    html = html.replace(regex, tagHtml(token, label));
  });
  return html;
};

/** Convert editor HTML with visual pills back to raw text. */
const htmlToText = (html: string): string => {
  let cleanHtml = html
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanHtml;

  const spans = tempDiv.querySelectorAll('span[data-token]');
  spans.forEach((span) => {
    const token = span.getAttribute('data-token');
    if (token) {
      span.replaceWith(document.createTextNode(token));
    }
  });

  let text = tempDiv.textContent ?? tempDiv.innerText ?? '';
  
  if (html.startsWith('<div>') && text.startsWith('\n')) {
    text = text.substring(1);
  }
  
  return text;
};

interface TemplatedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}

/**
 * TemplatedInput - An interactive rich-text editor that renders placeholders as styled badges,
 * with slash menu keyboard autocomplete and quick tag insertion buttons.
 */
export const TemplatedInput: React.FC<TemplatedInputProps> = ({
  label,
  value,
  onChange,
  multiline = false,
  rows = 1,
  placeholder = "Type '/' to insert tags...",
}) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const triggerNodeRef = useRef<Node | null>(null);
  const triggerOffsetRef = useRef<number>(-1);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef<string>('');

  const closeMenu = (): void => {
    setShowMenu(false);
    setSearchQuery('');
    triggerNodeRef.current = null;
    triggerOffsetRef.current = -1;
  };

  const filteredTags = AVAILABLE_TAGS.filter(tag =>
    tag.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const updateMenuPosition = (): void => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      
      let left = rect.left - editorRect.left;
      let top = rect.top - editorRect.top;
      
      if (rect.top === 0 && rect.left === 0) {
        left = 8;
        top = 8;
      }
      
      setMenuCoords({ top, left });
    }
  };

  // Sync value from parent to contenteditable innerHTML (only when the parsed text differs to prevent cursor resetting)
  useEffect(() => {
    if (!editorRef.current) return;
    const currentText = htmlToText(editorRef.current.innerHTML);
    if (currentText !== value) {
      const targetHtml = textToHtml(value);
      editorRef.current.innerHTML = targetHtml;
      lastHtmlRef.current = targetHtml;
    }
  }, [value]);

  // Sync coordinates when menu visibility is toggled
  useEffect(() => {
    if (showMenu) {
      updateMenuPosition();
    }
  }, [showMenu]);

  // Handle outside clicks to close the slash menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      if (editorRef.current && editorRef.current.contains(target)) {
        return;
      }
      if (target.closest('.slash-menu-container')) {
        return;
      }
      closeMenu();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /** Delete the '/' and typed search query right before inserting a tag. */
  const deleteTriggerAndQuery = (): void => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !triggerNodeRef.current) return;
    const range = sel.getRangeAt(0);

    range.setStart(triggerNodeRef.current, triggerOffsetRef.current);
    range.deleteContents();
  };

  /** Insert the visual tag at the current caret position. */
  const insertTag = (token: string, labelText: string, replaceSlash: boolean = false): void => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (replaceSlash) {
      deleteTriggerAndQuery();
    }

    const tagHtmlStr = tagHtml(token, labelText) + '&nbsp;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const el = document.createElement('div');
      el.innerHTML = tagHtmlStr;
      const frag = document.createDocumentFragment();
      let node: Node | null;
      let lastInsertedNode: Node | null = null;
      while ((node = el.firstChild)) {
        lastInsertedNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      // Move cursor right after the inserted space node
      if (lastInsertedNode) {
        const nextRange = document.createRange();
        nextRange.setStartAfter(lastInsertedNode);
        nextRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nextRange);
      }
    }

    // Trigger update
    const newText = htmlToText(editorRef.current.innerHTML);
    onChange(newText);
    closeMenu();
  };

  /** Handles key commands when slash menu is open. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (showMenu && filteredTags.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredTags.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredTags.length) % filteredTags.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredTags[selectedIndex];
        if (selected) {
          insertTag(selected.token, selected.label, true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      }
    }
  };

  /** Listens for '/' typing to display tag options. */
  const handleKeyUp = (_e: React.KeyboardEvent<HTMLDivElement>): void => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    const container = range.startContainer;
    const offset = range.startOffset;

    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.nodeValue || '';
      const charBeforeCursor = text.substring(offset - 1, offset);
      if (charBeforeCursor === '/' && !showMenu) {
        // Calculate coords synchronously so it renders at the correct spot on the very first frame
        if (editorRef.current) {
          const rect = range.getBoundingClientRect();
          const editorRect = editorRef.current.getBoundingClientRect();
          let left = rect.left - editorRect.left;
          let top = rect.top - editorRect.top;
          if (rect.top === 0 && rect.left === 0) {
            left = 8;
            top = 8;
          }
          setMenuCoords({ top, left });
        }
        setShowMenu(true);
        setSelectedIndex(0);
        setSearchQuery('');
        triggerNodeRef.current = container;
        triggerOffsetRef.current = offset - 1;
      }
    }

    if (showMenu) {
      if (sel.rangeCount > 0 && triggerNodeRef.current === container) {
        const start = triggerOffsetRef.current;
        if (offset > start && offset <= (container.nodeValue || '').length) {
          const query = (container.nodeValue || '').substring(start + 1, offset);
          if (query.includes(' ')) {
            closeMenu();
          } else {
            setSearchQuery(query);
          }
        } else {
          closeMenu();
        }
      } else {
        closeMenu();
      }
    }
  };

  /** Handle clicks inside the editor to detect clicking the "x" on a tag */
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    const closeBtn = target.closest('.remove-tag-btn');
    if (closeBtn && editorRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const tagSpan = closeBtn.closest('span[data-token]');
      if (tagSpan) {
        tagSpan.remove();
        handleInput();
      }
    }
  };

  /** Handle standard text input changes from editing. */
  const handleInput = (): void => {
    if (editorRef.current) {
      const newText = htmlToText(editorRef.current.innerHTML);
      onChange(newText);
    }
  };

  const isEmpty = !value || value.trim() === '';

  return (
    <div className="flex flex-col gap-1 w-full relative">
      {label && (
        <label className="text-xs font-medium text-stone-500 tracking-wide select-none">
          {label}
        </label>
      )}

      <div className="relative w-full">
        {/* Placeholder overlay */}
        {isEmpty && (
          <div className="absolute left-3 top-2.5 text-stone-300 text-sm pointer-events-none select-none">
            {placeholder}
          </div>
        )}

        {/* ContentEditable editor div styled like standard Input */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleEditorClick}
          style={{ minHeight: multiline ? `${rows * 24 + 16}px` : '38px' }}
          className="w-full px-3 py-2 text-sm text-stone-900 bg-white border border-transparent rounded-xl shadow-1 transition-all duration-150 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 overflow-y-auto outline-none"
        />

        {/* Floating Slash Menu */}
        {showMenu && (
          <div 
            className="slash-menu-container absolute z-50 bg-stone-600/95 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl p-1.5 w-60 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
            style={{ 
              left: `${menuCoords.left}px`, 
              top: `${menuCoords.top}px`,
              transform: 'translateY(-100%) translateY(-8px)'
            }}
          >
            {filteredTags.map((tag, idx) => (
              <button
                key={tag.token}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertTag(tag.token, tag.label, true);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex flex-col text-left px-3 py-1.5 rounded-xl transition-all duration-150
                  ${idx === selectedIndex ? 'bg-white/10 text-white shadow-sm' : 'text-stone-200 hover:bg-white/5'}
                `}
              >
                <span className="text-xs font-normal">{tag.label}</span>
                <span className="text-[10px] text-stone-300/80 mt-0.5">{tag.description}</span>
              </button>
            ))}
            {filteredTags.length === 0 && (
              <div className="px-3 py-2 text-xs text-stone-400 select-none">
                No matching tags
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
