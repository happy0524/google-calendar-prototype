/* 한 곳에서 관리하는 공통 선 아이콘. 외부 아이콘 라이브러리는 사용하지 않습니다. */
window.Icons = (() => {
  const paths = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    back: '<path d="m15 4-8 8 8 8"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m7 10 5 5 5-5"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    minus: '<path d="M5 12h14"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    people:
      '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3zM16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 4 5v2"/>',
    bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 2v2"/>',
    text: '<path d="M4 6h16M4 11h16M4 16h10"/>',
    video:
      '<rect x="3" y="5" width="13" height="14" rx="1"/><path d="m16 9 6-4v14l-6-4"/>',
    clip: '<path d="M8 15V6a4 4 0 0 1 8 0v11a6 6 0 0 1-12 0V6M8 6v11a2 2 0 0 0 4 0V6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    offline:
      '<path d="m2 2 20 20M3 9a15 15 0 0 1 3-2M9 6a15 15 0 0 1 12 3M6 13a10 10 0 0 1 4-2M14 11a10 10 0 0 1 4 2M9 17a5 5 0 0 1 6 0M12 21h.01"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11-2 6 6 0 0 1 0 12z"/>',
    route: '<path d="m12 2 10 10-10 10L2 12zM9 16v-5h7m-3-3 3 3-3 3"/>',
    walk: '<circle cx="14" cy="3" r="1.5"/><path d="m7 11 3-4 4 1 3 5 4 1M12 9l-2 6 5 3 1 4M10 15l-4 7"/>',
    transit:
      '<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19l-2 3m10-3 2 3M9 15h.01M15 15h.01M9 6h6"/>',
    car: '<path d="m5 8 2-5h10l2 5M3 9h18v10H3zM5 19v3m14-3v3M3 13h18M7 16h.01M17 16h.01"/>',
    sparkles:
      '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M8 15h2m4 0h2m-8 3h2"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    briefcase:
      '<rect x="3" y="7" width="18" height="14" rx="1"/><path d="M8 7V3h8v4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    target:
      '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
    folder: '<path d="M3 7V4h7l2 3h9v14H3z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M6 10v1a6 6 0 0 0 12 0v-1M12 17v5M9 22h6"/>',
    home: '<path d="m3 10 9-8 9 8v11h-7v-7h-4v7H3z"/>',
    restaurant:
      '<path d="M3 2v7a3 3 0 0 0 6 0V2M6 2v20M17 2c-3 3-4 8-1 10h3V2zm2 10v10"/>',
    coffee:
      '<path d="M3 4h14v10a6 6 0 0 1-12 0V4M17 5h2a3 3 0 0 1 0 6h-2M2 22h18"/>',
    hotel:
      '<path d="M2 5v17M22 11v11M2 18h20M2 14h20v-3H11v7M6 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/>',
    shopping:
      '<rect x="3" y="7" width="18" height="15" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
    layers: '<path d="m12 2 10 6-10 6L2 8zM2 13l10 6 10-6M2 18l10 6 10-6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
    bookmark: '<path d="M6 3h12v19l-6-4-6 4z"/>',
    share:
      '<circle cx="5" cy="12" r="3"/><circle cx="19" cy="4" r="3"/><circle cx="19" cy="20" r="3"/><path d="m8 11 8-5M8 13l8 5"/>',
    contribute: '<circle cx="12" cy="12" r="9"/><path d="M12 6v12M6 12h12"/>',
  };
  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  const drive =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0f9d58" d="m8 2 5 8-7 12-5-8z"/><path fill="#fbbc04" d="M8 2h9l7 12h-10z"/><path fill="#4285f4" d="m6 22 5-8h13l-5 8z"/></svg>';
  const doc = (type = "doc") =>
    `<svg class="file-icon" viewBox="0 0 32 38" aria-hidden="true"><path fill="${type === "sheet" ? "#0f9d58" : type === "pdf" ? "#ea4335" : "#4285f4"}" d="M3 0h18l11 11v24a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3"/><path fill="#fff" opacity=".35" d="M21 0v11h11"/><path stroke="#fff" stroke-width="2" d="M7 19h18M7 24h18M7 29h12"/></svg>`;
  const maps =
    '<svg class="icon maps-logo" viewBox="0 0 24 32" aria-hidden="true"><path fill="#34a853" d="M12 32c-2-6-12-14-12-20a12 12 0 0 1 24 0c0 6-10 14-12 20Z"/><path fill="#4285f4" d="M3 4a12 12 0 0 1 18 0l-6 8-7 5-8-5a12 12 0 0 1 3-8Z"/><path fill="#fbbc04" d="m0 12 7 5 5 15C8 23 0 18 0 12Z"/><path fill="#ea4335" d="M3 4a12 12 0 0 1 9-4v8L7 12Z"/><circle cx="12" cy="12" r="5" fill="white"/></svg>';
  return { icon, drive, doc, maps };
})();
