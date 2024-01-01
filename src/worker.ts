/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Worker, WorkerRoute } from "@applemango/worker";
import { Database } from "@applemango/dsql"
import { Database as DatabaseCore } from "bun:sqlite";

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const db = Database({}, {
			execute: async (query, args)=> {
				const database = new DatabaseCore("db.sqlite");
				const statement = database.prepare(query)
				return await statement.all(args)
			}
		})
		const api = Worker({req, ctx, env, db, json: (obj: any)=> undefined as any})
		api.appendContext({
			json: async (obj: any)=> {
				return new Response(JSON.stringify(await api.getBody()))
			}
		})
		await api.post("/", async ({api})=> {
			return await api.json({})
		})
		return api.final();
	},
};
