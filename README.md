# miniSocial

A full-stack social application built with React, TypeScript, Bun, Express, Prisma, and PostgreSQL.

The project focuses on authentication, authorization, relational data modeling, REST APIs, request validation, and client-server communication.

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Bun
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JSON Web Tokens (JWT)
- Zod
- CORS

---

## Architecture

```text
                    ┌─────────────────────┐
                    │      React FE       │
                    │     TypeScript      │
                    └──────────┬──────────┘
                               │
                          HTTP / REST
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Express API      │
                    │      Bun Runtime     │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
             Zod           JWT Auth        Prisma
          Validation     Authorization       ORM
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │   PostgreSQL    │
                                      └─────────────────┘
```

The frontend communicates with the backend through REST APIs.

The backend is responsible for:

- Request validation
- Authentication
- Authorization
- Database access
- Ownership checks
- Business logic

The frontend is responsible for:

- Authentication state
- API communication
- Rendering posts and comments
- Client-side state management
- User interaction

---

## Project Structure

```text
miniSocial/
│
├── be/
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── ...
│   │   ├── auth.ts
│   │   └── error.ts
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── fe/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── ...
│   │
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

# Backend

## Authentication

Authentication uses JSON Web Tokens (JWT).

During login, the backend:

1. Validates the request using Zod.
2. Finds the user in PostgreSQL.
3. Verifies the supplied password against the stored hash.
4. Generates a signed JWT containing the user's ID.
5. Returns the JWT to the client.

```text
POST /login

        │
        ▼
Validate request
        │
        ▼
Find user
        │
        ▼
Verify password
        │
        ▼
Generate JWT
        │
        ▼
Return token
```

Protected endpoints require:

```http
Authorization: Bearer <token>
```

The authentication middleware verifies the token and attaches the authenticated user's ID to the Express request.

---

## Password Security

Passwords are never stored in plaintext.

During signup:

```text
plaintext password
        │
        ▼
Bun.password.hash()
        │
        ▼
hashed password
        │
        ▼
PostgreSQL
```

During login, the supplied password is verified against the stored hash.

---

## Request Validation

Zod is used to validate incoming request bodies before database operations are performed.

Example:

```ts
const postSchema = z.object({
    content: z.string().min(1).max(500)
});
```

Invalid requests are rejected before reaching the database layer.

---

## Authorization

Authentication and authorization are treated separately.

Authentication determines:

> Who is making the request?

Authorization determines:

> Is this user allowed to perform this operation?

For example, updating a post performs an ownership check:

```ts
if (post.authorId !== userId) {
    return res.status(403).json({
        message: "You don't own this post"
    });
}
```

The same principle is applied to deleting posts and comments.

The backend remains the final authority for authorization. Frontend ownership checks are only used to control the UI.

---

# Database

PostgreSQL is used as the persistent data store.

Prisma provides the ORM layer between the TypeScript backend and PostgreSQL.

The core relational model consists of users, posts, comments, and likes.

```text
User
 │
 ├───────────────┐
 │               │
 ▼               ▼
Post           Comment
 │               │
 │               │
 └──────┬────────┘
        │
        ▼
      Like
```

Posts reference their author through `authorId`.

Comments reference:

- their author
- the post they belong to

Likes associate users with posts.

These relationships allow the backend to enforce resource ownership.

---

# REST API

## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/signup` | Create a user |
| POST | `/login` | Authenticate a user |

## Posts

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/post` | Create a post |
| GET | `/posts` | Retrieve posts |
| GET | `/post/:id` | Retrieve a single post |
| PATCH | `/post/:id` | Update a post |
| DELETE | `/post/:id` | Delete a post |

## Comments

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/post/:id/comment` | Create a comment |
| GET | `/post/:id/comments` | Retrieve comments |
| DELETE | `/comment/:id` | Delete a comment |

## Likes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/post/:id/like` | Like a post |
| DELETE | `/post/:id/like` | Unlike a post |

Protected endpoints require a valid JWT.

---

# API Request Flow

```text
React
  │
  │ Authorization: Bearer <JWT>
  ▼
Express
  │
  ▼
Authentication Middleware
  │
  ├── Invalid token ──► Authentication failure
  │
  ▼
Zod Validation
  │
  ├── Invalid input ──► Validation failure
  │
  ▼
Authorization / Ownership Check
  │
  ├── Unauthorized ──► Authorization failure
  │
  ▼
Prisma
  │
  ▼
PostgreSQL
  │
  ▼
JSON Response
  │
  ▼
React
```

---

# Error Handling

The API uses HTTP status codes to distinguish different classes of failure.

```text
400 → Invalid request / validation failure
401 → Authentication failure
403 → Authorization failure
404 → Resource not found
409 → Resource conflict
500 → Unexpected server error
```

The backend also uses a centralized Express error handler for unexpected errors.

---

# Frontend

The React application communicates with the REST API using `fetch`.

Authentication state is maintained using the JWT stored in `localStorage`.

The frontend decodes the user ID from the JWT to determine which client-side controls should be displayed.

For example:

```text
Post belongs to current user
        │
        ▼
Show Edit / Delete controls
```

These checks are not security boundaries.

The backend independently verifies ownership before performing mutating operations.

---

# Environment Variables

## Backend

```env
DATABASE_URL=
JWT_SECRET=
PORT=3000
FRONTEND_URL=
```

## Frontend

```env
VITE_API_URL=http://localhost:3000
```

Actual `.env` files are excluded from version control.

See the corresponding `.env.example` files for the required variables.

---

# Local Development

## Backend

```bash
cd be
bun install
```

Configure the required environment variables and database connection, then run the backend using the project's configured development script.

## Frontend

```bash
cd fe
bun install
bun run dev
```

The Vite development server runs on:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:3000
```

---

# Testing

The backend was tested against authenticated and unauthenticated request flows, including:

- Invalid signup input
- Invalid login input
- Incorrect credentials
- Missing JWT
- Invalid JWT
- Post ownership
- Comment ownership
- Missing resources
- Duplicate likes
- Removing likes
- Invalid post input
- Invalid comment input
- Post CRUD operations
- Comment CRUD operations
- Like and unlike operations

---

# Design Considerations

## Authentication vs Authorization

JWT authentication establishes the identity associated with a request.

Resource ownership checks establish whether that identity is allowed to perform a mutation.

## Validation Boundary

Input is validated at the HTTP boundary before reaching the database layer.

## Client vs Server Trust

The frontend is treated as untrusted.

UI-level checks improve the user experience, but all security-sensitive authorization decisions are performed by the backend.

## Relational Data Modeling

Users, posts, comments, and likes are modeled as related PostgreSQL entities.

Prisma provides typed access to these relationships from the TypeScript backend.

---

# Future Improvements

- Pagination for posts and comments
- Rate limiting
- Refresh-token based authentication
- Improved API error types
- Automated integration tests
- Dockerized development environment
- CI/CD pipeline
- Production deployment
- API documentation