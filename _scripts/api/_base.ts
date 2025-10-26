import z from 'zod';
import type { apiSchema } from './_index.js';

export type ApiSchema = typeof apiSchema;
export type ApiRoute<T extends keyof ApiSchema> = ApiSchema[T];
export type ApiRequest<T extends keyof ApiSchema> = z.infer<ApiSchema[T]['request']>;
export type ApiResponse<T extends keyof ApiSchema> = z.infer<ApiSchema[T]['response']>;
export type ApiDefinition = {
	tooling: boolean;
	name: string;
	description: string;
	tags: string[];
	request: z.ZodTypeAny;
	response: z.ZodTypeAny;
	responseHeaders?: Record<string, { description: string; schema: z.ZodTypeAny }>;
};
