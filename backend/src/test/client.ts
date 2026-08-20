import type {Express} from 'express'
import request from 'supertest'
import {afterAll} from 'vitest'

/**
 * One listening server for the whole file, rather than the throwaway supertest
 * opens and closes around every single request.
 *
 * That churn was the source of a flake: several hundred servers a run, each on
 * an ephemeral port the operating system recycles quickly, and now and again a
 * connection reached a port that had already moved on. It surfaced as
 * ECONNRESET, and as a 404 when the request landed somewhere with different
 * routes mounted, roughly one run in ten and never the same test twice.
 */
export function testClient(app: Express) {
    const server = app.listen(0)

    afterAll(
        () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()))
            })
    )

    return () => request(server)
}
