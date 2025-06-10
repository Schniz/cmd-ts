export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object | Array<any> ? DeepPartial<T[P]> : T[P];
};
