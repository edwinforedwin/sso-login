import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { User, UserRole } from '../../core/models';
import { UsersService } from '../../core/users.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-users',
  styleUrl: './users.css',
  templateUrl: './users.html',
})
export class Users implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['user' as UserRole, Validators.required],
    temporaryPassword: ['', [Validators.required, Validators.minLength(12)]],
  });
  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal('');
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly added = signal('');
  protected readonly updatingId = signal<string | null>(null);

  ngOnInit(): void {
    this.usersService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.listError.set(apiErrorMessage(error, 'Could not load users.'));
          this.loading.set(false);
        },
      });
  }

  protected addUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.added.set('');
    this.usersService
      .create(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.users.update((users) => [...users, user]);
          this.added.set(`${user.name} can now sign in with the temporary password you set.`);
          this.form.reset();
          this.saving.set(false);
        },
        error: (error: unknown) => {
          this.formError.set(apiErrorMessage(error, 'Could not add this user.'));
          this.saving.set(false);
        },
      });
  }

  protected toggleActive(user: User): void {
    this.updatingId.set(user.id);
    this.listError.set('');
    this.usersService
      .setActive(user.id, !user.active)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.users.update((users) => users.map((u) => (u.id === updated.id ? updated : u)));
          this.updatingId.set(null);
        },
        error: (error: unknown) => {
          this.listError.set(apiErrorMessage(error, `Could not update ${user.name}.`));
          this.updatingId.set(null);
        },
      });
  }
}
