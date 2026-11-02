# Account Utility

Users sign in, upload a `.txt` file of account numbers (one per line), and download an Excel file with 22 extra data points for each account. Admins add and deactivate users.

## Run it

```bash
npm install
npm start
```

Open `http://localhost:4200/`. The development build answers all `/api` calls with an in-browser mock API (`src/app/mock`), so no backend is needed. It generates made-up data.

| Dev account | Email               | Password    |
| ----------- | ------------------- | ----------- |
| Admin       | `admin@example.com` | `Admin123!` |
| User        | `user@example.com`  | `User123!`  |

`npm test` runs the unit tests. `npm run build` makes a production bundle, which excludes the mock and needs the backend below.

## Structure

```
src/app/
  core/       models, auth, route guards, HTTP services, file parsing
  features/
    login/    sign-in page
    shell/    header and navigation for signed-in pages
    process/  upload, job progress, Excel download
    users/    admin-only user management
  mock/       development-only API and sample workbook
```

## Backend contract

The production app expects these endpoints on the same origin. Errors return `{ "message": "..." }`, which the UI displays.

| Method and path                 | Access | Purpose                                                    |
| ------------------------------- | ------ | ---------------------------------------------------------- |
| `POST /api/auth/login`          | Public | `{ email, password }`; sets the session cookie, returns `User` |
| `POST /api/auth/logout`         | User   | Ends the session                                           |
| `GET /api/auth/me`              | User   | Returns the current `User`, or 401                         |
| `GET /api/jobs`                 | User   | The caller's own jobs, newest first, as `AccountJob[]`. The UI shows the first 10 |
| `POST /api/jobs`                | User   | Multipart field `file`; returns the new `AccountJob`       |
| `GET /api/jobs/:id/download`    | Owner  | The `.xlsx` file, once the job is `completed`              |
| `GET /api/users`                | Admin  | Returns `User[]`                                           |
| `POST /api/users`               | Admin  | `NewUser`; returns `User`, or 409 if the email exists      |
| `PATCH /api/users/:id`          | Admin  | `{ active }`; returns `User`                               |

Types are in `src/app/core/models.ts`.

### What the backend must do

- **Enforce all access itself.** The Angular guards only control what is displayed. Every endpoint must check the session and role, and jobs must be limited to their owner.
- **Keep sessions in a cookie** that is `HttpOnly`, `Secure` and `SameSite`. Set an `XSRF-TOKEN` cookie and check the `X-XSRF-TOKEN` header, which Angular sends automatically.
- **Protect credentials.** Hash passwords, rate-limit login, and require users to replace the temporary password an admin sets.
- **Process jobs in the background.** `POST /api/jobs` should return immediately and the worker should update `processedAccounts`. Large files will not fit in one request.
- **Validate uploads again**, using the same rules as `src/app/core/account-file.ts`: size limit, account number format, skipping duplicates, invalid and blank lines.
- **Build the Excel file on the server** with account number plus the 22 data points. Prefix cell values starting with `=`, `+`, `-` or `@` so they cannot run as formulas.
- **Decide on retention and audit logging.** Results contain account data, so set how long files are kept and log who downloaded what.
