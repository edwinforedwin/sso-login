import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-shell',
  styleUrl: './shell.css',
  templateUrl: './shell.html',
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected signOut(): void {
    const leave = () => {
      this.auth.clear();
      void this.router.navigateByUrl('/login');
    };
    this.auth.logout().subscribe({ next: leave, error: leave });
  }
}
