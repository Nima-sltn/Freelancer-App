# API contract

Everything the client expects from the backend, and exactly how much of it the
**demo transport** reproduces. If you change a URL, change it in the service
*and* in this table *and* (for demo mode) in `src/mocks/adapter.ts`.

Conventions that hold for every endpoint:

- base URL from `VITE_API_URL` (same-origin `/api` behind the dev proxy);
- success payloads are wrapped in `{ statusCode, data }`; `src/lib/http`
  unwraps them so services return the payload type directly;
- cookies carry the session (`withCredentials: true`); the first 401 triggers a
  single-flight `GET /user/refresh-token` and replays the request;
- errors arrive as `{ statusCode, message }` and are normalised into one
  `ApiError` with a `kind` — components never read `error.response.data`;
- list query params serialise arrays comma-joined (`?tags=a,b,c`), which is what
  the Express controllers parse.

---

## Authentication & profile — `services/authService.ts`

| Method | Path | Body / notes | Demo |
| --- | --- | --- | --- |
| POST | `/user/get-otp` | `{ phoneNumber }` → echoes the code (demo: `111111`) | ✅ |
| POST | `/user/check-otp` | `{ phoneNumber, otp }` → session + user | ✅ |
| POST | `/user/complete-profile` | `{ name, email, role }` → sets role, status = 1 | ✅ |
| GET | `/user/profile` | current user | ✅ |
| PATCH | `/user/update` | partial profile | ✅ |
| POST | `/user/logout` | clears the session | ✅ |
| GET | `/user/refresh-token` | silent refresh (never auth-free, single flight) | ✅ |

A `status = 1` user is routed to `/pending-approval` by
`app/guards/ProtectedRoute`; verification is an admin action below.

## Projects — `services/projectService.ts`

| Method | Path | Notes | Demo |
| --- | --- | --- | --- |
| GET | `/project/list` | filters: search, category, status, sort, paging | ✅ |
| GET | `/project/owner-projects` | owner-scoped, requires session | ✅ |
| GET | `/project/:id` | detail (404 for unknown ids) | ✅ |
| POST | `/project/add` | create; validation error **before** mutation | ✅ |
| PATCH | `/project/update/:id` | edit | ✅ |
| PATCH | `/project/:id` | `{ status }` open/close | ✅ |
| DELETE | `/project/:id` | delete | ✅ |

## Proposals — `services/proposalService.ts`

| Method | Path | Notes | Demo |
| --- | --- | --- | --- |
| GET | `/proposal/list` | `sort=latest\|earliest`; freelancers receive only their own | ✅ |
| GET | `/proposal/:id` | detail | ✅ |
| POST | `/proposal/add` | submit a bid (owner cannot bid on their own project) | ✅ |
| PATCH | `/proposal/:id` | `{ projectId, status }` review decision: 0/1/2 | ✅ |

## Categories — `services/categoryService.ts`

| Method | Path | Notes | Demo |
| --- | --- | --- | --- |
| GET | `/category/list` | includes derived `openProjects` / `averageBudget` | ✅ |
| GET | `/category/:id` | detail | ✅ |
| POST | `/admin/category/add` | admin only (403 otherwise) | ✅ |
| PATCH | `/admin/category/update/:id` | admin only | ✅ |
| DELETE | `/admin/category/remove/:id` | admin only | ✅ |

## Users (admin) — `services/userService.ts`

| Method | Path | Notes | Demo |
| --- | --- | --- | --- |
| GET | `/admin/user/list` | admin only | ✅ |
| GET | `/admin/user/profile/:userId` | admin only | ✅ |
| PATCH | `/admin/user/verify/:userId` | `{ status: 0 \| 1 \| 2 }`, rejects invalid values | ✅ |

**Coverage: 26 of 26 routes** the client calls are implemented by the demo
adapter, including envelope, 401/403/404 semantics, per-role scoping and
validation-before-mutation. What demo mode does *not* try to model: real
cookies/JWT expiry, rate limits, and file uploads (there are none).

---

## Demo transport

```
VITE_API_MODE=mock
 ├─ mocks/adapter.ts     route table + auth rules  (contract tests: adapter.test.ts)
 ├─ mocks/data.ts        deterministic seed (4 users, 6 categories, 12 projects, …)
 ├─ mocks/db.ts          persists mutations to localStorage, ?demo=reset restores
 └─ mocks/install.ts     composition root: installs the adapter on both axios
                         instances before the first render (see DECISIONS.md #4)
```

Because the adapter sits *under* axios, services, hooks and components are
byte-for-byte identical between demo and live mode — the only difference is who
answers the request. The adapter is a dynamic import, so it never lands in the
live bundle.

## Adding an endpoint

1. Add the typed function to `services/<resource>.ts` (thin: URL + type only).
2. Add its key to `config/queryKeys.ts` if the result is cached.
3. Add the route to `mocks/adapter.ts` **with the same status codes**, so demo
   mode keeps exercising the real error paths.
4. Cover it in `src/mocks/adapter.test.ts` (happy path + one refusal).
5. Update the table above.
