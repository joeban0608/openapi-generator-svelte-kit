import { AppError } from './_api/app.result';

export class BadRequestError extends AppError {
	type: string = 'BAD_REQUEST';
	code: number = 400;

	constructor(message: string) {
		super(message);
	}
}

export class UnauthorizedError extends AppError {
	type: string = 'UNAUTHORIZED';
	code: number = 401;

	constructor() {
		super('Unauthorized');
	}
}

export class MethodNotAllowedError extends AppError {
	type: string = 'METHOD_NOT_ALLOWED';
	code: number = 405;

	constructor() {
		super('Method Not Allowed');
	}
}

export class UnsupportedMediaTypeError extends AppError {
	type: string = 'UNSUPPORTED_MEDIA_TYPE';
	code: number = 415;

	constructor() {
		super('Unsupported Media Type');
	}
}

export class CustomError extends AppError {
	type: string;
	code: number;

	constructor(type: string, code: number, message: string) {
		super(message);
		this.type = type;
		this.code = code;
	}
}
