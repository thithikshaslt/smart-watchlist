# Smart Market Watchlist

## Overview

Smart Market Watchlist is an end-to-end financial market watchlist application.

The goal is to build a polished, reliable watchlist that goes beyond simply displaying stock prices. The application should adapt to different users by allowing them to decide what information they want to monitor.

The product should work equally well for:

* Beginners
* Experienced market users
* Users casually monitoring stocks
* Users tracking stocks as a hobby

A watchlist should not assume that a user intends to buy or sell.

## Product Philosophy

**Smart means adaptive.**

Users should be able to customize their watchlist experience by choosing the metrics, charts, and other information they care about.

Future smart functionality should build on these user-defined preferences, particularly when determining what has meaningfully changed since the user's last visit.

The product should favor useful, explainable functionality over AI added for its own sake.

## Evaluation Priorities

Design and implementation should demonstrate:

* Engineering depth
* Strong product interpretation
* Reliability and resilience
* Clean, maintainable code
* Thoughtful and justified technical decisions

## Technology Stack

### Frontend

* React
* Vite
* TypeScript
* TanStack Query
* shadcn/ui
* Tailwind CSS
* Lightweight Charts

### Backend

* NestJS
* Fastify
* PostgreSQL
* Prisma

## Architecture

The application uses a modular monolithic backend.

```text
React
   ↓
NestJS API
   ↓
PostgreSQL

NestJS
   ↓
Market Data Provider
```

The backend owns market-data access and user state.

Core backend domains include:

* Authentication
* Users
* Watchlists
* Instruments
* Market Data

Future functionality can be added as additional domains, such as Smart Insights.

## Development Approach

Build the product incrementally by phase.

Each phase should have its own specification and acceptance criteria. Existing architecture and decisions should be considered when implementing new functionality.

Prefer straightforward solutions that are appropriate for the current scale while keeping the system extensible for later phases.

When making significant technical decisions, record the decision and its reasoning in `docs/decisions.md`.

The current implementation scope is defined by the active phase specification.

## Git and Commits

Git commits should be authored solely by the project owner.

Do not add Claude, Anthropic, AI tools, or any other co-author attribution to commit messages or commit trailers.

Keep commit messages concise and descriptive, following the repository's established commit convention.