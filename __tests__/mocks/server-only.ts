// Vitest stand-in for the "server-only" package. The real module throws when
// imported outside a React Server Components bundle, which crashes any unit
// test that imports lib/server/* code. Tests run in Node, which is the
// environment the guard exists to require, so a no-op is safe here.
export {}
