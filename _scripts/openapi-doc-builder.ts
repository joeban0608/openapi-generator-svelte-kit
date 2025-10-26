/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import z from 'zod';
import fs from 'fs';
import path from 'path';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

type ApiDefinition = {
	tooling: boolean;
	name: string;
	description: string;
	tags: string[];
	request: z.ZodTypeAny;
	response: z.ZodTypeAny;
	// 支援 header schema 為 ZodTypeAny 或 plain object
	responseHeaders?: Record<
		string,
		{ description: string; schema: z.ZodTypeAny | { type: string; format?: string } }
	>;
};

type SchemaType = Record<string, ApiDefinition>;

type DocBuilderOptions = {
	schema: SchemaType;
	serverUrl: string;
	outputPath: string; // e.g. "static/docs/1.0.0/openapi.json"
	title?: string;
	version?: string;
	includeToolingFalse?: boolean; // 是否包含 tooling: false 的 API
};

export function generateOpenApiDocToFile(options: DocBuilderOptions) {
	const {
		schema,
		serverUrl,
		outputPath,
		title = 'API Documentation',
		version = '0.2.3',
		includeToolingFalse = true
	} = options;

	const registry = new OpenAPIRegistry();

	type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

	// 共用錯誤 schema
	const errorResponseSchema = z.object({
		success: z.literal(false).describe('Indicates the request failed'),
		error: z.object({
			code: z.number().describe('HTTP status code'),
			message: z.string().describe('Error message'),
			status: z.enum(['error', 'success']).describe('Status of the response')
		})
	});

	function _zodHeaderToOpenApiSchema(zodSchema: z.ZodTypeAny): any {
		// 只支援 string/url
		if (zodSchema instanceof z.ZodString) {
			// 若有 .url()，format 要用 "uri"（OpenAPI 標準）
			const checks = (zodSchema as any)._def?.checks ?? [];
			const format =
				Array.isArray(checks) && checks.some((check: any) => check.kind === 'url')
					? 'uri'
					: undefined;
			return { type: 'string', ...(format ? { format } : {}) };
		}
		// fallback
		return { type: 'string' };
	}

	Object.entries(schema).forEach(([key, item]) => {
		if (!includeToolingFalse && item.tooling === false) return;

		const [methodRaw, rawPath] = key.split(' ');
		const method = methodRaw.toLowerCase() as Method;

		const pathStr = rawPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

		// --- 修正：正確處理 path params 及 query params ---
		const pathParams: any[] = [];
		const queryParams: any[] = [];
		const pathParamMatches = pathStr.match(/\{([^}]+)\}/g);
		if (pathParamMatches) {
			pathParamMatches.forEach((param) => {
				const paramName = param.replace(/[{}]/g, '');
				pathParams.push({
					name: paramName,
					in: 'path',
					required: true,
					schema: { type: 'string' },
					description: `${paramName} parameter`
				});
			});
		}
		// GET/DELETE 參數當作 query
		if (
			(method === 'get' || method === 'delete') &&
			item.request &&
			item.request instanceof z.ZodObject
		) {
			const shape = item.request.shape;
			for (const key in shape) {
				const def = shape[key]._def;
				let type = 'string';
				if (def?.innerType?.type === 'number') type = 'integer';
				else if (def?.innerType?.type === 'boolean') type = 'boolean';
				const param: any = {
					name: key,
					in: 'query',
					required: def?.innerType?.isOptional ? false : true,
					schema: { type },
					description: def.description
				};
				if (typeof def.defaultValue === 'function') {
					param.schema.default = def.defaultValue();
				}
				queryParams.push(param);
			}
		}
		let parameters: any[] | undefined = undefined;
		if (pathParams.length || queryParams.length) {
			parameters = [...pathParams, ...queryParams];
		}

		let request: any = undefined;
		// 只有非 GET/DELETE 才把 request 當成 body
		if (
			!(method === 'get' || method === 'delete') &&
			item.request &&
			item.request instanceof z.ZodType
		) {
			request = { body: { content: { 'application/json': { schema: item.request } } } };
		}
		let responses: Record<string, any> = {};

		// 新增 301 response 如果有 responseHeaders
		if (item.responseHeaders) {
			responses['301'] = {
				description: 'Redirect to client deeplink',
				headers: Object.fromEntries(
					Object.entries(item.responseHeaders).map(([header, info]) => [
						header,
						{
							description: info.description,
							schema:
								info.schema instanceof z.ZodType
									? _zodHeaderToOpenApiSchema(info.schema)
									: info.schema
						}
					])
				)
			};
			return registry.registerPath({
				method,
				path: pathStr,
				tags: item.tags,
				summary: item.name.replace(/([A-Z])/g, ' $1').trim(),
				description: item.description,
				parameters,
				request,
				responses
			});
		}

		// responses 組裝
		responses = {
			200: {
				description: 'Success response',
				content: {
					'application/json': {
						schema: z.object({
							success: z.literal(true),
							data: item.response
						})
					}
				}
			},
			400: {
				description: 'Bad Request',
				content: { 'application/json': { schema: errorResponseSchema } }
			},
			401: {
				description: 'Unauthorized',
				content: { 'application/json': { schema: errorResponseSchema } }
			}
		};

		registry.registerPath({
			method,
			path: pathStr,
			tags: item.tags,
			summary: item.name.replace(/([A-Z])/g, ' $1').trim(),
			description: item.description,
			parameters,
			request,
			responses
		});
	});

	// 產生 OpenAPI 文件
	const generator = new OpenApiGeneratorV3(registry.definitions);
	const openApiDoc = generator.generateDocument({
		openapi: '3.0.3',
		info: {
			title,
			version
		},
		servers: [{ url: serverUrl, description: 'host server' }]
	});

	// 寫入 outputPath
	const destDir = path.dirname(outputPath);
	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}
	fs.writeFileSync(outputPath, JSON.stringify(openApiDoc, null, 2));
	console.log(`OpenAPI doc generated at ${outputPath}`);
}
