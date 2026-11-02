export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Placeholder rule: replace with the real account number format. The backend must apply the same one. */
const ACCOUNT_NUMBER = /^[A-Za-z0-9-]{4,34}$/;

export interface InvalidLine {
  line: number;
  value: string;
}

export interface ParsedAccountFile {
  accounts: string[];
  duplicates: number;
  blankLines: number;
  invalid: InvalidLine[];
}

export function parseAccountFile(text: string): ParsedAccountFile {
  const seen = new Set<string>();
  const result: ParsedAccountFile = { accounts: [], duplicates: 0, blankLines: 0, invalid: [] };

  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  // A trailing newline is normal in a text file and is not a blank entry.
  if (lines.at(-1) === '') {
    lines.pop();
  }

  lines.forEach((raw, index) => {
    const value = raw.trim();
    if (!value) {
      result.blankLines++;
    } else if (!ACCOUNT_NUMBER.test(value)) {
      result.invalid.push({ line: index + 1, value });
    } else if (seen.has(value)) {
      result.duplicates++;
    } else {
      seen.add(value);
      result.accounts.push(value);
    }
  });

  return result;
}
