import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement <dialog> methods yet; browsers do. Minimal stand-ins that
// toggle the `open` attribute are enough for testing our Modal component.
function showModal(this: HTMLDialogElement): void {
  this.setAttribute('open', '');
}

function close(this: HTMLDialogElement): void {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
}

if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
}
