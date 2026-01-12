
/**
 * Groups messages by time proximity and sender for smart timestamp display
 */
export function groupMessagesByTime(messages) {
  if (messages.length === 0) return [];

  const groups = [];
  const TIME_GROUP_WINDOW = 5 * 60 * 1000; // 5 minutes
  const LARGE_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  for (let i = 0; i < messages.length; i++) {
    const currentMsg = messages[i];
    const prevMsg = messages[i - 1];
    const nextMsg = messages[i + 1];

    const currentTime = parseAsUTC(currentMsg.timestamp);
    const prevTime = prevMsg ? parseAsUTC(prevMsg.timestamp) : null;
    const nextTime = nextMsg ? parseAsUTC(nextMsg.timestamp) : null;

    // Check if this is the start of a new group
    const isNewGroup = !prevMsg ||
      prevMsg.senderId !== currentMsg.senderId ||
      prevMsg.type !== currentMsg.type ||
      (prevTime && currentTime.getTime() - prevTime.getTime() > TIME_GROUP_WINDOW) ||
      !isSameDay(currentTime, prevTime);

    // Check if this is the end of a group
    const isEndOfGroup = !nextMsg ||
      nextMsg.senderId !== currentMsg.senderId ||
      nextMsg.type !== currentMsg.type ||
      (nextTime && nextTime.getTime() - currentTime.getTime() > TIME_GROUP_WINDOW) ||
      !isSameDay(currentTime, nextTime);

    // Determine if we should show timestamp
    const shouldShowTimestamp = isNewGroup ||
      (prevTime && currentTime.getTime() - prevTime.getTime() > LARGE_GAP_THRESHOLD) ||
      !isSameDay(currentTime, prevTime);

    // Check for date boundary
    const shouldShowDateSeparator = !prevMsg || !isSameDay(currentTime, prevTime);

    // Generate time separator text for large gaps within the same day
    let timeSeparatorText;
    if (prevTime && isSameDay(currentTime, prevTime) && (currentTime.getTime() - prevTime.getTime() > LARGE_GAP_THRESHOLD)) {
      timeSeparatorText = formatTimeSeparator(currentTime);
    }

    groups.push({
      messages: [currentMsg],
      isFirstInGroup: isNewGroup,
      isLastInGroup: isEndOfGroup,
      shouldShowTimestamp,
      shouldShowDateSeparator,
      timeSeparatorText
    });
  }

  return groups;
}

/**
 * Checks if two dates are on the same day
 */
function isSameDay(date1, date2) {
  if (!date2) return false;
  return date1.toDateString() === date2.toDateString();
}

/**
 * Helper: Parse timestamp string as UTC
 * Server sends UTC timestamps as ISO strings (ending with 'Z') from TIMESTAMP WITH TIME ZONE columns
 * If string doesn't have timezone, append 'Z' to force UTC interpretation (fallback for legacy data)
 */
function parseAsUTC(input) {
  if (!input) return new Date();

  if (input instanceof Date) {
    return input; // Already a Date object
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // If already has timezone (Z or offset), parse directly
    if (trimmed.endsWith('Z') || trimmed.match(/[+-]\d{2}:?\d{2}$/)) {
      return new Date(trimmed);
    }
    // No timezone - server sends UTC, so append 'Z' to force UTC interpretation
    const normalized = trimmed.replace(/\s+/, 'T');
    return new Date(normalized + 'Z');
  }

  return new Date(input);
}

/**
 * Formats progressive timestamp based on message age
 */
export function formatProgressiveTimestamp(timestamp) {
  const date = parseAsUTC(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time only (24-hour by default)
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } else if (diffDays === 1) {
    // Yesterday
    return 'Yesterday';
  } else if (diffDays < 7) {
    // This week - show day name
    return date.toLocaleDateString([], {
      weekday: 'short'
    });
  } else {
    // Older - show date
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Formats time separator text for large gaps
 */
function formatTimeSeparator(timestamp, is24Hour = true) {
  // Show time-of-day only to avoid repeating date labels like 'Yesterday'
  const date = parseAsUTC(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24Hour
  });
}

/**
 * Formats a compact time-of-day for inline message timestamps (HH:mm)
 * Server timestamps are UTC, converts to browser's local timezone
 */
export function formatTimeOfDay(input, is24Hour = true) {
  // Parse as UTC first (server sends UTC timestamps)
  const date = parseAsUTC(input);

  // Check if date is valid
  if (!date || isNaN(date.getTime())) {
    return '--:--';
  }

  // toLocaleTimeString automatically converts UTC Date to local timezone
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24Hour
  });
}

/**
 * Formats date separator for different dates
 */
export function formatDateSeparator(timestamp) {
  const date = parseAsUTC(timestamp);

  // Check if date is valid
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], {
      weekday: 'long'
    });
  } else {
    return date.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    });
  }
}

/**
 * Gets precise timestamp for hover display
 */
export function getPreciseTimestamp(timestamp, is24Hour = true) {
  const date = parseAsUTC(timestamp);

  // Check if date is valid
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  // toLocaleString automatically converts UTC to local timezone
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !is24Hour
  });
}