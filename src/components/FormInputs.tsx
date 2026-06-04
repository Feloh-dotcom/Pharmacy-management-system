import * as React from "react";
import { LucideIcon } from "lucide-react";

// Standard input props
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ComponentType<any> | React.ReactNode;
  iconPosition?: "left" | "right";
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const renderIcon = (iconInput: any) => {
  if (!iconInput) return null;
  if (React.isValidElement(iconInput)) {
    return iconInput;
  }
  const IconComponent = iconInput;
  return <IconComponent className="w-4 h-4" />;
};

// 1. Regular Input (with forwardRef)
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconPosition = "left",
      containerClassName = "",
      labelClassName = "",
      inputClassName = "",
      className = "",
      type = "text",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-1 select-none ${labelClassName}`}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
              {renderIcon(icon)}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={`w-full text-xs font-semibold text-slate-700 bg-slate-50 border ${
              error
                ? "border-rose-400 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/10 text-rose-900"
                : "border-slate-200 focus:ring-teal-500/10 focus:border-teal-500"
            } ${icon && iconPosition === "left" ? "pl-10" : "pl-3.5" } ${
              icon && iconPosition === "right" ? "pr-10" : "pr-3.5"
            } py-2.5 rounded-xl focus:outline-none focus:ring-2 transition-all duration-150 ${inputClassName} ${className}`}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
              {renderIcon(icon)}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[10px] text-rose-500 font-semibold mt-1 px-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

// 2. Currency Input (with forwardRef)
export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
  currency?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      label,
      error,
      helperText,
      currency = "Ksh.",
      containerClassName = "",
      labelClassName = "",
      inputClassName = "",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-currency-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-1 select-none ${labelClassName}`}
          >
            {label}
          </label>
        )}
        <div
          className={`flex rounded-xl overflow-hidden border bg-slate-50 transition-all duration-150 focus-within:ring-2 focus-within:outline-none ${
            error
              ? "border-rose-400 focus-within:ring-rose-500/10 focus-within:border-rose-500 bg-rose-50/10 text-rose-900"
              : "border-slate-200 focus-within:ring-teal-500/10 focus-within:border-teal-500"
          }`}
        >
          <div className="bg-slate-100 px-3 flex items-center justify-center font-bold text-[10px] text-slate-500 border-r border-slate-200 select-none min-w-[55px] uppercase tracking-wider">
            {currency}
          </div>
          <input
            id={inputId}
            type="number"
            ref={ref}
            className={`w-full text-xs font-mono font-bold text-slate-700 bg-transparent px-3.5 py-2.5 focus:outline-none border-none ${inputClassName} ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-[10px] text-rose-500 font-semibold mt-1 px-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

// 3. Select Component (with forwardRef)
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  options?: Array<{ value: any; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      containerClassName = "",
      labelClassName = "",
      selectClassName = "",
      className = "",
      options,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-1 select-none ${labelClassName}`}
          >
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={`w-full text-xs font-bold text-slate-700 bg-slate-50 border ${
            error
              ? "border-rose-400 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/10 text-rose-900"
              : "border-slate-200 focus:ring-teal-500/10 focus:border-teal-500"
          } px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 transition-all duration-150 cursor-pointer ${selectClassName} ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error ? (
          <p className="text-[10px] text-rose-500 font-semibold mt-1 px-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";

// 4. Textarea Component (with forwardRef)
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      containerClassName = "",
      labelClassName = "",
      textareaClassName = "",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `textarea-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-1 select-none ${labelClassName}`}
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={`w-full text-xs font-semibold text-slate-700 bg-slate-50 border ${
            error
              ? "border-rose-400 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/10 text-rose-900"
              : "border-slate-200 focus:ring-teal-500/10 focus:border-teal-500"
          } px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 transition-all duration-150 ${textareaClassName} ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-[10px] text-rose-500 font-semibold mt-1 px-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// 5. DateInput Component (with forwardRef, inherits Input directly but defaults to type="date" representation)
export const DateInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    return <Input type="date" ref={ref} {...props} />;
  }
);

DateInput.displayName = "DateInput";
