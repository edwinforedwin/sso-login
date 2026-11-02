import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountJob } from './models';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);

  list(): Observable<AccountJob[]> {
    return this.http.get<AccountJob[]>('/api/jobs');
  }

  create(file: File): Observable<AccountJob> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<AccountJob>('/api/jobs', body);
  }

  download(jobId: string): Observable<Blob> {
    return this.http.get(`/api/jobs/${encodeURIComponent(jobId)}/download`, {
      responseType: 'blob',
    });
  }
}
