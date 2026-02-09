# Migration Plan: Firebase to Supabase

This document outlines the steps required to migrate the Acropolis Attendance Management System from Firebase to Supabase.

## 1. Supabase Setup
- Create a new project on [Supabase Dashboard](https://app.supabase.com).
- Copy the `Project URL` and `anon key` to your `.env` file.
- Run the SQL script found in `supabase/schema.sql` in the SQL Editor of your Supabase project.

## 2. Infrastructure Changes
- **Authentication**: Migrate users from Firebase Auth to Supabase Auth.
- **Database**: Port Firestore collections to PostgreSQL tables.
- **Service Layer**: Replace `FirebaseService` with `SupabaseService` in `services/db.ts`.

## 3. Implementation Details

### Dependency Installation
- Install `@supabase/supabase-js`.

### Client Configuration
- Create `services/supabase.ts` to initialize the Supabase client.

### Data Service Mapping
| Feature | Firebase Implementation | Supabase Implementation |
|---------|-------------------------|-------------------------|
| Auth | `firebase/auth` | `@supabase/supabase-js` (Auth) |
| DB | `firebase/firestore` | `@supabase/supabase-js` (PostgREST) |
| Hierarchy | `branches`, `batches` collections | `branches`, `batches` tables |
| Attendance | `attendance` collection | `attendance` table |
| Notifications | `notifications` collection | `notifications` table |

## 4. Migration Steps
1. **Initialize Supabase**: Set up the client and environment variables.
2. **Schema Deployment**: Execute `supabase/schema.sql`.
3. **Service Logic**: Implement `SupabaseService` to satisfy the `IDataService` interface.
4. **Auth Bridge**: Update the login and current user logic to use Supabase sessions.
5. **Data Seeding**: Use the `seedDatabase()` method to populate the initial structure.
6. **Verification**: Test all modules (Admin, Faculty, Student) for correct data fetching and persistent storage.

## 5. Environment Variables
Add the following to your `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
