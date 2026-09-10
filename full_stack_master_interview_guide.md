# 📖 Scratch & Win — Master Full-Stack Architecture & Interview Guide

This guide is an exhaustive, production-grade reference for the entire Scratch & Win application. It breaks down every single architectural layer, technical concept, keyword, database schema, algorithm, and interview question spanning **Backend (NestJS)**, **Database (Prisma Next & PostgreSQL)**, and **Frontend (ReactJS & Next.js)**.

---

## 📑 Table of Contents
1. [Executive System Overview & Architecture Diagram](#1-executive-system-overview--architecture-diagram)
2. [Master Glossary & Technical Vocabulary (Every Term Explained)](#2-master-glossary--technical-vocabulary)
3. [Layer-by-Layer Architectural Deep Dive](#3-layer-by-layer-architectural-deep-dive)
4. [The Mathematics of the Lottery Game Engine](#4-the-mathematics-of-the-lottery-game-engine)
5. [Real-World Retail & Shopping Mall Operations](#5-real-world-retail--shopping-mall-operations)
6. [25+ Technical Interview Questions & Comprehensive Answers](#6-25-technical-interview-questions--comprehensive-answers)

---

## 1. Executive System Overview & Architecture Diagram

The **Scratch & Win Platform** is a full-stack, enterprise-grade promotional lottery application. It is engineered to allow store administrators to manage prize pools, issue unique scratch cards to customers, execute a weighted probability lottery algorithm, and render interactive 60fps HTML5 Canvas scratch cards on mobile devices.

```text
 +-----------------------------------------------------------------------------------+
 |                               FRONTEND CLIENT LAYER                               |
 |                                                                                   |
 |   [ Vanilla JS Web App (public/) ]   OR   [ Next.js React App (frontend/) ]     |
 |   • HTML5 Canvas 2D Engine (destination-out scratch physics)                     |
 |   • React AuthContext (localStorage JWT management)                               |
 |   • Tabbed Navigation: My Cards Wallet | Leaderboard | Admin Control Panel       |
 +----------------------------------------┬------------------------------------------+
                                          │
                                          │ HTTP / REST API (CORS Enabled)
                                          ▼
 +-----------------------------------------------------------------------------------+
 |                                BACKEND API LAYER                                  |
 |                                                                                   |
 |                              [ NestJS Framework ]                                 |
 |   • AuthModule        : JWT Strategy, Bcrypt Hashing, Passport, ValidationPipe    |
 |   • PrizesModule      : Admin Prize CRUD, Stock Caps, DTO Sanitization            |
 |   • CardsModule       : Game Engine, Crypto Code Generator, Double-Scratch Guard |
 |   • AnalyticsModule  : Leaderboard Aggregation, Win History, Cashier Redemption  |
 +----------------------------------------┬------------------------------------------+
                                          │
                                          │ Prisma Next SQL ORM
                                          ▼
 +-----------------------------------------------------------------------------------+
 |                              DATABASE STORAGE LAYER                               |
 |                                                                                   |
 |                           [ PostgreSQL Database ]                                 |
 |   • User           : User Accounts, Roles (USER/ADMIN), Password Hashes, Phone   |
 |   • Prize          : Title, Amount, Probability Weight, Inventory Stock Caps      |
 |   • ScratchCard    : Unique Code, User Foreign Key, Status (UNSCRATCHED/SCRATCHED)|
 |   • ScratchResult  : @unique ScratchCardId, Winner Prize FK, Redemption Status   |
 +-----------------------------------------------------------------------------------+
```

---

## 2. Master Glossary & Technical Vocabulary

### A. Backend & NestJS Terminology

- **NestJS**: A progressive Node.js framework for building efficient, reliable, and scalable server-side applications, built with TypeScript and utilizing Object-Oriented and Functional Reactive Programming concepts.
- **Module (`@Module`)**: A class annotated with a `@Module()` decorator that provides metadata NestJS uses to organize the application structure into cohesive feature blocks (`AuthModule`, `PrizesModule`, `CardsModule`).
- **Controller (`@Controller`)**: Decorator defining incoming HTTP request handlers and route mapping (e.g., `@Controller('prizes')` maps to `/prizes`).
- **Injectable / Service (`@Injectable`)**: Classes that handle business logic and database access. NestJS injects them into controllers via Dependency Injection.
- **Dependency Injection (DI)**: A design pattern where an object receives its dependencies from an external framework (NestJS IoC Container) rather than instantiating them internally using `new`.
- **Inversion of Control (IoC) Container**: The core NestJS runtime engine that manages class instantiation, lifecycle hooks, and dependency resolution.
- **Guard (`CanActivate`)**: Classes that determine whether a request should be handled by a route handler based on conditions (e.g. valid JWT token, admin role).
- **Reflector**: A NestJS utility class used to inspect custom metadata attached to route handlers (e.g. retrieving required roles specified by `@Roles('ADMIN')`).
- **ValidationPipe**: A NestJS pipe that executes input validation on HTTP request bodies using `class-validator` decorators before passing data to controller handlers.
- **Whitelist (`whitelist: true`)**: A security configuration setting in `ValidationPipe` that automatically strips away any JSON property from an incoming payload that is NOT declared in the DTO class (prevents Mass Assignment Attacks).
- **Transform (`transform: true`)**: Automatically converts plain incoming JavaScript objects into instances of their respective DTO classes and parses string parameters to numbers.
- **DTO (Data Transfer Object)**: A TypeScript class that defines the exact shape, schema, and validation rules of data sent over the network.
- **Mass Assignment Attack**: A vulnerability where an attacker sends uninvited parameters in an HTTP request (such as `role: "ADMIN"`) hoping the server updates restricted database columns.
- **CORS (Cross-Origin Resource Sharing)**: A browser security mechanism that restricts web pages from making HTTP requests to a different domain/port than the one that served the page (`app.enableCors()` allows port 3000 to talk to port 4000).

---

### B. Authentication & Security Terminology

- **JWT (JSON Web Token)**: RFC 7519 standard defining a compact, URL-safe container for securely transmitting information between parties as a JSON object signed cryptographically.
- **JWT Header**: First part of a JWT containing metadata about the token (token type `JWT` and signing algorithm e.g. `HS256`).
- **JWT Payload**: Second part containing claimed statements about the entity (e.g. `sub` for User ID, `email`, `role`, and expiration timestamp).
- **JWT Signature**: Third part generated by hashing `Header + Payload` with a secret server key (`JWT_SECRET`). Guarantees the payload has not been tampered with.
- **Subject (`sub`)**: Standard JWT RFC 7519 claim field representing the unique identifier (Primary Key ID) of the authenticated principal.
- **Stateless Authentication**: An authentication model where the server does NOT store session IDs in database/memory. The server verifies identity solely by validating the cryptographic signature of incoming JWT tokens.
- **Bearer Token**: An HTTP authentication scheme where the client passes the JWT in the HTTP Authorization header: `Authorization: Bearer <TOKEN>`.
- **Bcrypt**: A password-hashing function based on the Blowfish cipher that incorporates a salt to protect against rainbow table attacks and key stretching to prevent brute-force attacks.
- **Salt Rounds**: The cost factor determining how many iterations ($2^{\text{cost}}$) the bcrypt hashing algorithm executes (e.g., $2^{10} = 1024$ rounds for `saltRounds = 10`).
- **Rainbow Table Attack**: A pre-computed dictionary attack looking up pre-calculated hashes of common passwords. Salting makes rainbow tables useless because every hashed password has a unique random salt prepended.
- **Timing Attack**: A side-channel attack where an attacker measures the exact time a server takes to process password string comparisons. `bcrypt.compare()` uses constant-time execution to prevent timing leaks.
- **RBAC (Role-Based Access Control)**: An authorization approach that restricts system access based on user roles (`USER` vs `ADMIN`).

---

### C. Database & Prisma Next Terminology

- **PostgreSQL**: A powerful, open-source object-relational database system (RDBMS) known for reliability, feature robustness, and ACID compliance.
- **ACID Properties**: 
  - **Atomicity**: All operations in a database transaction complete successfully, or all are rolled back.
  - **Consistency**: Database transitions cleanly from one valid state to another.
  - **Isolation**: Concurrent transactions execute independently without interfering with each other.
  - **Durability**: Committed data is permanently saved in non-volatile storage even after a power crash.
- **Prisma Next ORM**: A next-generation TypeScript database ORM allowing fully type-safe queries against PostgreSQL models defined in a data contract.
- **Data Contract (`contract.prisma`)**: The single source of truth schema file defining database models, fields, types, default values, and relational foreign keys.
- **`contract.json` & `contract.d.ts`**: Generated compilation artifacts that power runtime query execution and full IDE TypeScript autocomplete.
- **`@id` & `@default(autoincrement())`**: Denotes a model's Primary Key column that automatically increments sequentially (1, 2, 3...).
- **`@unique`**: Database constraint guaranteeing that no two rows can contain duplicate values in a column (e.g. `User.email`, `ScratchCard.code`, `ScratchResult.scratchCardId`).
- **`@relation`**: Defines foreign key relationships between tables (e.g., `ScratchCard` belongs to `User`).
- **`onDelete: Cascade`**: Foreign key integrity rule ensuring that if a `User` is deleted, all their associated `ScratchCard` and `ScratchResult` records are automatically removed.

---

### D. Frontend & Graphics Terminology

- **HTML5 Canvas 2D API**: A standard HTML element (`<canvas>`) and JavaScript drawing context (`getContext('2d')`) used for rendering 2D shapes, gradients, images, and pixel manipulation.
- **`globalCompositeOperation = 'destination-out'`**: A canvas compositing mode where new drawn shapes erase existing pixels, making the touched area transparent. This powers the interactive scratch-off effect.
- **Pixel Data Sampling (`ctx.getImageData`)**: Retrieves the underlying RGBA pixel array from a canvas region. Counting transparent pixels ($\text{alpha} = 0$) allows calculating the percentage of foil scratched off.
- **`useRef()`**: A React Hook that persists a mutable reference value across re-renders without triggering a re-render. Used to hold a direct reference to the `<canvas>` DOM node.
- **`useState()`**: A React Hook that declares a state variable and updater function to preserve component data across renders.
- **`useEffect()`**: A React Hook that executes side effects (such as DOM updates, API fetching, or canvas initialization) in response to component lifecycle events or dependency changes.
- **`useContext()`**: A React Hook used to consume shared global state (like `AuthContext`) without prop-drilling through nested components.
- **Single Page Application (SPA)**: A web application that loads a single HTML page and dynamically updates content as the user interacts with the app, without requiring full page reloads.
- **Glassmorphism UI**: A modern design aesthetic featuring semi-transparent frosted-glass containers created using CSS `backdrop-filter: blur()`, subtle borders, and rich dark gradient backgrounds.

---

## 3. Layer-by-Layer Architectural Deep Dive

### A. The Authentication & Authorization Pipeline

1. **User Registration (`POST /auth/register`)**:
   - Accepts `RegisterDto` payload (`email`, `password`, `name`, `phone`).
   - `ValidationPipe` validates type constraints and strips undeclared parameters.
   - Checks if user email exists via `User.where({ email }).first()`.
   - Hashes plain password using `bcrypt.hash(password, 10)`.
   - Creates new row in PostgreSQL with `role: "USER"`.
   - Signs JWT payload containing `{ sub: user.id, email, role }` and returns token.

2. **User Login (`POST /auth/login`)**:
   - Accepts `LoginDto` payload (`email`, `password`).
   - Queries database for user by email.
   - Executes `bcrypt.compare(password, user.password)`. If invalid, throws `401 Unauthorized`.
   - Generates signed JWT token and returns user details.

3. **Guarded Route Verification (`JwtAuthGuard` & `JwtStrategy`)**:
   - Client sends HTTP header: `Authorization: Bearer <TOKEN>`.
   - Passport strategy extracts token and verifies signature using `JWT_SECRET`.
   - If token is missing, expired, or invalid, Passport returns `401 Unauthorized`.
   - Strategy passes decoded payload to `validate(payload)` which attaches user object to `request.user`.

4. **Role Enforcement (`RolesGuard` & `@Roles('ADMIN')`)**:
   - Route handlers annotated with `@Roles('ADMIN')` instruct `RolesGuard` to check `request.user.role`.
   - `Reflector` extracts required roles. If `request.user.role !== 'ADMIN'`, throws `403 Forbidden`.

---

### B. Prize Pool Management (Admin CRUD)

- **Create Prize (`POST /prizes`)**: Restricted to `ADMIN`. Accepts `title`, `amount`, `probability` weight, and `totalQuantity`. Sets `remainingQuantity = totalQuantity`.
- **Read Prizes (`GET /prizes`)**: Returns list of all active prizes.
- **Update Prize (`PATCH /prizes/:id`)**: Restricted to `ADMIN`. Allows modifying title, amount, probability, or restocking quantities.
- **Delete Prize (`DELETE /prizes/:id`)**: Restricted to `ADMIN`. Deletes prize record.

---

### C. Scratch Cards & Game Engine

- **Card Issuance (`POST /cards/issue`)**: Restricted to `ADMIN`. Generates cryptographically secure 12-character uppercase code (`crypto.randomBytes`) e.g. `CARD-9A2F-8K3L` assigned to a `userId`. Generates a printable receipt QR Code URL (`https://api.qrserver.com/...`).
- **User Wallet (`GET /cards/my-cards`)**: Returns all scratch cards assigned to the authenticated user.
- **Scratch Execution (`POST /cards/:code/scratch`)**:
  - **Ownership Check**: Verifies `card.userId === request.user.userId`. Throws `403 Forbidden` if mismatched.
  - **Double-Scratch Check**: Verifies `card.status === 'UNSCRATCHED'`. Throws `400 Bad Request` if scratched.
  - Executes **Weighted Lottery Algorithm** (detailed in Section 4).
  - Decrements prize `remainingQuantity` if won.
  - Inserts immutable `ScratchResult` row (`scratchCardId`, `userId`, `prizeId`, `prizeAmount`, `isRedeemed: false`).
  - Updates `ScratchCard` status to `'SCRATCHED'`.

---

### D. Real-Time Analytics & Cashier Redemption

- **Leaderboard (`GET /analytics/leaderboard`)**: Aggregates total `prizeAmount` won per user and returns players ranked descending by total cash won.
- **Admin System Stats (`GET /analytics/admin-stats`)**: Restricted to `ADMIN`. Returns total users, cards issued, cards scratched/unscratched, and total cash distributed.
- **Cashier Prize Redemption (`POST /cards/redeem/:resultId`)**: Restricted to `ADMIN` / Cashier. Updates `ScratchResult.isRedeemed = true` and records timestamp `redeemedAt`. Prevents customer screenshot fraud.

---

## 4. The Mathematics of the Lottery Game Engine

The game engine utilizes a **Dynamic Cumulative Weighted Random Choice Algorithm**:

### Step 1: Active Prize Filtering
The engine queries all prizes where `isActive === true` and `remainingQuantity > 0`:
$$\text{AvailablePrizes} = \{ P_1, P_2, \dots, P_k \}$$

### Step 2: Probability Pool Calculation
Let $W_i = \text{probability}_i$ be the probability weight assigned to Prize $P_i$.
The total win probability weight sum is calculated as:
$$\text{WinWeightSum} = \sum_{i=1}^{k} W_i$$

A **No-Win Weight** is dynamically calculated to represent non-winning card outcomes:
$$\text{NoWinWeight} = \max(0, 100 - \text{WinWeightSum})$$

The **Total Weight Pool** is:
$$\text{TotalPool} = \text{WinWeightSum} + \text{NoWinWeight}$$

### Step 3: Random Value Generation
A uniform pseudo-random floating-point number is generated:
$$R \sim \text{Uniform}(0, \text{TotalPool})$$

### Step 4: Interval Selection Loop
The engine iterates through the available prizes, accumulating weight bounds:
$$\text{CumulativeWeight}_m = \sum_{i=1}^{m} W_i$$

If $R \le \text{CumulativeWeight}_m$, Prize $P_m$ is awarded. If $R > \text{WinWeightSum}$, the card receives a non-winning result ("Better luck next time!").

---

## 5. Real-World Retail & Shopping Mall Operations

```text
 1. 🛍️ Customer Makes Purchase: Spends $100+ at Mall Billing Counter.
 2. 🧾 Receipt QR Code Print: POS Cashier prints receipt with scannable QR Code URL.
 3. 📱 Mobile Phone Scan: Customer scans QR Code on mobile browser (http://192.168.0.166:4000/?code=CARD-8A2F-99).
 4. 🎨 Canvas Scratch: Customer scratches silver foil on screen with finger.
 5. 🏷️ Cashier Redemption: Customer presents winning screen. Cashier clicks "Mark as REDEEMED" (#resultId).
```

---

## 6. 25+ Technical Interview Questions & Comprehensive Answers

### Q1: What is NestJS and why choose it over plain Express.js?
**Answer**: NestJS is a structured, opinionated TypeScript framework built on top of Express (or Fastify). Unlike plain Express, NestJS enforces architectural design patterns out-of-the-box (Modules, Controllers, Services, Dependency Injection), resulting in highly maintainable, testable, and scalable enterprise codebases.

---

### Q2: What is Dependency Injection (DI) and how does NestJS implement it?
**Answer**: Dependency Injection is an IoC pattern where classes receive their dependencies from an external framework rather than creating them with `new`. In NestJS, classes decorated with `@Injectable()` are registered as providers in a `@Module()`. NestJS's IoC container automatically instantiates providers and injects them into controller constructors.

---

### Q3: What is the difference between NestJS Middleware, Guards, Pipes, and Interceptors?
**Answer**:
- **Middleware**: Executes before the route handler, ideal for logging or raw body parsing.
- **Guards**: Implement `CanActivate` to handle authentication and authorization (e.g. checking JWT tokens or user roles). Executed after middleware, before pipes.
- **Pipes**: Implement `PipeTransform` to validate and transform request payloads (e.g., `ValidationPipe`, `ParseIntPipe`).
- **Interceptors**: Intercept request/response execution before and after route handlers, useful for response mapping, caching, or execution time logging.

---

### Q4: How does `ValidationPipe({ whitelist: true, transform: true })` prevent Mass Assignment Attacks?
**Answer**: Mass Assignment occurs when attackers inject undeclared properties (like `role: "ADMIN"`) into HTTP JSON requests. Setting `whitelist: true` instructs NestJS to automatically strip any property not declared in the DTO class. Setting `transform: true` automatically converts primitive payload strings to numbers/booleans matching DTO types.

---

### Q5: What is a DTO and why is it defined as a Class instead of a TypeScript Interface?
**Answer**: A DTO (Data Transfer Object) defines the schema for network payloads. TypeScript interfaces are erased during compilation to JavaScript and do not exist at runtime. Classes exist at runtime in JavaScript, allowing NestJS and `class-validator` decorators to reflect metadata and validate runtime payloads.

---

### Q6: How does JWT (JSON Web Token) authentication work, and what is inside the token?
**Answer**: JWT is a stateless authentication container consisting of three base64url-encoded parts separated by dots: `Header.Payload.Signature`.
- **Header**: Algorithm (`HS256`) and type.
- **Payload**: Claims (`sub` for User ID, `email`, `role`).
- **Signature**: `HMACSHA256(Header + "." + Payload, JWT_SECRET)`. Server verifies identity by validating signature without database lookups.

---

### Q7: What does `sub` stand for in a JWT payload?
**Answer**: In RFC 7519 (JWT Standard), `sub` stands for **Subject**, representing the unique primary key identifier of the authenticated user.

---

### Q8: Why should passwords never be stored in plain text, and how does `bcrypt` salting work?
**Answer**: Plaintext passwords expose user credentials if a database is leaked. `bcrypt` appends a unique random **salt** to each password before hashing it through $2^{\text{cost}}$ iterations ($2^{10} = 1024$ rounds). Salting renders pre-computed **Rainbow Tables** useless, and key stretching slows down GPU brute-force attacks.

---

### Q9: Why use `bcrypt.compare()` instead of `password === hash`?
**Answer**: Standard string equality comparison (`===`) short-circuits on the first mismatched character, creating a **Timing Attack** vulnerability where attackers measure execution duration to guess passwords. `bcrypt.compare()` uses a constant-time algorithm taking the exact same duration regardless of character mismatches.

---

### Q10: What is the difference between Authentication and Authorization?
**Answer**: 
- **Authentication**: Verifying *who* a user is (e.g. checking credentials via `POST /auth/login` and issuing a JWT token).
- **Authorization**: Verifying *what permissions* an authenticated user has (e.g. `RolesGuard` checking if `user.role === 'ADMIN'` before allowing `POST /prizes`).

---

### Q11: How does Passport JWT Strategy (`JwtStrategy`) validate incoming requests?
**Answer**: Passport extracts the token from `Authorization: Bearer <token>`, verifies its cryptographic signature using `JWT_SECRET`, checks expiration, decodes the payload, and calls `validate(payload)`. The object returned by `validate()` is attached to NestJS's `request.user`.

---

### Q12: How does a custom parameter decorator like `@GetUser()` work?
**Answer**: `@GetUser()` uses NestJS's `createParamDecorator` to extract the `user` property attached to the HTTP request object (`ctx.switchToHttp().getRequest().user`), allowing clean injection into controller parameters: `@GetUser('userId') userId: number`.

---

### Q13: What is CORS and why did we enable `app.enableCors()` in NestJS?
**Answer**: CORS (Cross-Origin Resource Sharing) is a browser security policy preventing web applications on one domain/port (`http://localhost:3000`) from making HTTP requests to another (`http://localhost:4000`). Calling `app.enableCors()` adds HTTP response headers allowing frontend requests.

---

### Q14: What is Prisma Next ORM and how does it differ from traditional Prisma?
**Answer**: Prisma Next is a lightweight TypeScript SQL ORM that uses a data contract (`contract.prisma`) to compile lightweight runtime query engines and ambient type declarations (`contract.d.ts`), providing full IDE autocomplete without heavy code generation dependencies.

---

### Q15: What is the purpose of `contract.json` and `contract.d.ts`?
**Answer**:
- **`contract.json`**: Compiled schema definition used at runtime by the ORM engine.
- **`contract.d.ts`**: TypeScript declaration file powering ambient type checking and IDE autocomplete for models, queries, and relations.

---

### Q16: What is a Database Migration?
**Answer**: A migration is a version-controlled SQL script that transforms a database schema from one state to another (e.g., adding columns like `phone` or `isRedeemed`) while preserving existing table data.

---

### Q17: How is Double-Scratch Protection enforced at both Application and Database layers?
**Answer**:
- **Application Layer**: Checks `card.status === 'UNSCRATCHED'`. Throws `400 Bad Request` if scratched.
- **Database Layer**: `ScratchResult.scratchCardId` has a `@unique` database constraint. If concurrent requests bypass application memory, PostgreSQL rejects duplicate inserts.

---

### Q18: How does the HTML5 Canvas scratch effect work in the frontend?
**Answer**: A 2D canvas context renders a silver metallic gradient texture over an underlying HTML container displaying prize info. Setting `ctx.globalCompositeOperation = 'destination-out'` turns mouse/touch drawing into an eraser, clearing pixels to reveal the prize beneath.

---

### Q19: How do we calculate the percentage of canvas scratched off?
**Answer**: We invoke `ctx.getImageData(0, 0, width, height)` to retrieve the RGBA pixel array. By sampling pixel alpha values ($\text{alpha} = 0$), we calculate the ratio of transparent pixels:
$$\text{ScratchedPercent} = \left( \frac{\text{TransparentPixels}}{\text{TotalSampledPixels}} \right) \times 100$$
When threshold > 35%, remaining foil auto-clears.

---

### 20: How does `useRef()` differ from `useState()` in React?
**Answer**: `useState()` triggers a component re-render whenever state updates. `useRef()` returns a mutable object whose `.current` property persists across renders *without* triggering component re-renders. `useRef()` is ideal for holding DOM references like `<canvas ref={canvasRef}>`.

---

### Q21: What is the difference between React Server Components and Client Components in Next.js?
**Answer**:
- **Server Components**: Default in Next.js App Router. Rendered on the server, zero JS bundle size sent to client, cannot use hooks or browser events.
- **Client Components** (`'use client'`): Rendered on server and hydrated on client. Can use hooks (`useState`, `useEffect`, `useRef`), event listeners, and browser APIs.

---

### Q22: Why is an immutable `ScratchResult` ledger table necessary?
**Answer**: Decoupling scratch card attempts into an immutable ledger table guarantees complete financial auditability and verifiable proof of prize wins without altering card issuance history.

---

### Q23: How do we prevent screenshot fraud at shopping mall billing counters?
**Answer**: Winning screens show a unique **Result ID**. When a customer presents their phone screen, the cashier enters the Result ID into the Admin Panel and calls `POST /cards/redeem/:resultId`. The backend updates `isRedeemed = true`. Subsequent redemption attempts are rejected (`400 Bad Request`).

---

### Q24: Why does mobile phone scanning require binding NestJS to `0.0.0.0`?
**Answer**: Binding `app.listen(port, '0.0.0.0')` instructs NestJS to listen on all network interfaces rather than loopback `127.0.0.1`. This allows mobile devices on the same Wi-Fi network to connect to the Mac's IP address (`http://192.168.0.166:4000`).

---

### Q25: How does the application handle atomic inventory stock caps for high-value prizes?
**Answer**: When a prize is won, the service executes:
```typescript
await this.prisma.db.orm.public.Prize.where({ id: wonPrize.id }).update({
  remainingQuantity: Math.max(0, wonPrize.remainingQuantity - 1),
});
```
Available prizes are filtered by `remainingQuantity > 0`, ensuring high-value prizes (e.g. 55" TV) cannot be awarded beyond available stock.
