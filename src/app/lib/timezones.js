// Comprehensive timezone list with all UTC offsets
// IANA timezone identifiers with human-readable labels

export const timezones = [
  // UTC-12 to UTC-9
  { value: 'Etc/GMT+12', label: 'UTC-12:00 (Baker Island Time)', offset: 'UTC-12' },
  { value: 'Pacific/Midway', label: 'UTC-11:00 (Samoa Standard Time)', offset: 'UTC-11' },
  { value: 'Pacific/Honolulu', label: 'UTC-10:00 (Hawaii Standard Time)', offset: 'UTC-10' },
  { value: 'America/Anchorage', label: 'UTC-9:00 (Alaska Standard Time)', offset: 'UTC-9' },
  
  // UTC-8 to UTC-5 (Americas)
  { value: 'America/Los_Angeles', label: 'UTC-8:00 (Pacific Time - US & Canada)', offset: 'UTC-8' },
  { value: 'America/Denver', label: 'UTC-7:00 (Mountain Time - US & Canada)', offset: 'UTC-7' },
  { value: 'America/Chicago', label: 'UTC-6:00 (Central Time - US & Canada)', offset: 'UTC-6' },
  { value: 'America/New_York', label: 'UTC-5:00 (Eastern Time - US & Canada)', offset: 'UTC-5' },
  { value: 'America/Caracas', label: 'UTC-4:00 (Venezuela Time)', offset: 'UTC-4' },
  { value: 'America/Sao_Paulo', label: 'UTC-3:00 (Brasilia Time)', offset: 'UTC-3' },
  { value: 'Atlantic/South_Georgia', label: 'UTC-2:00 (South Georgia Time)', offset: 'UTC-2' },
  { value: 'Atlantic/Azores', label: 'UTC-1:00 (Azores Time)', offset: 'UTC-1' },
  
  // UTC+0
  { value: 'UTC', label: 'UTC+0:00 (Coordinated Universal Time)', offset: 'UTC+0' },
  { value: 'Europe/London', label: 'UTC+0:00 (Greenwich Mean Time)', offset: 'UTC+0' },
  
  // UTC+1 to UTC+4 (Europe, Africa, Middle East)
  { value: 'Europe/Paris', label: 'UTC+1:00 (Central European Time)', offset: 'UTC+1' },
  { value: 'Europe/Berlin', label: 'UTC+1:00 (Central European Time)', offset: 'UTC+1' },
  { value: 'Africa/Cairo', label: 'UTC+2:00 (Eastern European Time)', offset: 'UTC+2' },
  { value: 'Europe/Moscow', label: 'UTC+3:00 (Moscow Time)', offset: 'UTC+3' },
  { value: 'Asia/Dubai', label: 'UTC+4:00 (Gulf Standard Time)', offset: 'UTC+4' },
  
  // UTC+5 to UTC+6 (Central Asia, South Asia)
  { value: 'Asia/Karachi', label: 'UTC+5:00 (Pakistan Standard Time)', offset: 'UTC+5' },
  { value: 'Asia/Dhaka', label: 'UTC+6:00 (Bangladesh Standard Time)', offset: 'UTC+6' },
  { value: 'Asia/Bangkok', label: 'UTC+7:00 (Indochina Time)', offset: 'UTC+7' },
  
  // UTC+8 to UTC+9 (East Asia)
  { value: 'Asia/Singapore', label: 'UTC+8:00 (Singapore Time)', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'UTC+8:00 (Hong Kong Time)', offset: 'UTC+8' },
  { value: 'Asia/Shanghai', label: 'UTC+8:00 (China Standard Time)', offset: 'UTC+8' },
  { value: 'Asia/Taipei', label: 'UTC+8:00 (Taipei Time)', offset: 'UTC+8' },
  { value: 'Asia/Manila', label: 'UTC+8:00 (Philippine Time)', offset: 'UTC+8' },
  { value: 'Asia/Tokyo', label: 'UTC+9:00 (Japan Standard Time)', offset: 'UTC+9' },
  { value: 'Asia/Seoul', label: 'UTC+9:00 (Korea Standard Time)', offset: 'UTC+9' },
  
  // UTC+10 to UTC+12 (Oceania)
  { value: 'Australia/Sydney', label: 'UTC+10:00 (Australian Eastern Time)', offset: 'UTC+10' },
  { value: 'Australia/Melbourne', label: 'UTC+10:00 (Australian Eastern Time)', offset: 'UTC+10' },
  { value: 'Pacific/Guam', label: 'UTC+10:00 (Chamorro Standard Time)', offset: 'UTC+10' },
  { value: 'Pacific/Auckland', label: 'UTC+12:00 (New Zealand Time)', offset: 'UTC+12' },
  { value: 'Pacific/Fiji', label: 'UTC+12:00 (Fiji Time)', offset: 'UTC+12' },
];

// Group timezones by region for better UX
export const timezonesByRegion = {
  'Americas': [
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: 'UTC-8' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: 'UTC-7' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: 'UTC-6' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: 'UTC-5' },
    { value: 'America/Caracas', label: 'Venezuela Time', offset: 'UTC-4' },
    { value: 'America/Sao_Paulo', label: 'Brasilia Time', offset: 'UTC-3' },
  ],
  'Europe & Africa': [
    { value: 'Europe/London', label: 'London (GMT)', offset: 'UTC+0' },
    { value: 'Europe/Paris', label: 'Paris (CET)', offset: 'UTC+1' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: 'UTC+1' },
    { value: 'Africa/Cairo', label: 'Cairo (EET)', offset: 'UTC+2' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: 'UTC+3' },
  ],
  'Middle East & Central Asia': [
    { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: 'UTC+4' },
    { value: 'Asia/Karachi', label: 'Karachi (PKT)', offset: 'UTC+5' },
    { value: 'Asia/Dhaka', label: 'Dhaka (BST)', offset: 'UTC+6' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: 'UTC+7' },
  ],
  'East Asia & Pacific': [
    { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 'UTC+8' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: 'UTC+8' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: 'UTC+8' },
    { value: 'Asia/Taipei', label: 'Taipei (TST)', offset: 'UTC+8' },
    { value: 'Asia/Manila', label: 'Manila (PHT)', offset: 'UTC+8' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'UTC+9' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: 'UTC+9' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)', offset: 'UTC+10' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)', offset: 'UTC+10' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZDT)', offset: 'UTC+12' },
  ],
  'Other': [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'UTC+0' },
    { value: 'Pacific/Honolulu', label: 'Honolulu (HST)', offset: 'UTC-10' },
    { value: 'America/Anchorage', label: 'Anchorage (AKST)', offset: 'UTC-9' },
  ]
};

// Get timezone offset string (e.g., "UTC+8", "UTC-5")
export function getTimezoneOffset(timezone) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset'
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    
    if (offsetPart) {
      const offset = offsetPart.value;
      // Convert "GMT+8" to "UTC+8" or extract offset
      if (offset.startsWith('GMT')) {
        return offset.replace('GMT', 'UTC');
      }
      return offset;
    }
    
    // Fallback: calculate offset manually
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (tzDate - utcDate) / (1000 * 60);
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    return `UTC${sign}${offsetHours}`;
  } catch {
    return 'UTC+0';
  }
}

// Get current time in a specific timezone
export function getTimeInTimezone(timezone) {
  try {
    return new Date().toLocaleString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }
}

// Format timezone label with current time
export function formatTimezoneLabel(timezone, label) {
  try {
    const offset = getTimezoneOffset(timezone);
    const currentTime = getTimeInTimezone(timezone);
    return `${label} (${offset}) - ${currentTime}`;
  } catch {
    return `${label} (${getTimezoneOffset(timezone)})`;
  }
}

