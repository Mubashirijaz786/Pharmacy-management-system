import React, { useState, useRef, useEffect } from "react";
import { IoChevronDownOutline, IoCheckmarkOutline } from "react-icons/io5";

/**
 * Focus next input helper
 * Moves focus to the next enabled form input in DOM order
 */
export function focusNextInput(currentElement) {
  if (!currentElement) return;
  const form = currentElement.closest("form");
  if (!form) return;

  const focusableSelector =
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"])';
  const elements = Array.from(form.querySelectorAll(focusableSelector));

  const currentIndex = elements.indexOf(currentElement);
  if (currentIndex >= 0 && currentIndex < elements.length - 1) {
    const nextEl = elements[currentIndex + 1];
    setTimeout(() => {
      nextEl.focus();
      try {
        if (typeof nextEl.select === "function") {
          nextEl.select();
        }
      } catch (err) {
        // ignore if not selectable
      }
    }, 15);
  } else if (currentIndex === elements.length - 1) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      setTimeout(() => submitBtn.focus(), 15);
    }
  }
}

/**
 * SearchableCombobox
 * - On Tab / focus: automatically opens the dropdown with filtered options.
 * - Allows typing freely to search options or enter custom values.
 * - Arrow Up / Down navigation, Enter selects option and automatically moves to NEXT input.
 * - Tab directly enters input (skips + New button).
 * - No internal clear/cross button.
 */
export default function SearchableCombobox({
  label,
  value = "",
  onChange,
  options = [],
  placeholder = "Type or select...",
  onAddNew,
  addNewLabel = "+ New",
  className = "",
  id,
  name,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const getOptionText = (opt) =>
    typeof opt === "string" ? opt : (opt.label || opt.name || opt.value || "");

  const getOptionValue = (opt) =>
    typeof opt === "string" ? opt : (opt.value || opt.name || opt.label || "");

  // Options filtering & sorting:
  // If user is actively typing, filter by their query.
  // If not actively typing (just focused/clicked or already selected), show ALL options.
  // In all cases, put the currently selected option at the very TOP so user sees what is selected first!
  const query = (value || "").toLowerCase().trim();

  let displayedOptions = [...options];

  if (isTyping && query) {
    displayedOptions = displayedOptions.filter((opt) =>
      getOptionText(opt).toLowerCase().includes(query)
    );
  }

  // Move selected option to the top if present in displayed options
  if (value) {
    const selectedValLower = String(value).toLowerCase().trim();
    const selectedIdx = displayedOptions.findIndex(
      (opt) => getOptionValue(opt).toLowerCase().trim() === selectedValLower
    );
    if (selectedIdx > 0) {
      const selectedItem = displayedOptions[selectedIdx];
      displayedOptions = [
        selectedItem,
        ...displayedOptions.slice(0, selectedIdx),
        ...displayedOptions.slice(selectedIdx + 1)
      ];
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setIsTyping(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (optionValue, moveNext = true) => {
    const val = getOptionValue(optionValue);
    onChange(val);
    setIsOpen(false);
    setIsTyping(false);
    setHighlightedIndex(-1);
    if (moveNext && inputRef.current) {
      focusNextInput(inputRef.current);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setIsTyping(false);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < displayedOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setIsTyping(false);
        setHighlightedIndex(displayedOptions.length - 1);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : displayedOptions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < displayedOptions.length) {
        handleSelect(displayedOptions[highlightedIndex], true);
      } else if (isOpen && isTyping && query.length > 0 && displayedOptions.length > 0) {
        const exactMatch = displayedOptions.find((opt) =>
          getOptionText(opt).toLowerCase() === query
        );
        handleSelect(exactMatch || displayedOptions[0], true);
      } else {
        setIsOpen(false);
        setIsTyping(false);
        if (inputRef.current) {
          focusNextInput(inputRef.current);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setIsTyping(false);
    } else if (e.key === "Tab") {
      setIsOpen(false);
      setIsTyping(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={id}
            className="text-xs font-semibold text-slate-700 block"
          >
            {label}
          </label>
          {onAddNew && (
            <button
              type="button"
              tabIndex={-1}
              onClick={onAddNew}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              {addNewLabel}
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={handleFocus}
          onClick={() => {
            setIsOpen(true);
            setIsTyping(false);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setIsTyping(true);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 pr-8 text-xs font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
                setIsTyping(false);
              } else {
                inputRef.current?.focus();
                setIsOpen(true);
                setIsTyping(false);
              }
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <IoChevronDownOutline
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isOpen ? "rotate-180 text-slate-700" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Boxy Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-52 overflow-y-auto py-1 text-xs">
          {displayedOptions.length > 0 ? (
            displayedOptions.map((opt, idx) => {
              const optVal = getOptionValue(opt);
              const optLabel = getOptionText(opt);
              const isSelected = String(value).toLowerCase().trim() === String(optVal).toLowerCase().trim();
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`${optVal}-${idx}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(optVal, true);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isHighlighted
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : isSelected
                      ? "bg-slate-50 text-slate-900 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && (
                    <IoCheckmarkOutline className="w-3.5 h-3.5 text-slate-700 flex-shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-slate-400 text-center">
              <p className="text-xs">No exact match found.</p>
              {value.trim() && (
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Press Enter to use "{value.trim()}"
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
