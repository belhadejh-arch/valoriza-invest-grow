type FunctionBuilder = {
  validator: (validate: (data: any) => any) => FunctionBuilder;
  handler: <T extends (...args: any[]) => any>(handler: T) => T;
};

export function createServerFn(_options?: { method?: string }): FunctionBuilder {
  const builder: FunctionBuilder = {
    validator: () => builder,
    handler: (handler) => handler,
  };
  return builder;
}

export function useServerFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

export function createServerOnlyFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}