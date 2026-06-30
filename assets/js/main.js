// Shared chrome behavior: mobile sidebar, dropdown menus, icons.
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openBtn = document.getElementById('sidebar-open');
  const closeBtn = document.getElementById('sidebar-close');

  const openSidebar = () => {
    sidebar?.classList.remove('-translate-x-full');
    overlay?.classList.remove('hidden');
    openBtn?.setAttribute('aria-expanded', 'true');
  };
  const closeSidebar = () => {
    sidebar?.classList.add('-translate-x-full');
    overlay?.classList.add('hidden');
    openBtn?.setAttribute('aria-expanded', 'false');
  };

  openBtn?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Generic dropdown toggles: any [data-dropdown-toggle] controls the
  // next sibling panel, closes on outside click or Escape.
  document.querySelectorAll('[data-dropdown-toggle]').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('data-dropdown-toggle'));
    if (!panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !panel.classList.contains('hidden');
      document.querySelectorAll('.dropdown-panel').forEach((p) => p.classList.add('hidden'));
      panel.classList.toggle('hidden', isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-panel').forEach((p) => p.classList.add('hidden'));
  });

  // Checking a task/habit checkbox strikes through its linked label text.
  document.querySelectorAll('input[type="checkbox"][data-strike]').forEach((cb) => {
    const target = document.getElementById(cb.getAttribute('data-strike'));
    cb.addEventListener('change', () => {
      target?.classList.toggle('line-through', cb.checked);
      target?.classList.toggle('text-slate-500', cb.checked);
      target?.classList.toggle('text-slate-200', !cb.checked);
    });
  });
});
