/**
 * Parse time input and format it correctly
 * Examples:
 * 1009 -> 10:09
 * 0234 -> 2:34  
 * 0012 -> 0:12
 * 234 -> 2:34
 * 12 -> 0:12
 */
export const parseTimeInput = (input) => {
  // If input already has colon, return as-is
  if (input.includes(':')) {
    return input;
  }
  
  // Remove any non-digit characters
  const digits = input.replace(/\D/g, '');
  
  if (digits.length === 0) {
    return '';
  }
  
  let minutes, seconds;
  
  if (digits.length <= 2) {
    // 12 -> 0:12
    minutes = 0;
    seconds = parseInt(digits, 10);
  } else if (digits.length === 3) {
    // 234 -> 2:34
    minutes = parseInt(digits[0], 10);
    seconds = parseInt(digits.slice(1), 10);
  } else {
    // 1009 -> 10:09, 0234 -> 2:34
    minutes = parseInt(digits.slice(0, -2), 10);
    seconds = parseInt(digits.slice(-2), 10);
  }
  
  // Validate seconds
  if (seconds >= 60) {
    seconds = 59;
  }
  
  // Format with leading zeros where appropriate
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Format time input on blur/submit
 */
export const formatTimeOnBlur = (input) => {
  const parsed = parseTimeInput(input);
  return parsed;
};

/**
 * Validate time format
 */
export const isValidTime = (timeString) => {
  const timeRegex = /^(\d{1,2}):([0-5]\d)$/;
  return timeRegex.test(timeString);
};
