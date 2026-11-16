import { configure } from "@testing-library/react";

// Async queries (findBy*, waitFor) get real headroom: parallel workers starve each other.
// Must stay well below vitest's testTimeout (vite.config.ts).
configure({ asyncUtilTimeout: 5000 });
