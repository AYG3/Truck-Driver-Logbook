import { useState, useRef, useEffect, forwardRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  ({ label, error, helperText, options, value = "", onChange, className = "", ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update input value when prop value changes
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    // Filter options based on input
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
      if (highlightedIndex >= 0 && dropdownRef.current) {
        const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: "nearest" });
        }
      }
    }, [highlightedIndex]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsOpen(true);
      setHighlightedIndex(-1);
      onChange?.(newValue);
    };

    const handleOptionClick = (option: ComboboxOption) => {
      setInputValue(option.value);
      onChange?.(option.value);
      setIsOpen(false);
      setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setIsOpen(true);
        return;
      }

      if (isOpen) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setHighlightedIndex(prev =>
              prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
            break;
          case "Enter":
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
              handleOptionClick(filteredOptions[highlightedIndex]);
            } else {
              setIsOpen(false);
            }
            break;
          case "Escape":
            setIsOpen(false);
            setHighlightedIndex(-1);
            break;
        }
      }
    };

    const handleFocus = () => {
      if (inputValue) {
        setIsOpen(true);
      }
    };

    const toggleDropdown = () => {
      setIsOpen(!isOpen);
    };

    return (
      <div ref={containerRef} className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            className={`
              w-full px-3 py-2 pr-10 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${error ? "border-red-500" : "border-gray-300"}
              ${className}
            `}
            autoComplete="off"
            {...props}
          />
          <button
            type="button"
            onClick={toggleDropdown}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            <ChevronDownIcon
              className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Dropdown */}
        {isOpen && filteredOptions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option)}
                className={`
                  px-3 py-2 cursor-pointer transition-colors
                  ${index === highlightedIndex ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}
                  ${option.value === value ? "bg-blue-100 text-blue-700 font-medium" : ""}
                `}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Combobox.displayName = "Combobox";
