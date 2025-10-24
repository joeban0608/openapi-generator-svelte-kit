import { getRequestEvent } from '$app/server';
import type { ApiRoute, ApiRequest, ApiResponse } from './_api/_base';
import { apiSchema } from './_api/_index';
import {
	BadRequestError,
	MethodNotAllowedError,
	UnauthorizedError,
	UnsupportedMediaTypeError
} from './error';
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { AppError, type AppResult } from './_api/app.result';

type RequireAuthArgs<T extends keyof typeof apiSchema> = {
	appContext: { session: App.Session };
	routeSchema: ApiRoute<T>;
	requestBody: Omit<ApiRequest<T>, 'userId' | 'id'>;
};

type OptionalAuthArgs<T extends keyof typeof apiSchema> = {
	appContext: { session: App.Session };
	routeSchema: ApiRoute<T>;
	requestBody: Omit<ApiRequest<T>, 'userId' | 'id'>;
};

type HandlerResponse<T extends keyof typeof apiSchema> = AppResult<ApiResponse<T>> | Response;

type AuthedHandler<T extends keyof typeof apiSchema> = (
	args: RequireAuthArgs<T>
) => Promise<HandlerResponse<T>>;

type UnauthHandler<T extends keyof typeof apiSchema> = (
	args: OptionalAuthArgs<T>
) => Promise<HandlerResponse<T>>;

export class ServerHandler {
	// REMOTE FUNCTION
	static SESSION(): App.Session {
		const { locals } = getRequestEvent();
		const { session } = locals;

		if (!session) {
			redirect(303, '/');
		}

		return session;
	}

	// REMOTE FUNCTION
	static async REMOTE<T>(fn: () => Promise<AppResult<T>>): Promise<
		| {
				success: true;
				value: T;
		  }
		| {
				success: false;
				error: {
					type: string;
					code: number;
					message: string;
				};
		  }
	> {
		try {
			const result = await fn();
			if (result.success) return result;
			else throw result.error;
		} catch (e) {
			const error = await ServerHandler.ERROR(e as Error);
			return {
				success: false,
				error
			};
		}
	}

	static async API<T extends keyof typeof apiSchema>(
		url: T,
		event: RequestEvent,
		handler: AuthedHandler<T>,
		options?: { skipAuth?: false | undefined }
	): Promise<Response>;

	static async API<T extends keyof typeof apiSchema>(
		url: T,
		event: RequestEvent,
		handler: UnauthHandler<T>,
		options: { skipAuth: true }
	): Promise<Response>;

	static async API<T extends keyof typeof apiSchema>(
		url: T,
		event: RequestEvent,
		handler: AuthedHandler<T> | UnauthHandler<T>,
		options?: { skipAuth?: boolean }
	): Promise<Response> {
		const skipAuth = options?.skipAuth === true;

		const { session } = event.locals;

		if (!skipAuth && !session) {
			throw new UnauthorizedError();
		}

		const routeSchema = apiSchema[url] as ApiRoute<T>;

		let requestBody: Record<string, unknown> = {};
		const method = event.request.method.toUpperCase();
		if (method === 'GET' || method === 'DELETE') {
			const search = new URLSearchParams(event.url.search);
			for (const [key, value] of search.entries()) {
				requestBody[key] = value;
			}
		} else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
			const contentType = event.request.headers.get('content-type');
			if (!contentType) {
				throw new UnsupportedMediaTypeError();
			}

			if (contentType.includes('application/json')) {
				try {
					requestBody = {
						...(await event.request.json()),
						...requestBody
					};
				} catch {
					throw new BadRequestError('Invalid JSON body');
				}
			} else {
				throw new UnsupportedMediaTypeError();
			}
		} else {
			throw new MethodNotAllowedError();
		}

		Object.entries(event.params).forEach(([key, value]) => {
			requestBody[key] = value;
		});

		try {
			const data = routeSchema.request.parse(requestBody);
			let response: HandlerResponse<T>;

			if (skipAuth) {
				const optionalHandler = handler as UnauthHandler<T>;
				response = await optionalHandler({
					appContext: { session: session ?? null },
					routeSchema,
					requestBody: data as unknown as Omit<ApiRequest<T>, 'userId' | 'id'>
				});
			} else {
				const requireHandler = handler as AuthedHandler<T>;
				response = await requireHandler({
					appContext: { session: session! },
					routeSchema,
					requestBody: data as unknown as Omit<ApiRequest<T>, 'userId' | 'id'>
				});
			}

			if (response instanceof Response) {
				return response;
			}

			if (response.success) {
				const payload = routeSchema.response.parse(response.value);

				return Response.json(
					{
						success: true as const,
						data: payload
					},
					{ status: 200 }
				);
			} else {
				const payload = response.error.serialize();

				return Response.json(
					{
						success: false as const,
						error: payload
					},
					{ status: payload.code }
				);
			}
		} catch (e) {
			const error = await ServerHandler.ERROR(e as Error);
			return Response.json({ success: false, error }, { status: 500 });
		}
	}

	static async ERROR(e: Error): Promise<{ type: string; code: number; message: string }> {
		if (e instanceof AppError) {
			return e.serialize();
		}

		if (e instanceof ZodError) {
			const messages = e.issues
				.map((issue) => `${issue.path.join('.')} ${issue.message}`.trim())
				.join('; ');

			return {
				type: 'DATA_INVALID_FORMAT',
				code: 400,
				message: messages || 'Input format is invalid'
			};
		}

		// unwrap PostgresError from drizzle/postgres-js
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const pgError = 'code' in e ? (e as any) : (e as any).cause;
		if (pgError?.code) {
			switch (pgError.code) {
				case '23505': // unique_violation
					return { type: 'DATA_DUPLICATE_VALUE', code: 409, message: 'Data already exists' };
				case '23503': // foreign_key_violation
					return { type: 'DATA_NOT_FOUND', code: 400, message: 'Related data not found' };
				case '23502': // not_null_violation
					return { type: 'DATA_MISSING_FIELD', code: 400, message: 'Required field is missing' };
				case '22P02': // invalid_text_representation
					return { type: 'DATA_INVALID_FORMAT', code: 400, message: 'Input format is invalid' };
				case '23514': // check_violation
					return { type: 'DATA_INVALID_VALUE', code: 400, message: 'Input value is invalid' };
				default:
					return { type: 'DATA_ERROR', code: 400, message: 'Internal data error' };
			}
		}

		console.error({ error: e }, 'Unhandled server error');
		return { type: 'SERVER_ERROR', code: 500, message: 'Internal server error' };
	}
}
