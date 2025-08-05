import React, { useState, useEffect, forwardRef } from 'react';
import { parseTimeInput, formatTimeOnBlur } from '../utils/timeUtils';

const TimeInput = forwardRef(({ 
  value, 
  onChange, 
  onBlur, 
  placeholder = "15:00", 
  className = "border px-2 py-1 rounded w-full",
  autoFocus = false,
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = useState(value || '');

  useEffect(() => {
    setDisplayValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Parse and call onChange with formatted time
    const parsed = parseTimeInput(inputValue);
    if (onChange) {
      onChange(parsed);
    }
  };

  const handleBlur = (e) => {
    const formatted = formatTimeOnBlur(displayValue);
    setDisplayValue(formatted);
    
    if (onChange) {
      onChange(formatted);
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      {...props}
    />
  );
});

TimeInput.displayName = 'TimeInput';

export default TimeInput;
