// js/animations.js - Ripples, Cell scaling, Shaking, Pure CSS/JS Confetti, Toasts

function prefersReducedMotion() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

export function ripple(event, element) {
  if (!element || prefersReducedMotion()) return;

  const rect = element.getBoundingClientRect();
  const circle = document.createElement('span');
  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;

  const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : rect.left + radius);
  const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : rect.top + radius);

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${clientX - rect.left - radius}px`;
  circle.style.top = `${clientY - rect.top - radius}px`;
  circle.classList.add('ripple-effect');

  const existingRipple = element.querySelector('.ripple-effect');
  if (existingRipple) {
    existingRipple.remove();
  }

  element.appendChild(circle);

  setTimeout(() => {
    circle.remove();
  }, 600);
}

export function popCell(cell) {
  if (!cell || prefersReducedMotion()) return;
  cell.classList.remove('pop-anim');
  void cell.offsetWidth; // Force reflow
  cell.classList.add('pop-anim');
  setTimeout(() => {
    cell.classList.remove('pop-anim');
  }, 250);
}

export function shakeCell(cell) {
  if (!cell || prefersReducedMotion()) return;
  cell.classList.remove('shake-anim');
  void cell.offsetWidth; // Force reflow
  cell.classList.add('shake-anim');
  setTimeout(() => {
    cell.classList.remove('shake-anim');
  }, 400);
}

export function confetti(container = document.body) {
  if (prefersReducedMotion()) return;

  const colors = ['#4f8cff', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8'];
  const confettiCount = 40;
  const fragment = document.createDocumentFragment();
  const elements = [];

  const wrapper = document.createElement('div');
  wrapper.className = 'confetti-wrapper';

  for (let i = 0; i < confettiCount; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100; // %
    const size = 6 + Math.random() * 8; // px
    const duration = 1.2 + Math.random() * 0.8; // s
    const delay = Math.random() * 0.3; // s
    const rotate = Math.random() * 360; // deg

    piece.style.backgroundColor = color;
    piece.style.left = `${left}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.4}px`;
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${delay}s`;
    piece.style.transform = `rotate(${rotate}deg)`;

    wrapper.appendChild(piece);
    elements.push(piece);
  }

  container.appendChild(wrapper);

  setTimeout(() => {
    wrapper.remove();
  }, 2200);
}

export function toast(message, duration = 3000) {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  toastEl.className = 'toast-message';
  toastEl.textContent = message;

  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.add('show');
  }, 10);

  setTimeout(() => {
    toastEl.classList.remove('show');
    toastEl.addEventListener('transitionend', () => toastEl.remove());
  }, duration);
}
