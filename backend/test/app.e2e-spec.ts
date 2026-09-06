import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Smart Watchlist backend (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any;
  // e2e runs against the same dev database the app itself uses (no separate
  // test DB configured), so cleanup MUST only ever touch users this run
  // created - `deleteMany({})` here would wipe every real account too.
  const createdEmails: string[] = [];
  function trackEmail(email: string): string {
    createdEmails.push(email);
    return email;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    prisma = app.get(PrismaService);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    // Only the emails this run itself created - never a blanket deleteMany,
    // which would also destroy real accounts sharing this database. Users
    // cascade-delete their watchlists/items; seeded instruments are left alone.
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    await app.close();
  });

  it('GET /health returns ok', async () => {
    await request(server).get('/health').expect(200).expect({ status: 'ok' });
  });

  describe('auth + users', () => {
    const email = trackEmail(`e2e-${Date.now()}@example.com`);
    const password = 'password123';

    it('registers a new user', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      expect(response.body).toMatchObject({ email });
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('rejects a duplicate registration', async () => {
      await request(server)
        .post('/auth/register')
        .send({ email, password })
        .expect(409);
    });

    it('rejects registration with a password below the minimum length', async () => {
      await request(server)
        .post('/auth/register')
        .send({ email: `short-${Date.now()}@example.com`, password: 'short' })
        .expect(400);
    });

    it('rejects login with the wrong password', async () => {
      await request(server)
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    });

    it('logs in and returns the authenticated user via /users/me', async () => {
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      const token = loginResponse.body.accessToken;
      expect(typeof token).toBe('string');

      await request(server).get('/users/me').expect(401);

      const meResponse = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(meResponse.body.email).toBe(email);
    });

    it('rejects a malformed or tampered token', async () => {
      await request(server)
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    it('rejects a token with an expired payload and invalid signature', async () => {
      // A short-lived valid token would require mocking the clock; this instead
      // confirms the guard rejects a token whose claims were tampered with to
      // be expired, exercising the same 401 rejection path expiry takes.
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      const [header, payload] = loginResponse.body.accessToken.split('.');
      const expiredPayload = Buffer.from(
        JSON.stringify({
          ...JSON.parse(Buffer.from(payload, 'base64url').toString()),
          exp: Math.floor(Date.now() / 1000) - 60,
        }),
      ).toString('base64url');

      await request(server)
        .get('/users/me')
        .set(
          'Authorization',
          `Bearer ${header}.${expiredPayload}.invalid-signature`,
        )
        .expect(401);
    });
  });

  describe('instruments', () => {
    it('finds seeded instruments by symbol', async () => {
      const response = await request(server)
        .get('/instruments/search')
        .query({ q: 'AAPL' })
        .expect(200);
      expect(
        response.body.some((i: { symbol: string }) => i.symbol === 'AAPL'),
      ).toBe(true);
    });

    it('returns an empty array for a query with no matches', async () => {
      const response = await request(server)
        .get('/instruments/search')
        .query({ q: 'zzz-no-such-symbol' })
        .expect(200);
      expect(response.body).toEqual([]);
    });

    it('rejects a query shorter than the minimum length', async () => {
      await request(server)
        .get('/instruments/search')
        .query({ q: 'a' })
        .expect(400);
    });

    it('returns 404 for an unknown instrument id', async () => {
      await request(server)
        .get('/instruments/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('reports no quote available for a never-ingested instrument', async () => {
      const search = await request(server)
        .get('/instruments/search')
        .query({ q: 'AAPL' })
        .expect(200);
      const aaplId = search.body[0].id;

      const quoteResponse = await request(server)
        .get(`/instruments/${aaplId}/quote`)
        .expect(200);
      expect(quoteResponse.body).toEqual({ available: false, quote: null });
    });
  });

  describe('watchlists', () => {
    let ownerToken: string;
    let otherToken: string;
    let watchlistId: string;
    let aaplId: string;
    let msftId: string;

    beforeAll(async () => {
      const ownerEmail = trackEmail(`owner-${Date.now()}@example.com`);
      const otherEmail = trackEmail(`other-${Date.now()}@example.com`);
      const password = 'password123';

      await request(server)
        .post('/auth/register')
        .send({ email: ownerEmail, password });
      await request(server)
        .post('/auth/register')
        .send({ email: otherEmail, password });
      ownerToken = (
        await request(server)
          .post('/auth/login')
          .send({ email: ownerEmail, password })
      ).body.accessToken;
      otherToken = (
        await request(server)
          .post('/auth/login')
          .send({ email: otherEmail, password })
      ).body.accessToken;

      aaplId = (
        await request(server).get('/instruments/search').query({ q: 'AAPL' })
      ).body[0].id;
      msftId = (
        await request(server).get('/instruments/search').query({ q: 'MSFT' })
      ).body[0].id;
    });

    it('creates a watchlist owned by the caller', async () => {
      const response = await request(server)
        .post('/watchlists')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Tech' })
        .expect(201);
      watchlistId = response.body.id;
      expect(response.body.userId).toBeDefined();
    });

    it('lists only the caller own watchlists', async () => {
      const ownerList = await request(server)
        .get('/watchlists')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(
        ownerList.body.some((w: { id: string }) => w.id === watchlistId),
      ).toBe(true);

      const otherList = await request(server)
        .get('/watchlists')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);
      expect(
        otherList.body.some((w: { id: string }) => w.id === watchlistId),
      ).toBe(false);
    });

    it('adds instruments, assigning increasing positions', async () => {
      await request(server)
        .post(`/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ instrumentId: aaplId })
        .expect(201);

      const response = await request(server)
        .post(`/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ instrumentId: msftId })
        .expect(201);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[1].position).toBe(1);
    });

    it('rejects adding the same instrument twice', async () => {
      await request(server)
        .post(`/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ instrumentId: aaplId })
        .expect(409);
    });

    it('rejects adding an unknown instrument', async () => {
      await request(server)
        .post(`/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ instrumentId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('reorders items and persists the new order', async () => {
      const response = await request(server)
        .patch(`/watchlists/${watchlistId}/items/reorder`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ instrumentIds: [msftId, aaplId] })
        .expect(200);
      expect(response.body.items[0].instrumentId).toBe(msftId);
      expect(response.body.items[1].instrumentId).toBe(aaplId);
    });

    it('rejects a reorder with a mismatched item set and leaves order intact', async () => {
      await request(server)
        .patch(`/watchlists/${watchlistId}/items/reorder`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ instrumentIds: [msftId] })
        .expect(400);

      const watchlist = await request(server)
        .get(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(watchlist.body.items[0].instrumentId).toBe(msftId);
      expect(watchlist.body.items[1].instrumentId).toBe(aaplId);
    });

    it('removes an item', async () => {
      await request(server)
        .delete(`/watchlists/${watchlistId}/items/${aaplId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('prevents another user from viewing, renaming, or deleting the watchlist', async () => {
      await request(server)
        .get(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      await request(server)
        .patch(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hijacked' })
        .expect(404);

      await request(server)
        .delete(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('has no configured display lens by default', async () => {
      const response = await request(server)
        .get(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(response.body.viewLens).toBeNull();
    });

    it("lets the owner set a display lens from the fixed metric catalog, without dropping the watchlist's items", async () => {
      const response = await request(server)
        .patch(`/watchlists/${watchlistId}/view`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ metrics: ['price', 'volume'] })
        .expect(200);
      expect(response.body.viewLens).toEqual(['price', 'volume']);
      // Regression guard: an earlier version's PATCH response omitted
      // `items`, and the frontend caches this response directly - wiping the
      // visible item list the moment a user customizes their view.
      expect(response.body.items).toHaveLength(1);

      const watchlist = await request(server)
        .get(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(watchlist.body.viewLens).toEqual(['price', 'volume']);
      expect(watchlist.body.items).toHaveLength(1);
    });

    it('rejects a display lens containing an unknown metric', async () => {
      await request(server)
        .patch(`/watchlists/${watchlistId}/view`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ metrics: ['price', 'not-a-real-metric'] })
        .expect(400);
    });

    it('records a first-ever visit with no comparison, then a subsequent visit that reports one against it', async () => {
      const created = await request(server)
        .post('/watchlists')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Visit tracking' })
        .expect(201);
      const visitWatchlistId = created.body.id;
      await request(server)
        .post(`/watchlists/${visitWatchlistId}/items`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ instrumentId: aaplId })
        .expect(201);

      const firstVisit = await request(server)
        .post(`/watchlists/${visitWatchlistId}/visits`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(firstVisit.body.previousViewedAt).toBeNull();
      expect(firstVisit.body.items).toEqual([
        { instrumentId: aaplId, classification: null },
      ]);
      expect(firstVisit.body.summary).toEqual({
        notableCount: 0,
        broadMarketCount: 0,
      });

      const secondVisit = await request(server)
        .post(`/watchlists/${visitWatchlistId}/visits`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(secondVisit.body.previousViewedAt).not.toBeNull();
    });

    it('rejects taking a visit action on a watchlist owned by another user', async () => {
      await request(server)
        .post(`/watchlists/${watchlistId}/visits`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('renames and deletes the watchlist for its owner', async () => {
      await request(server)
        .patch(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Renamed' })
        .expect(200);

      await request(server)
        .delete(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      await request(server)
        .get(`/watchlists/${watchlistId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
