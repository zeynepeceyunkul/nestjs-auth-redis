import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createRedisMock } from './redis-mock';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('REDIS')
      .useFactory({
        factory: () => createRedisMock(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: 'e2e@example.com',
    password: 'password123',
  };

  describe('POST /auth/register', () => {
    it('yeni kullanıcı kaydeder', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'User registered successfully');
          expect(res.body).toHaveProperty('userId');
        });
    });

    it('aynı email ile 400 döner', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('doğru bilgilerle access ve refresh token döner', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('yanlış şifre ile 400 döner', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrong' })
        .expect(400);
    });
  });

  describe('GET /auth/profile', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      accessToken = res.body.accessToken;
    });

    it('Bearer token ile kullanıcı bilgisi döner', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('email', testUser.email);
        });
    });

    it('token olmadan 401 döner', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      refreshToken = res.body.refreshToken;
    });

    it('refresh token ile yeni access ve refresh token döner', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.refreshToken).not.toBe(refreshToken);
        });
    });

    it('geçersiz refresh token ile 400 döner', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('refresh token ile 201 ve mesaj döner', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      const refreshToken = loginRes.body.refreshToken;

      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Logged out successfully');
        });
    });

    it('body olmadan 400 döner', () => {
      return request(app.getHttpServer()).post('/auth/logout').send({}).expect(400);
    });
  });
});
