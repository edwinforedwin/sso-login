import { parseAccountFile } from './account-file';

describe('parseAccountFile', () => {
  it('reads one account per line and handles CRLF, BOM and surrounding spaces', () => {
    const parsed = parseAccountFile('﻿1000001\r\n  1000002  \r\n1000003\r\n');
    expect(parsed.accounts).toEqual(['1000001', '1000002', '1000003']);
    expect(parsed.blankLines).toBe(0);
  });

  it('keeps the first of each duplicate and counts the rest', () => {
    const parsed = parseAccountFile('1000001\n1000002\n1000001\n1000001');
    expect(parsed.accounts).toEqual(['1000001', '1000002']);
    expect(parsed.duplicates).toBe(2);
  });

  it('counts blank lines without treating them as invalid', () => {
    const parsed = parseAccountFile('1000001\n\n   \n1000002\n');
    expect(parsed.blankLines).toBe(2);
    expect(parsed.invalid).toEqual([]);
  });

  it('reports invalid lines with their original line number', () => {
    const parsed = parseAccountFile('1000001\nnot valid!\n12');
    expect(parsed.accounts).toEqual(['1000001']);
    expect(parsed.invalid).toEqual([
      { line: 2, value: 'not valid!' },
      { line: 3, value: '12' },
    ]);
  });

  it('returns nothing for an empty file', () => {
    expect(parseAccountFile('').accounts).toEqual([]);
  });
});
