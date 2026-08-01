import '@testing-library/jest-dom'

// jsdom 30 does not expose a working localStorage here, so provide an
// in-memory one. api.ts stores the auth token through it.
const store = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, String(value)),
        removeItem: (key: string) => void store.delete(key),
        clear: () => store.clear(),
        key: (index: number) => [...store.keys()][index] ?? null,
        get length() {
            return store.size
        },
    },
})
