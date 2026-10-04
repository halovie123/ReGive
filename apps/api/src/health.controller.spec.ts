import { HealthController } from './health.controller';
import { PublicApiException } from './common/http/public-api.exception';
import type { PrismaService } from './common/prisma/prisma.service';

const probe = (behaviour: () => Promise<unknown>) =>
  ({ $queryRaw: behaviour }) as unknown as PrismaService;

describe('HealthController', () => {
  /**
   * /health is liveness: it answers as long as the process is up, so an
   * orchestrator restarts a hung process but not one whose database is
   * merely slow. It must never touch a dependency.
   */
  it('reports liveness without touching the database', () => {
    const queryRaw = jest.fn();
    const controller = new HealthController(probe(queryRaw));

    expect(controller.check()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  /**
   * /ready is readiness, and it exists because /health returning a
   * hard-coded ok meant a dead database still reported healthy — nothing
   * upstream could tell "serving" from "serving errors".
   */
  it('reports readiness once the database answers', async () => {
    const controller = new HealthController(probe(() => Promise.resolve([{}])));

    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
  });

  it('fails readiness with 503 when the database is unreachable', async () => {
    const controller = new HealthController(
      probe(() => Promise.reject(new Error('connection refused'))),
    );

    await expect(controller.ready()).rejects.toMatchObject({
      status: 503,
      response: { code: 'NOT_READY' },
    });
  });

  /**
   * A readiness probe that leaked a driver message would publish the
   * database host, port or user to anyone who can curl it.
   */
  it('does not leak the underlying database error', async () => {
    const controller = new HealthController(
      probe(() =>
        Promise.reject(new Error('postgres://regive:hunter2@10.0.0.4:5432')),
      ),
    );

    const error = await controller.ready().catch((caught: unknown) => caught);
    // Only a PublicApiException's response reaches the wire; anything else
    // the filter replaces with a generic 500, so check what would be sent.
    expect(error).toBeInstanceOf(PublicApiException);
    const sent = JSON.stringify((error as PublicApiException).getResponse());
    expect(sent).not.toContain('hunter2');
    expect(sent).not.toContain('10.0.0.4');
  });
});
