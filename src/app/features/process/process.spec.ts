import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { JobsService } from '../../core/jobs.service';
import { AccountJob } from '../../core/models';
import { Process } from './process';

function jobs(count: number): AccountJob[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    fileName: `file-${index}.txt`,
    status: 'completed',
    totalAccounts: 5,
    processedAccounts: 5,
    createdAt: '2026-11-02T10:00:00.000Z',
  }));
}

describe('Process', () => {
  it('shows only the ten newest jobs', async () => {
    TestBed.configureTestingModule({
      imports: [Process],
      providers: [{ provide: JobsService, useValue: { list: () => of(jobs(12)) } }],
    });
    const fixture = TestBed.createComponent(Process);
    await fixture.whenStable();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(10);
    expect(rows[0].textContent).toContain('file-0.txt');
    expect(rows[9].textContent).toContain('file-9.txt');
  });
});
