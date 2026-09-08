# Scratch & Win — Step 4: Authentication & Authorization Interview Guide

## Overview of What We Built in Step 4

We implemented a production-grade, state-less authentication system in NestJS using:
- **`bcrypt`**: For secure password hashing with salt rounds.
- **`class-validator` & `class-transformer`**: Input validation DTOs with global `ValidationPipe`.
- **JWT (`@nestjs/jwt` & `passport-jwt`)**: JSON Web Tokens for stateless authentication.
- **Custom `@GetUser()` Decorator**: For clean user extraction from request objects.
- **`JwtAuthGuard`**: Protecting private routes against unauthorized requests.

---

## Code Architecture Created

```text
src/
  ├── main.ts                         <-- Enables Global ValidationPipe (whitelist: true)
  ├── app.module.ts                   <-- Imports AuthModule & PrismaModule
  └── auth/
      ├── dto/
      │   ├── register.dto.ts         <-- Validates email, password min length, name
      │   └── login.dto.ts            <-- Validates login payload
      ├── auth.service.ts             <-- Business logic (hash, compare, JWT sign)
      ├── auth.controller.ts          <-- Endpoints: /auth/register, /auth/login, /auth/me
      ├── auth.module.ts              <-- Configures PassportModule & JwtModule (1d expiry)
      ├── jwt.strategy.ts             <-- Passport strategy to extract & verify Bearer token
      ├── jwt-auth.guard.ts           <-- Route guard enforcing HTTP 401 on unauthorized access
      └── get-user.decorator.ts       <-- Param decorator injecting req.user into controller handlers
```

---

## Verified Live Test Cases

| Endpoint | Method | Payload / Headers | Result |
|---|---|---|---|
| `/auth/register` | `POST` | `{"email": "player1@example.com", "password": "password123"}` | `201 Created` + `user` object + `accessToken` |
| `/auth/login` | `POST` | `{"email": "player1@example.com", "password": "password123"}` | `200 OK` + `accessToken` |
| `/auth/me` | `GET` | Header `Authorization: Bearer <TOKEN>` | `200 OK` + `{ user: { userId, email, role } }` |
| `/auth/me` | `GET` | *No Token* | `401 Unauthorized` |

---

## Core Interview Questions & Comprehensive Answers

### Q1: What is a DTO (Data Transfer Object) in NestJS and why do we use it?
**Answer**:
A DTO defines the expected schema and type constraints of data sent over the network. Using DTOs with `class-validator` decorators allows NestJS to automatically sanitize, parse, and validate incoming HTTP request payloads before passing them to application controllers or business logic.

---

### Q2: How does `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))` protect against Mass Assignment Attacks?
**Answer**:
Mass Assignment occurs when an attacker includes extra, unauthorized fields in an HTTP request payload (such as `role: "ADMIN"` during registration).
`whitelist: true` instructs NestJS to automatically strip away any property in the request body that is not explicitly defined in the DTO class. This ensures attackers cannot inject administrative or restricted model fields.

---

### Q3: Why should passwords never be stored in plain text, and how does `bcrypt` salt rounds work?
**Answer**:
If a database is compromised, plaintext passwords allow attackers to compromise user accounts across multiple services.
`bcrypt` uses a salt (a random string appended to the password) and hashes the password $2^{\text{cost}}$ times (e.g., $2^{10} = 1024$ iterations for `saltRounds = 10`).
- **Salting** prevents **Rainbow Table** pre-computed hash dictionary attacks.
- **Key Stretching** slows down brute-force hardware hashing attempts.

---

### Q4: Why is `bcrypt.compare()` used instead of simple string comparison (`password === hash`)?
**Answer**:
Standard string equality comparison (`===`) terminates as soon as a character mismatch is found. Attackers can measure response times in milliseconds (**Timing Attacks**) to guess passwords character-by-character.
`bcrypt.compare()` uses a **constant-time algorithm** that takes the exact same duration regardless of where a mismatch occurs, eliminating timing attack vulnerabilities.

---

### Q5: What is inside a JWT token, and what does `sub` stand for in the payload?
**Answer**:
A JSON Web Token consists of three base64-encoded parts separated by dots: `Header.Payload.Signature`.
- **Header**: Algorithm used (e.g., `HS256`).
- **Payload**: Claims about the entity (e.g., `sub`, `email`, `role`).
- **Signature**: Formed by signing `Header.Payload` with a server-side secret key (`JWT_SECRET`).

In RFC 7519 (JWT Standard), **`sub`** stands for **Subject**, which represents the unique identifier (e.g., primary key `userId`) of the principal.

---

### Q6: How does Passport JWT Strategy (`JwtStrategy`) validate incoming requests?
**Answer**:
1. Passport reads the incoming request header: `Authorization: Bearer <token>`.
2. It decrypts/verifies the token's cryptographic signature using `JWT_SECRET`. If the signature is invalid or expired, it throws `HTTP 401 Unauthorized`.
3. If valid, Passport passes the decoded payload to `validate(payload)`.
4. Whatever object `validate()` returns is automatically attached to NestJS's `request.user` property for use in controllers.

---

### Q7: Why create a custom `@GetUser()` parameter decorator?
**Answer**:
Without a custom decorator, controllers must access user details via `@Req() req: Request` and inspect `req.user`.
A custom `@GetUser()` parameter decorator cleanly extracts `req.user` or specific properties (e.g., `@GetUser('userId') userId: number`), improving code readability, type safety, and testability.
