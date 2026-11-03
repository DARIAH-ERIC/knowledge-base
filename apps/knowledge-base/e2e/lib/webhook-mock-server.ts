import { createServer } from "node:http";

import { assert, log } from "@acdh-oeaw/lib";

/**
 * Server actions dispatch revalidation webhooks via `after()` (see
 * `@/lib/webhook/dispatch-webhook`). During e2e tests the real revalidation endpoint is not
 * running, so every dispatch would fail and flood the server logs with errors. This stand-in
 * listens on the webhook port and answers every request with `204`, mirroring how we mock the
 * analytics endpoint in `@/e2e/lib/test`.
 *
 * The port is passed as the first argument by `getWebhookMockServer` in the playwright config.
 */

const port = Number(process.argv[2]);

assert(Number.isInteger(port) && port > 0, "Pass the port to listen on as the first argument.");

const server = createServer((request, response) => {
	// Drain the request body so the client sees a clean completion.
	request.resume();
	request.on("end", () => {
		response.writeHead(204).end();
	});
});

server.listen(port, () => {
	log.info(`[webhook-mock-server] Listening on port ${String(port)}.`);
});
