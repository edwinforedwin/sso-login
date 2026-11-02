import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAX_FILE_BYTES, ParsedAccountFile, parseAccountFile } from '../../core/account-file';
import { apiErrorMessage } from '../../core/api-error';
import { JobsService } from '../../core/jobs.service';
import { AccountJob } from '../../core/models';

const POLL_INTERVAL_MS = 1500;
const RECENT_JOB_LIMIT = 10;

@Component({
  imports: [DatePipe, DecimalPipe],
  selector: 'app-process',
  styleUrl: './process.css',
  templateUrl: './process.html',
})
export class Process implements OnInit {
  private readonly jobsService = inject(JobsService);
  private readonly destroyRef = inject(DestroyRef);
  private pollTimer?: ReturnType<typeof setTimeout>;

  protected readonly selected = signal<{ file: File; parsed: ParsedAccountFile } | null>(null);
  protected readonly fileError = signal('');
  protected readonly dragging = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly jobs = signal<AccountJob[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly downloadError = signal('');
  protected readonly downloadingId = signal<string | null>(null);

  protected readonly recentJobs = computed(() => this.jobs().slice(0, RECENT_JOB_LIMIT));
  protected readonly canProcess = computed(
    () => !this.submitting() && !!this.selected()?.parsed.accounts.length,
  );

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => clearTimeout(this.pollTimer));
    this.refreshJobs();
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so that choosing the same file again still fires a change event.
    input.value = '';
    if (file) {
      void this.selectFile(file);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      void this.selectFile(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected clearSelection(): void {
    this.selected.set(null);
    this.fileError.set('');
    this.submitError.set('');
  }

  protected process(): void {
    const selected = this.selected();
    if (!selected || !this.canProcess()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set('');
    this.jobsService
      .create(selected.file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => {
          this.jobs.update((jobs) => [job, ...jobs]);
          this.selected.set(null);
          this.submitting.set(false);
          this.schedulePoll();
        },
        error: (error: unknown) => {
          this.submitError.set(apiErrorMessage(error, 'The file could not be submitted.'));
          this.submitting.set(false);
        },
      });
  }

  protected download(job: AccountJob): void {
    this.downloadingId.set(job.id);
    this.downloadError.set('');
    this.jobsService
      .download(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.saveFile(blob, `${job.fileName.replace(/\.txt$/i, '')}-results.xlsx`);
          this.downloadingId.set(null);
        },
        error: () => {
          this.downloadError.set(`Could not download the results for ${job.fileName}.`);
          this.downloadingId.set(null);
        },
      });
  }

  protected percent(job: AccountJob): number {
    return job.totalAccounts ? Math.floor((job.processedAccounts / job.totalAccounts) * 100) : 0;
  }

  protected fileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected isActive(job: AccountJob): boolean {
    return job.status === 'queued' || job.status === 'processing';
  }

  private async selectFile(file: File): Promise<void> {
    this.clearSelection();
    if (!file.name.toLowerCase().endsWith('.txt')) {
      this.fileError.set('Choose a .txt file with one account number per line.');
    } else if (file.size > MAX_FILE_BYTES) {
      this.fileError.set('The file is larger than the 10 MB limit.');
    } else {
      try {
        this.selected.set({ file, parsed: parseAccountFile(await file.text()) });
      } catch {
        this.fileError.set('The file could not be read.');
      }
    }
  }

  private refreshJobs(): void {
    this.jobsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.listError.set('');
          this.loading.set(false);
          this.schedulePoll();
        },
        error: () => {
          this.listError.set('Could not refresh your jobs. Retrying if any are still running.');
          this.loading.set(false);
          this.schedulePoll();
        },
      });
  }

  private schedulePoll(): void {
    clearTimeout(this.pollTimer);
    if (this.jobs().some((job) => this.isActive(job))) {
      this.pollTimer = setTimeout(() => this.refreshJobs(), POLL_INTERVAL_MS);
    }
  }

  private saveFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
