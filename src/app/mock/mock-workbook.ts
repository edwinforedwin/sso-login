/** Placeholder columns and made-up values. The real 22 data points belong to the backend. */
const FIELDS: { header: string; value: (seed: number) => string | number }[] = [
  { header: 'Account Holder', value: (s) => pick(['A. Sample', 'B. Example', 'C. Test'], s) },
  { header: 'Account Type', value: (s) => pick(['Savings', 'Current', 'Term Deposit'], s) },
  { header: 'Account Status', value: (s) => pick(['Active', 'Dormant', 'Closed'], s) },
  { header: 'Branch Code', value: (s) => `BR${100 + (s % 50)}` },
  { header: 'Branch Name', value: (s) => pick(['North', 'Central', 'South'], s) },
  { header: 'Currency', value: (s) => pick(['USD', 'GBP', 'EUR'], s) },
  { header: 'Current Balance', value: (s) => (s % 1000000) / 100 },
  { header: 'Available Balance', value: (s) => (s % 900000) / 100 },
  { header: 'Opening Date', value: (s) => sampleDate(2005, s) },
  { header: 'Last Transaction Date', value: (s) => sampleDate(2025, s) },
  { header: 'Customer ID', value: (s) => `CUST${s % 1000000}` },
  { header: 'Email', value: (s) => `customer${s % 10000}@example.com` },
  { header: 'Phone', value: (s) => `+1-555-01${String(s % 100).padStart(2, '0')}` },
  { header: 'Address', value: (s) => `${(s % 900) + 1} Sample Street` },
  { header: 'City', value: (s) => pick(['Springfield', 'Riverton', 'Fairview'], s) },
  { header: 'Postal Code', value: (s) => String(10000 + (s % 89999)) },
  { header: 'Country', value: (s) => pick(['United States', 'United Kingdom'], s) },
  { header: 'Product Code', value: (s) => `P${s % 40}` },
  { header: 'Interest Rate', value: (s) => (s % 800) / 100 },
  { header: 'Credit Limit', value: (s) => (s % 50) * 1000 },
  { header: 'Risk Rating', value: (s) => pick(['Low', 'Medium', 'High'], s) },
  { header: 'KYC Status', value: (s) => pick(['Verified', 'Pending', 'Expired'], s) },
];

function pick<T>(options: T[], seed: number): T {
  return options[seed % options.length];
}

function sampleDate(startYear: number, seed: number): string {
  const month = String((seed % 12) + 1).padStart(2, '0');
  const day = String((seed % 28) + 1).padStart(2, '0');
  return `${startYear + (seed % 2)}-${month}-${day}`;
}

function hash(value: string): number {
  let result = 7;
  for (const char of value) {
    result = (result * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return result;
}

export async function buildMockWorkbook(accounts: string[]): Promise<Blob> {
  const module = await import('exceljs');
  const ExcelJS = module.default ?? module;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('SAMPLE DATA', { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.addRow(['Account Number', ...FIELDS.map((field) => field.header)]);
  sheet.getRow(1).font = { bold: true };
  for (const account of accounts) {
    const seed = hash(account);
    // Vary the seed per column so values do not all follow the same pattern.
    sheet.addRow([account, ...FIELDS.map((field, index) => field.value(seed + index * 7919))]);
  }
  sheet.columns.forEach((column) => (column.width = 20));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
