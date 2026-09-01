import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView — harmless no-op so components that
// auto-scroll (e.g. a chat feed) don't need environment-specific branching.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
