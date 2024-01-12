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
import { Database, Table, id, text } from "@applemango/dsql"
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

const user = Table({
	id: id(),
	email: text(),
	password: text(),
	username: text(),
	bio: text(),
	icon_image: text(),
	profile_image: text(),
	created_at: text(),
	updated_at: text(),
})

type Product = {
	id: number,
	name: string,
	description: string,
}
const product = Table({
	id: id(),
	name: text(),
	description: text(),
	create_at: text(),
	icon_image: text(),
})

const article = Table({
	id: id(),
	user_id: user.id,
	product_id: product.id,
	title: text(),
	description: text(),
	body: text(),
	created_at: text(),
	updated_at: text(),
})

const comment = Table({
	id: id(),
	article_id: article.id,
	body: text(),
})


export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const db = Database({
			user, product, article, comment
		}, {
			execute: async (query, args)=> {
				const database = new DatabaseCore("db.sqlite");
				const statement = database.prepare(query)
				return await statement.all(args || [])
			}
		})
		const api = Worker<{
			json: (obj: {[key: string]: any}) => Response,
			env: Env,
			db: typeof db,
			//id: string
		}>({req, ctx, env, db})
		api.appendContext({
			json: (obj: any)=> {
				const response = new Response(JSON.stringify(obj))
				response.headers.set("Content-Type", "application/json")
				return response
			},
			//id: crypto.randomUUID().replaceAll("-", "").slice(0, 12)
		})

		await api.any("/**", async ({api})=> {
			console.log(`Request: ${api.req.method} ${api.req.url}`)
			if (api.req.method === "OPTIONS")
				return new Response("OK")
			await api.getBody()
		})

		await api.post<{email: string, password: string, username: string, bio: string }>("/user", async ({api, body})=> {
			await db.user.insert({
				email: body.email,
				password: body.password,
				username: body.username
			})
			return api.json({msg: "success"})
		})
		await api.post<{name: string, description: string}>("/product", async ({api, body})=> {
			const product: Array<Product | null> = await db.execute("SELECT * FROM product WHERE name = ?", [body.name])
			if(product[0]) {
				return api.json({msg: "success"})
			}
			await db.product.insert({
				name: body.name,
				description: body.description
			})
			return api.json({msg: "success"})
		})
		await api.post<{title: string, description: string, body: string}>("/article", async ({api, body})=>{
			await db.article.insert({
				title: body.title,
				description: body.description,
				body: body.body,
				user_id: 1
			})
			return api.json({msg: "success"})
		})
		await api.get("/article", async ({api})=>{
			const articles = await db.execute("SELECT article.*, user.* FROM article INNER JOIN user ON article.user_id = user.id")
			//const articles = await db.article.all()
			return api.json({msg: "success", articles})
		})
		await api.get<{id: string}>("/article/:id", async ({api, args})=>{
			const article = await db.article.get(args.id)
			return api.json({msg: "success", article})
		})
		await api.post<{}>("/comment", async ({api, body})=>{})

		return api.final();
	},
};
