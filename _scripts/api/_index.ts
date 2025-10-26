import type { ApiDefinition } from './_base.js';
import { todoSchema } from './todo.api.js';

export const apiSchema = {
	...todoSchema
} as const satisfies Record<string, ApiDefinition>;
