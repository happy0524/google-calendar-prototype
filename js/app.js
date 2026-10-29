/* 화면 렌더링과 데모 상태. file://에서도 동작하도록 모듈·fetch를 사용하지 않습니다. */
(() => {
  "use strict";
  const D = window.DEMO_DATA;
  const mode =
    new URLSearchParams(location.search).get("mode") === "asis"
      ? "asis"
      : "tobe";
  const improved = mode === "tobe";
  const CHANNEL = "calendar-comparison-v2";
  const storageKey = `${D.storageKey}-comparison-${mode}-v2`;
  document.body.dataset.mode = mode;
  const { icon, drive, doc } = window.Icons;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const prettyDate = (value) => {
    const d = parseDate(value);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${weekdays[d.getDay()]}요일`;
  };
  const shortTime = (value) => {
    const [h, m] = (value || "00:00").split(":").map(Number);
    return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
  };
  const expiryDate = (days) => {
    const date = parseDate(D.today);
    date.setDate(date.getDate() + Number(days));
    return dateKey(date);
  };
  function freshState() {
    return {
      version: 2,
      events: clone(D.events),
      savedFiles: {},
      selectedDate: D.today,
      month: "2026-10",
      settings: { offline: false, auto: false, interval: 30 },
    };
  }
  let state = freshState();
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (
      stored?.version === 2 &&
      Array.isArray(stored.events) &&
      stored.settings &&
      stored.savedFiles
    )
      state = stored;
  } catch (_) {
    /* 저장이 제한된 브라우저에서는 메모리 상태로 시연합니다. */
  }
  // 공통 설정은 부모에서 수신하며, 이전 타이머를 로드 직후 재개하지 않습니다.
  state.settings = { offline: false, auto: false, interval: 30 };
  let screen = "calendar";
  let activeFileId = null;
  let mapsSaved = false;
  let currentId = null;
  let modal = null;
  let focusBeforeModal = null;
  let suggestionTimer = null;
  let saveTimer = null;
  let toastTimer = null;
  let lastInteraction = 0;
  let lastSuggestionAt = 0;
  let detailScroll = 0;
  const currentEvent = () =>
    state.events.find((event) => event.id === currentId);
  const fileById = (id) => D.files.find((file) => file.id === id);
  const eventsOn = (date) =>
    state.events
      .filter((e) => e.date === date)
      .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  const fileSaved = (id) =>
    !!state.savedFiles[id] && state.savedFiles[id].expires >= D.today;
  const placeOf = (event) =>
    D.places[event?.place] ||
    (event?.location
      ? {
          ...D.places.campus,
          name: event.location,
          short: event.location,
          address: "선택한 위치",
          category: "사용자 지정 장소",
        }
      : null);
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (_) {
      /* 메모리 상태 유지 */
    }
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
  }
  function markInteraction() {
    lastInteraction = Date.now();
  }
  function publish(type, payload = {}) {
    if (window.parent !== window)
      window.parent.postMessage(
        { channel: CHANNEL, type, mode, ...payload },
        "*",
      );
  }
  function publishView() {
    publish("view", { screen, modal: modal?.type || null });
  }
  function offlineBanner() {
    return state.settings.offline
      ? `<div class="offline-banner">${icon("offline")}오프라인</div>`
      : "";
  }
  function header() {
    return `<header class="app-header"><div class="header-left"><button class="icon-button glass-button" data-action="menu" aria-label="캘린더 메뉴">${icon("menu")}</button><button class="month-title" data-action="choose-month" aria-label="월 선택">${Number(state.month.split("-")[1])}월${icon("down")}</button></div><div class="header-tools"><div class="header-pill"><button class="icon-button" data-action="search" aria-label="일정 검색">${icon("search")}</button><button class="icon-button" data-action="today" aria-label="오늘 10월 29일로 이동"><span class="today-icon">29</span></button></div><button class="avatar" data-action="account" aria-label="Google 계정"><span class="avatar-inner">김</span></button></div></header>`;
  }
  function renderCalendar() {
    screen = "calendar";
    const [year, month] = state.month.split("-").map(Number);
    const first = new Date(year, month - 1, 1, 12);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    const visibleEventCount = window.innerHeight < 690 ? 2 : 3;
    const cells = Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      const key = dateKey(date),
        events = eventsOn(key);
      return `<div class="calendar-cell${date.getMonth() !== month - 1 ? " outside" : ""}${key === state.selectedDate ? " is-selected" : ""}${key === D.today ? " is-today" : ""}" role="button" tabindex="0" data-action="select-date" data-date="${key}" aria-label="${prettyDate(key)}, 일정 ${events.length}개" aria-pressed="${key === state.selectedDate}"><span class="day-number">${date.getDate()}</span>${events
        .slice(0, visibleEventCount)
        .map(
          (event) =>
            `<button class="month-event" style="background:${esc(event.color || "#039be5")}" data-action="event" data-id="${esc(event.id)}" title="${esc(event.title)}" tabindex="-1">${esc(event.title)}</button>`,
        )
        .join(
          "",
        )}${events.length > visibleEventCount ? `<span class="event-overflow">+${events.length - visibleEventCount}개</span>` : ""}</div>`;
    }).join("");
    const selectedEvents = eventsOn(state.selectedDate);
    const months = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2026, 9 + i, 1, 12),
        key = dateKey(date).slice(0, 7);
      return `${date.getMonth() === 0 ? `<span class="month-year">${date.getFullYear()}</span>` : ""}<button class="month-chip${key === state.month ? " active" : ""}" data-action="change-month" data-month="${key}">${date.getMonth() + 1}월</button>`;
    }).join("");
    $("#app").innerHTML =
      `<div class="calendar-screen">${offlineBanner()}${header()}<nav class="month-strip" aria-label="월 이동">${months}</nav><div class="weekdays" aria-hidden="true">${weekdays.map((w, i) => `<span class="${i === 4 ? "today-week" : ""}">${w}</span>`).join("")}</div><div class="month-grid" aria-label="${year}년 ${month}월 달력">${cells}</div><section class="agenda" aria-label="선택한 날짜의 일정"><div class="agenda-heading">${prettyDate(state.selectedDate)}<span>${selectedEvents.length}개의 일정</span></div>${selectedEvents.map((event) => `<button class="agenda-event" data-action="event" data-id="${esc(event.id)}"><span class="event-time">${event.allDay ? "종일" : shortTime(event.start)}${!event.allDay ? `<small>${shortTime(event.end)}</small>` : ""}</span><span class="agenda-color" style="background:${esc(event.color || "#039be5")}"></span><span><h3>${esc(event.title)}</h3><p>${esc(placeOf(event)?.name || (event.meet ? "Google Meet 화상 회의" : event.calendar || "내 캘린더"))}</p></span></button>`).join("") || '<div class="empty-agenda">등록된 일정이 없어요. 새로운 일정을 추가해 보세요.</div>'}</section><button class="fab" data-action="add-event" aria-label="일정 추가">${icon("plus")}</button></div>`;
    const activeMonth = $(".month-chip.active");
    if (activeMonth)
      activeMonth.parentElement.scrollLeft = Math.max(
        0,
        activeMonth.offsetLeft - 10,
      );
    publishView();
  }
  function attachmentMarkup(id) {
    const file = fileById(id);
    if (!file) return "";
    const saved = fileSaved(id);
    return `<article class="attachment-card"><button class="attachment-open" data-action="open-file" data-file="${esc(id)}" aria-label="${esc(file.name)} 열기">${doc(file.type)}<span class="attachment-info"><span class="attachment-name">${esc(file.name)}</span><span class="attachment-meta">${file.type === "pdf" ? "PDF 문서" : file.type === "sheet" ? "Google Sheets" : "Google Docs"} · ${file.size}</span></span>${icon("chevron")}</button>${improved ? `<div class="attachment-state"><span class="file-status${saved ? " saved" : ""}">${icon(saved ? "check" : "cloud")}${saved ? `기기에 저장됨 · ${prettyDate(state.savedFiles[id].expires).split(" ").slice(0, 2).join(" ")} 만료` : "온라인에서 열 수 있음"}</span><button class="file-settings" data-action="storage" data-file="${esc(id)}">${saved ? "저장 설정" : "오프라인 저장"}</button></div>` : ""}</article>`;
  }
  function renderDetail(preserveScroll = false) {
    const event = currentEvent();
    if (!event) {
      renderCalendar();
      return;
    }
    if (preserveScroll)
      detailScroll = $(".detail-screen")?.scrollTop || detailScroll;
    else detailScroll = 0;
    screen = "detail";
    const place = placeOf(event);
    $("#app").innerHTML =
      `<div class="detail-screen${improved && place ? " calendar-map-context" : ""}">${offlineBanner()}<div class="detail-hero"><div class="detail-topbar"><button class="icon-button glass-button" data-action="back" aria-label="일정 상세 닫기">${icon("close")}</button><div class="action-pill"><button class="icon-button" data-action="edit-event" aria-label="일정 수정">${icon("edit")}</button><button class="icon-button" data-action="event-menu" aria-label="일정 더보기">${icon("more")}</button></div></div></div><article class="detail-card"><div class="detail-row"><span class="event-color-square" style="background:${esc(event.color || "#039be5")}"></span><div><h1 class="detail-title">${esc(event.title)}</h1><p class="detail-date">${prettyDate(event.date)}<br>${event.allDay ? "종일" : `${shortTime(event.start)} – ${shortTime(event.end)}`}</p></div></div>${place ? `<div class="detail-row location-row">${icon("pin")}<div>${improved ? `<h2 class="location-name">${esc(place.name)}</h2>` : `<button class="location-name location-open-link" data-action="open-maps" aria-label="${esc(place.name)} 지도에서 열기">${esc(place.name)}</button>`}<p class="secondary">${esc(place.address)}</p>${improved ? DemoMap.markup(place) : `<button class="text-button outlined-button external-map-link" data-action="open-maps">${icon("pin")}지도에서 열기${icon("chevron")}</button>`}</div></div>` : ""}<div class="detail-row">${icon("people")}<div><p class="detail-row-title">${(event.guests || []).length ? `참석자 ${event.guests.length + 1}명` : "참석자"}</p>${event.guests?.length ? `<div class="guest-list">${event.guests.map((name) => `<span class="guest-chip"><span class="guest-avatar">${esc(name.slice(0, 1))}</span>${esc(name)}</span>`).join("")}</div><p class="tiny-label">나 · 주최자</p>` : '<p class="secondary">나 · 주최자</p>'}</div></div><div class="detail-row">${icon("bell")}<div><p class="detail-row-title">${event.reminder ?? 30}분 전</p>${event.secondaryReminder ? `<p class="secondary">${esc(event.secondaryReminder)}</p>` : ""}</div></div><div class="detail-row">${icon("video")}<div>${event.meet ? `<button class="meet-label" data-action="meet">Google Meet으로 참여하기</button><p class="meet-code">meet.google.com/abc-demo-swe</p>` : '<p class="detail-row-title">화상 회의 없음</p>'}</div></div>${event.description ? `<div class="detail-row">${icon("text")}<p class="detail-description">${esc(event.description)}</p></div>` : ""}<div class="detail-row">${icon("clip")}<div class="attachment-section"><p class="detail-row-title">첨부파일</p><div id="attachment-list">${(event.attachments || []).map(attachmentMarkup).join("")}</div><button class="attachment-add" data-action="drive">${drive}Google Drive에서 첨부</button></div></div><div class="detail-row calendar-owner"><span class="avatar-inner">김</span><div><p class="detail-row-title">${esc(event.calendar || "김민서")}</p><p class="secondary">${event.calendar ? "휴일 캘린더" : "내 캘린더 · 기본 공개 상태"}</p></div></div></article></div>`;
    DemoMap.attach(markInteraction);
    $(".detail-screen").scrollTop = detailScroll;
    publishView();
  }
  function refreshAttachments() {
    const list = $("#attachment-list");
    if (list)
      list.innerHTML = (currentEvent()?.attachments || [])
        .map(attachmentMarkup)
        .join("");
  }
  function returnToCalendar() {
    activeFileId = null;
    renderDetail(true);
  }
  function openMaps() {
    if (improved || !placeOf(currentEvent())) return;
    detailScroll = $(".detail-screen")?.scrollTop || 0;
    screen = "maps";
    const place = placeOf(currentEvent());
    $("#app").innerHTML = `
      <div class="external-screen maps-screen maps-fullscreen" aria-label="Google Maps">
        ${offlineBanner()}
        ${DemoMap.markup(place, "app")}
        <div class="external-appbar maps-return-crumb"><button class="return-calendar" data-action="return-calendar">${icon("back")}캘린더로 돌아가기</button></div>
        <form class="maps-searchbar" id="maps-search-form" role="search">
          ${Icons.maps}<input id="maps-search" type="search" placeholder="여기서 검색" aria-label="지도에서 장소 검색" autocomplete="off">
          <button type="button" class="maps-search-mic" data-action="maps-voice" aria-label="음성 검색">${icon("mic")}</button>
          <button type="button" class="avatar" data-action="account" aria-label="Google 계정"><span class="avatar-inner">김</span></button>
        </form>
        <nav class="maps-categories" aria-label="주변 장소 종류">
          ${[
            ["home", "집 설정"],
            ["restaurant", "음식점"],
            ["coffee", "커피"],
            ["hotel", "호텔"],
            ["shopping", "쇼핑"],
          ]
            .map(
              ([symbol, label]) =>
                `<button data-action="maps-category" data-category="${symbol}" aria-pressed="false">${icon(symbol)}${label}</button>`,
            )
            .join("")}
        </nav>
        <button class="maps-layer-button maps-round-control" data-action="maps-layers" aria-label="대중교통 지도 레이어" aria-pressed="false">${icon("layers")}</button>
        <button class="maps-compass maps-round-control" data-action="maps-compass" aria-label="북쪽을 위로 지도 초기화"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e35d5d" d="m12 3 5 9H7z"/><path fill="#a1a7aa" d="m12 21-5-9h10z"/></svg></button>
        <button class="maps-directions-fab" data-action="directions" aria-label="길찾기">${icon("route")}</button>
        <section class="maps-bottom-panel" aria-label="장소 정보" id="maps-place-panel">
          <button class="maps-panel-handle" data-action="maps-panel" aria-label="장소 정보 패널 펼치기" aria-expanded="false"><span></span></button>
          <div class="maps-panel-content"><div id="place-info"></div><div id="route-info"></div></div>
          <div class="maps-place-actions">
            <button class="maps-directions-button" data-action="directions">${icon("route")}경로</button>
            <button data-action="maps-save" aria-pressed="${mapsSaved}">${icon(mapsSaved ? "check" : "bookmark")}<span>${mapsSaved ? "저장됨" : "저장"}</span></button>
            <button data-action="maps-share">${icon("share")}공유</button>
          </div>
        </section>
        <nav class="maps-bottom-nav" aria-label="Google Maps 탐색">
          <button class="active" data-action="maps-tab" data-tab="explore" aria-current="page"><span>${icon("pin")}</span>탐색</button>
          <button data-action="maps-tab" data-tab="saved"><span>${icon("bookmark")}</span>내 페이지</button>
          <button data-action="maps-tab" data-tab="contribute"><span>${icon("contribute")}</span>참여</button>
        </nav>
      </div>`;
    DemoMap.attach(markInteraction);
    showPlace(false);
    publishView();
  }
  function openExternalDrive(id, rememberScroll = true) {
    const file = fileById(id);
    if (!file || improved) return;
    if (rememberScroll)
      detailScroll = $(".detail-screen")?.scrollTop || detailScroll;
    activeFileId = id;
    screen = "drive-app";
    // As-Is는 Drive에서 별도로 저장하지 않은 시나리오입니다. To-Be 저장 상태를 읽지 않습니다.
    $("#app").innerHTML =
      `<div class="external-screen drive-app-screen">${offlineBanner()}<header class="external-appbar"><button class="return-calendar" data-action="return-calendar">${icon("back")}캘린더로 돌아가기</button><span>Google Drive</span></header><div class="external-brand drive-brand">${drive}<h1>Google Drive</h1></div><div class="drive-documentbar">${doc(file.type)}<span><strong>${esc(file.name)}</strong><small>${file.size} · 내 드라이브</small></span></div>${state.settings.offline ? `<section class="drive-offline">${icon("offline")}<h2>인터넷 연결이 필요해요</h2><p>이 파일이 기기에 저장되지 않았어요.<br>인터넷에 연결한 후 다시 열어 주세요.</p><button class="text-button outlined-button" data-action="return-calendar">캘린더로 돌아가기</button></section>` : `<iframe class="external-document" src="${esc(file.path)}" title="${esc(file.name)} 본문"></iframe>`}</div>`;
    publishView();
  }
  function applySettings(settings) {
    if (
      !settings ||
      typeof settings.offline !== "boolean" ||
      typeof settings.auto !== "boolean" ||
      ![15, 30, 60, 90].includes(settings.interval)
    )
      return;
    const offlineChanged = settings.offline !== state.settings.offline;
    const timingChanged =
      (improved && settings.auto) !== state.settings.auto ||
      settings.interval !== state.settings.interval;
    state.settings = {
      offline: settings.offline,
      auto: improved && settings.auto,
      interval: settings.interval,
    };
    save();
    if (timingChanged) scheduleSuggestions();
    if (offlineChanged) {
      if (screen === "drive-app") openExternalDrive(activeFileId, false);
      else {
        const root = $("#app").firstElementChild;
        root?.querySelector(":scope > .offline-banner")?.remove();
        if (root && state.settings.offline)
          root.insertAdjacentHTML("afterbegin", offlineBanner());
      }
      if (modal?.type === "viewer") {
        if (state.settings.offline && !fileSaved(modal.file))
          openModal({ type: "network" });
        else renderModal();
      }
      if (
        state.settings.offline &&
        modal?.type === "storage" &&
        modal.saving &&
        !fileSaved(modal.file)
      ) {
        clearTimeout(saveTimer);
        modal.saving = false;
        renderModal();
        toast("인터넷 연결을 확인한 뒤 다시 저장해 주세요.");
      }
    }
  }
  function startScenario(scenario) {
    if (!["map", "attachment", "ai"].includes(scenario)) return;
    clearTimeout(saveTimer);
    if (modal?.saving) modal.saving = false;
    // 삭제 후에도 비교 버튼으로 대표 일정만 다시 준비할 수 있습니다.
    if (!state.events.some((event) => event.id === "team-meeting")) {
      state.events.push(
        clone(D.events.find((event) => event.id === "team-meeting")),
      );
      save();
    }
    openEvent("team-meeting");
    if (scenario === "attachment") {
      $(".attachment-section").scrollIntoView({ block: "start" });
    }
    publishView();
  }
  function openEvent(id) {
    closeModal(false);
    currentId = id;
    const event = currentEvent();
    if (!event) return;
    state.selectedDate = event.date;
    state.month = event.date.slice(0, 7);
    save();
    renderDetail();
    lastInteraction = 0;
  }
  function openModal(next) {
    clearTimeout(toastTimer);
    $("#toast").classList.remove("show");
    if (!modal) focusBeforeModal = document.activeElement;
    modal = next;
    renderModal();
    $("#app").setAttribute("inert", "");
    publishView();
    queueMicrotask(() => {
      const target =
        $("#overlay [autofocus]") ||
        $("#overlay button") ||
        $("#overlay input");
      target?.focus({ preventScroll: true });
    });
  }
  function closeModal(restoreFocus = true) {
    if (modal?.saving) return;
    modal = null;
    $("#overlay").innerHTML = "";
    $("#app").removeAttribute("inert");
    if (restoreFocus && focusBeforeModal?.isConnected)
      focusBeforeModal.focus({ preventScroll: true });
    focusBeforeModal = null;
    publishView();
    scheduleSuggestions();
  }
  function sheet(title, body, footer = "", className = "", headingIcon = "") {
    return `<div class="scrim" data-action="dismiss-backdrop"><section class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-handle"></div><div class="sheet-toolbar"><h2 class="sheet-title">${headingIcon}${title}</h2><button class="icon-button" data-action="close-modal" aria-label="닫기">${icon("close")}</button></div>${body}${footer}</section></div>`;
  }
  function dialog(title, text, actions, symbol = "info") {
    return `<div class="scrim dialog-scrim" data-action="dismiss-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dialog-icon">${icon(symbol)}</div><h2>${title}</h2><p>${text}</p><div class="dialog-actions">${actions}</div></section></div>`;
  }
  function renderModal() {
    if (!modal) return;
    let html = "";
    if (modal.type === "editor") {
      renderEditor();
      return;
    }
    if (modal.type === "drive") {
      html = sheet(
        "Google Drive",
        `<label class="drive-search">${icon("search")}<input id="drive-search" type="search" placeholder="Drive에서 검색" aria-label="Drive 파일 검색"></label><div class="drive-tabs"><button class="drive-tab active" data-action="drive-tab" data-tab="recent">최근</button><button class="drive-tab" data-action="drive-tab" data-tab="my">내 드라이브</button><button class="drive-tab" data-action="drive-tab" data-tab="shared">공유 문서함</button></div><div class="file-list"><div class="file-list-heading"><span>이름</span><span>최근 수정일 ↓</span></div><div id="drive-files">${driveFiles("")}</div></div>`,
        `<div class="sheet-footer"><small id="selected-count">${modal.selected.length}개 선택됨</small><button class="filled-button" data-action="attach-files" ${modal.selected.length ? "" : "disabled"}>첨부</button></div>`,
        "picker-sheet",
        drive,
      );
    } else if (modal.type === "storage") {
      const file = fileById(modal.file);
      html = sheet(
        "오프라인 저장",
        `<div class="sheet-content"><div class="storage-file">${doc(file.type)}<div><h3>${esc(file.name)}</h3><p>${file.size} · 문서</p></div></div><label class="storage-option"><span><strong>오프라인 저장</strong><p>연결 없이도 일정에서 문서를 열 수 있어요.</p></span><span class="switch"><input id="storage-enabled" type="checkbox" ${modal.enabled ? "checked" : ""} ${modal.saving ? "disabled" : ""}><span></span></span></label><label class="retention" for="retention-period">기기에 보관할 기간<select id="retention-period" ${!modal.enabled || modal.saving ? "disabled" : ""}><option value="1" ${modal.days === 1 ? "selected" : ""}>1일</option><option value="7" ${modal.days === 7 ? "selected" : ""}>7일</option><option value="30" ${modal.days === 30 ? "selected" : ""}>30일</option></select></label><p class="storage-expiry" id="storage-expiry">${storageExpiryText()}</p>${modal.saving ? '<div class="storage-progress" role="progressbar" aria-label="기기에 저장하는 중"></div>' : ""}</div>`,
        `<div class="sheet-footer"><small>보관 기간이 지나면 저장 상태가 해제됩니다.</small><button class="filled-button" data-action="save-storage" ${modal.saving ? "disabled" : ""}>${modal.saving ? '<span class="spinner"></span>저장 중' : "저장"}</button></div>`,
        "storage-sheet",
        icon("download"),
      );
    } else if (modal.type === "viewer") {
      const file = fileById(modal.file);
      html = `<section class="viewer" role="dialog" aria-modal="true" aria-label="${esc(file.name)} 문서 뷰어"><header class="viewer-toolbar"><button class="icon-button" data-action="close-modal" aria-label="문서 닫기">${icon("back")}</button>${doc(file.type)}<span class="viewer-name">${esc(file.name)}</span>${fileSaved(file.id) ? `<span class="viewer-label">${icon("check")}저장됨</span>` : ""}</header><iframe src="${esc(file.path)}" title="${esc(file.name)} 본문"></iframe><p class="viewer-footnote">${state.settings.offline ? "오프라인으로 사용 가능" : "Google Calendar"}</p></section>`;
    } else if (modal.type === "suggestion") {
      const s = modal.suggestion;
      html = `<div class="scrim dialog-scrim"><section class="dialog suggestion-dialog" role="dialog" aria-modal="true" aria-label="AI Agent 제안"><div class="ai-heading">${icon("sparkles")}Calendar AI Agent</div><h2>${esc(modal.step === "detail" ? s.title : s.text)}</h2>${modal.step === "detail" ? `<p>${esc(s.detail)}</p><div class="suggestion-detail"><small>현재</small><p>${esc(s.before)}</p><small>변경 후</small><strong>${esc(s.after)}</strong></div>` : '<p class="demo-disclosure">일정을 미리 준비해 보세요.</p>'}<div class="dialog-actions"><button class="text-button" data-action="close-modal">${modal.step === "detail" ? "취소" : "나중에"}</button><button class="filled-button" data-action="${modal.step === "detail" ? "apply-suggestion" : "suggestion-detail"}">${modal.step === "detail" ? s.action : "제안 확인"}</button></div></section></div>`;
    } else if (modal.type === "event-menu") {
      html = sheet(
        "일정 옵션",
        `<div class="sheet-content"><button class="menu-item" data-action="edit-event">${icon("edit")}일정 수정</button><button class="menu-item danger" data-action="delete-confirm">${icon("trash")}일정 삭제</button></div>`,
        "",
        "menu-sheet",
      );
    } else if (modal.type === "delete") {
      html = dialog(
        "이 일정을 삭제할까요?",
        `‘${esc(currentEvent()?.title)}’ 일정이 캘린더에서 삭제됩니다.`,
        '<button class="text-button" data-action="close-modal">취소</button><button class="filled-button" data-action="delete-event">삭제</button>',
        "trash",
      );
    } else if (modal.type === "network") {
      html = dialog(
        "인터넷 연결이 필요해요",
        "이 파일이 기기에 저장되지 않았어요. 인터넷에 연결한 후 다시 열어 주세요.",
        '<button class="filled-button" data-action="close-modal">확인</button>',
        "offline",
      );
    } else if (modal.type === "info") {
      html = dialog(
        esc(modal.title),
        esc(modal.text),
        '<button class="filled-button" data-action="close-modal">확인</button>',
        modal.symbol || "info",
      );
    } else if (modal.type === "menu") {
      html = sheet(
        "Google Calendar",
        `<div class="sheet-content"><button class="menu-item" data-action="close-modal">${icon("calendar")}월간 캘린더</button><button class="menu-item" data-action="search">${icon("search")}일정 검색</button><button class="menu-item" data-action="today">${icon("target")}오늘로 이동</button><button class="menu-item" data-action="demo-meeting">${icon("people")}소프트웨어공학 팀 회의</button><p class="file-list-note">김민서 · 내 캘린더</p></div>`,
        "",
        "menu-sheet",
      );
    } else if (modal.type === "month") {
      html = sheet(
        `${modal.year}년`,
        `<div class="sheet-content"><div class="form-inline"><button class="text-button" data-action="prev-year">이전 해</button><button class="text-button" data-action="next-year">다음 해</button></div><div class="month-chooser">${Array.from(
          { length: 12 },
          (_, i) => {
            const key = `${modal.year}-${String(i + 1).padStart(2, "0")}`;
            return `<button class="${state.month === key ? "active" : ""}" data-action="change-month" data-month="${key}">${i + 1}월</button>`;
          },
        ).join("")}</div></div>`,
      );
    } else if (modal.type === "search") {
      html = sheet(
        "일정 검색",
        `<label class="drive-search">${icon("search")}<input id="event-search" type="search" placeholder="일정 제목 또는 장소 검색" aria-label="일정 제목 또는 장소 검색" autofocus></label><div id="search-results" class="search-results">${searchResults("")}</div>`,
        "",
        "search-sheet",
      );
    }
    $("#overlay").innerHTML = html;
  }
  function driveFiles(query) {
    const files = D.files.filter((file) =>
      file.name.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      files
        .map(
          (file) =>
            `<label class="drive-file${modal.selected.includes(file.id) ? " selected" : ""}">${doc(file.type)}<span class="drive-file-text"><span class="drive-file-name">${esc(file.name)}</span><span class="drive-file-meta">${file.modified} · ${file.size}</span></span><input type="checkbox" data-select-file="${esc(file.id)}" aria-label="${esc(file.name)} 선택" ${modal.selected.includes(file.id) ? "checked" : ""}></label>`,
        )
        .join("") || '<p class="empty-state">검색 결과가 없어요.</p>'
    );
  }
  function searchResults(query) {
    const events = state.events.filter((event) =>
      `${event.title} ${placeOf(event)?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return (
      events
        .map(
          (event) =>
            `<button class="search-result" data-action="event" data-id="${esc(event.id)}"><span class="search-dot" style="background:${esc(event.color || "#039be5")}"></span><span><strong>${esc(event.title)}</strong><small>${prettyDate(event.date)} · ${event.allDay ? "종일" : shortTime(event.start)}</small></span></button>`,
        )
        .join("") || '<p class="empty-state">검색 결과가 없어요.</p>'
    );
  }
  function storageExpiryText() {
    return modal.enabled
      ? `보관 만료일: ${prettyDate(expiryDate(modal.days))}`
      : "기기의 오프라인 저장 상태를 해제합니다.";
  }
  function renderEditor() {
    const draft = modal.draft;
    $("#overlay").innerHTML =
      `<div class="scrim"><form class="sheet editor-sheet" id="event-form" role="dialog" aria-modal="true" aria-label="${modal.editId ? "일정 수정" : "일정 추가"}"><div class="sheet-handle"></div><div class="sheet-toolbar"><button type="button" class="icon-button glass-button" data-action="close-modal" aria-label="입력 취소">${icon("close")}</button><button class="filled-button" type="submit">저장</button></div><div class="sheet-content editor-content"><input class="editor-title" name="title" aria-label="일정 제목" placeholder="제목 추가" value="${esc(draft.title)}" maxlength="80" autocomplete="off"><div class="event-type-tabs"><span class="type-tab active">일정</span></div><p id="form-error" class="form-error" role="alert"></p><div class="form-section">${icon("clock")}<div class="form-content"><label class="form-inline">종일<span class="switch"><input type="checkbox" name="allDay" ${draft.allDay ? "checked" : ""}><span></span></span></label><div class="form-inline"><label class="native-picker date-picker"><span id="editor-date-label">${prettyDate(draft.date)}</span><input type="date" name="date" aria-label="일정 날짜" value="${esc(draft.date)}" required></label><label class="native-picker time-picker"><span id="editor-start-label">${draft.allDay ? "—" : shortTime(draft.start || "17:00")}</span><input type="time" name="start" aria-label="시작 시간" value="${esc(draft.start || "17:00")}" ${draft.allDay ? "disabled" : ""}></label></div><div class="form-inline"><span class="secondary">종료 시간</span><label class="native-picker time-picker"><span id="editor-end-label">${draft.allDay ? "—" : shortTime(draft.end || "18:00")}</span><input type="time" name="end" aria-label="종료 시간" value="${esc(draft.end || "18:00")}" ${draft.allDay ? "disabled" : ""}></label></div></div></div><div class="form-section">${icon("people")}<div class="form-content"><input name="guests" aria-label="참석자" placeholder="참석자 추가" value="${esc((draft.guests || []).join(", "))}"><p class="tiny-label">쉼표로 구분하여 추가</p></div></div><div class="form-section">${icon("video")}<label class="form-content form-inline">화상 회의 추가<span class="switch"><input type="checkbox" name="meet" ${draft.meet ? "checked" : ""}><span></span></span></label></div><div class="form-section">${icon("pin")}<div class="form-content"><input name="location" aria-label="위치" placeholder="위치 추가" list="demo-places" value="${esc(placeOf(draft)?.name || "")}"><datalist id="demo-places">${Object.values(
        D.places,
      )
        .map((place) => `<option value="${esc(place.name)}"></option>`)
        .join(
          "",
        )}</datalist></div></div><div class="form-section">${icon("bell")}<div class="form-content"><select name="reminder" aria-label="알림 시간">${[10, 20, 30, 50, 60].map((value) => `<option value="${value}" ${(draft.reminder ?? 30) === value ? "selected" : ""}>${value}분 전</option>`).join("")}</select></div></div><div class="form-section"><span class="event-color-square" style="background:${esc(draft.color || "#039be5")}"></span><div class="form-content"><label>일정 색상</label><div class="color-options">${["#039be5", "#616161", "#0b8043", "#f4511e", "#8e24aa"].map((color) => `<button class="color-option${draft.color === color ? " selected" : ""}" type="button" data-action="select-color" data-color="${color}" style="background:${color}" aria-label="${{ "#039be5": "파란색", "#616161": "회색", "#0b8043": "초록색", "#f4511e": "주황색", "#8e24aa": "보라색" }[color]}" aria-pressed="${draft.color === color}"></button>`).join("")}</div></div></div><div class="form-section">${icon("text")}<div class="form-content"><textarea name="description" aria-label="설명" placeholder="설명 추가" maxlength="1500">${esc(draft.description || "")}</textarea></div></div><div class="form-section">${icon("clip")}<div class="form-content"><p class="secondary">${draft.attachments?.length ? `${draft.attachments.length}개의 첨부파일 유지` : "저장한 뒤 일정 상세에서 Google Drive 파일을 첨부하세요."}</p></div></div><div class="form-section">${icon("lock")}<p class="detail-row-title">공개 상태: 기본값</p></div><div class="form-section">${icon("briefcase")}<p class="detail-row-title">바쁨</p></div></div></form></div>`;
  }
  function openEditor(edit) {
    const draft = edit
      ? clone(currentEvent())
      : {
          title: "",
          date: state.selectedDate,
          start: "17:00",
          end: "18:00",
          color: "#039be5",
          guests: [],
          attachments: [],
          reminder: 30,
          allDay: false,
        };
    openModal({ type: "editor", editId: edit ? currentId : null, draft });
  }
  function saveEvent(form) {
    const formData = new FormData(form),
      draft = modal.draft;
    const title = String(formData.get("title") || "").trim();
    const date = String(formData.get("date") || "");
    const allDay = formData.has("allDay");
    const start = String(formData.get("start") || "17:00"),
      end = String(formData.get("end") || "18:00");
    let error = "";
    if (!title) error = "일정 제목을 입력해 주세요.";
    else if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      error = "일정 날짜를 선택해 주세요.";
    else if (!allDay && start >= end)
      error = "종료 시간을 시작 시간보다 늦게 설정해 주세요.";
    if (error) {
      $("#form-error").textContent = error;
      $("#form-error").scrollIntoView({ block: "nearest" });
      if (!title) form.elements.title.focus();
      return;
    }
    const location = String(formData.get("location") || "").trim();
    const placeEntry = Object.entries(D.places).find(
      ([, place]) => place.name === location,
    );
    const event = {
      ...draft,
      id:
        modal.editId ||
        `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      date,
      start,
      end,
      allDay,
      color: draft.color || "#039be5",
      reminder: Number(formData.get("reminder")),
      guests: String(formData.get("guests") || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
      meet: formData.has("meet"),
      description: String(formData.get("description") || "").trim(),
      place: placeEntry?.[0] || null,
      location: placeEntry ? "" : location,
    };
    const existing = state.events.findIndex((item) => item.id === event.id);
    if (existing >= 0) state.events[existing] = event;
    else state.events.push(event);
    currentId = event.id;
    state.selectedDate = date;
    state.month = date.slice(0, 7);
    save();
    closeModal(false);
    renderDetail();
    toast("일정을 저장했어요.");
  }
  function showPlace(expand = true) {
    const place = placeOf(currentEvent());
    if (!place) return;
    markInteraction();
    if (screen === "maps") {
      $(".maps-screen").classList.remove("is-routing");
      $(".maps-bottom-panel").classList.toggle("is-expanded", expand);
      $(".maps-panel-handle").setAttribute("aria-expanded", String(expand));
      $("#place-info").hidden = false;
      $("#route-info").innerHTML = "";
      $(".maps-place-actions").hidden = false;
    }
    $("#place-info").innerHTML =
      `<div class="place-card"><div class="place-card-head"><h3>${esc(place.name)}</h3><button class="icon-button" data-action="close-place" aria-label="장소 정보 닫기">${icon("close")}</button></div><p class="rating">${place.rating} <span class="stars">★★★★★</span> <span>(${place.reviews})</span></p><p class="secondary">${esc(place.category)}<br>${esc(place.address)}</p><p class="place-review">“${esc(place.review || "안내가 잘 되어 있어 찾기 쉬워요.")}”<span>김** · 2주 전</span></p></div>`;
  }
  function showDirections(mode = "walk") {
    const place = placeOf(currentEvent());
    if (!place) return;
    markInteraction();
    if (screen === "maps") {
      $(".maps-screen").classList.add("is-routing");
      $(".maps-bottom-panel").classList.remove("is-expanded");
      $(".maps-panel-handle").setAttribute("aria-expanded", "false");
      $("#place-info").hidden = true;
      $(".maps-place-actions").hidden = true;
      $("#maps-search").value = place.name;
    }
    DemoMap.route(mode);
    $("#route-info").innerHTML =
      `<section class="route-panel" aria-label="길찾기"><p class="route-origin">${esc(place.origin)}<br>↓ <strong>${esc(place.name)}</strong></p><div class="transport-tabs">${[
        ["walk", "walk", "도보"],
        ["transit", "transit", "대중교통"],
        ["car", "car", "자동차"],
      ]
        .map(
          ([key, symbol, label]) =>
            `<button class="transport-tab${key === mode ? " active" : ""}" data-action="route-mode" data-mode="${key}" aria-pressed="${key === mode}">${icon(symbol)}${label}</button>`,
        )
        .join(
          "",
        )}</div><p class="route-result"><strong>${place[mode]}분</strong> ${mode === "walk" ? "약 750m · 큰길 따라 이동" : mode === "transit" ? "버스 1개 노선 · 도보 포함" : "약 1.2km · 일반 도로"}</p></section>`;
    DemoMap.fitRoute();
    if (screen === "maps") $(".maps-panel-content").scrollTop = 0;
    else
      $("#route-info").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function openDrive() {
    markInteraction();
    if (state.settings.offline) {
      openModal({
        type: "info",
        title: "인터넷 연결이 필요해요",
        text: "파일을 첨부하려면 인터넷 연결을 확인해 주세요.",
        symbol: "offline",
      });
      return;
    }
    openModal({ type: "drive", selected: [], tab: "recent" });
  }
  function saveStorage() {
    if (!modal || modal.saving) return;
    if (modal.enabled && state.settings.offline && !fileSaved(modal.file)) {
      toast("인터넷 연결을 확인한 뒤 다시 저장해 주세요.");
      return;
    }
    modal.saving = true;
    renderModal();
    saveTimer = setTimeout(() => {
      if (modal?.type !== "storage") return;
      const { file, enabled, days } = modal;
      if (enabled)
        state.savedFiles[file] = {
          days,
          expires: expiryDate(days),
          savedAt: D.today,
        };
      else delete state.savedFiles[file];
      save();
      modal.saving = false;
      closeModal();
      refreshAttachments();
      toast(
        enabled
          ? `기기에 저장됨 · ${prettyDate(expiryDate(days))} 보관 만료`
          : "오프라인 저장을 해제했어요.",
      );
    }, 1050);
  }
  function scheduleSuggestions() {
    clearTimeout(suggestionTimer);
    suggestionTimer = null;
    if (!improved || !state.settings.auto) return;
    suggestionTimer = setTimeout(() => {
      suggestionTimer = null;
      const now = Date.now();
      const eligible =
        !modal &&
        screen === "detail" &&
        lastInteraction > 0 &&
        now - lastInteraction >= 4500 &&
        now - lastInteraction < 120000 &&
        now - lastSuggestionAt >= state.settings.interval * 1000 &&
        !document.hidden;
      if (eligible) showSuggestion();
      scheduleSuggestions();
    }, state.settings.interval * 1000);
  }
  function showSuggestion() {
    if (!improved) return;
    if (modal) {
      publish("notice", {
        text: "오른쪽의 열린 창을 닫은 뒤 AI 제안을 띄워 주세요.",
      });
      return;
    }
    const suggestion = clone(
      D.suggestions[Math.floor(Math.random() * D.suggestions.length)],
    );
    const target =
      currentEvent() ||
      state.events.find((event) => event.id === "team-meeting") ||
      state.events[0];
    if (!target) {
      toast("일정을 먼저 추가해 주세요.");
      return;
    }
    if (suggestion.id === "travel") {
      suggestion.before = `‘${target.title}’ · ${target.reminder ?? 30}분 전 알림`;
      suggestion.after = `‘${target.title}’ · 50분 전 알림`;
      suggestion.detail = `선택한 ‘${target.title}’ 일정의 출발 알림을 50분 전으로 설정해, 여유 있게 이동할 수 있어요.`;
    }
    lastSuggestionAt = Date.now();
    openModal({
      type: "suggestion",
      suggestion,
      step: "prompt",
      targetId: target.id,
    });
  }
  function applySuggestion() {
    if (modal?.type !== "suggestion") return;
    const suggestion = modal.suggestion;
    const target = state.events.find((event) => event.id === modal.targetId);
    if (suggestion.id === "travel" && target) target.reminder = 50;
    if (suggestion.id === "reservation") {
      const dinner = state.events.find((event) => event.id === "restaurant");
      if (dinner) dinner.secondaryReminder = "하루 전 · 예약 확인";
      else
        suggestion.result =
          "예약 확인 알림을 준비했어요. 팀 저녁 약속을 먼저 등록해 주세요.";
    }
    if (suggestion.id === "exam") {
      if (!state.events.some((event) => event.id === "cert-registration"))
        state.events.push({
          id: "cert-registration",
          title: "자격증 시험 접수 확인",
          date: "2026-11-02",
          start: "09:00",
          end: "09:30",
          reminder: 10,
          color: "#8e24aa",
          description: "접수 마감: 오늘 오후 6시",
          attachments: [],
        });
    }
    if (suggestion.id === "overlap") {
      const meeting = state.events.find((event) => event.id === "team-meeting");
      if (meeting) {
        meeting.start = "16:30";
        meeting.end = "18:00";
      } else
        suggestion.result =
          "변경할 팀 회의가 없어요. 일정을 먼저 등록해 주세요.";
    }
    save();
    closeModal(false);
    if (screen === "detail") renderDetail(true);
    else renderCalendar();
    toast(suggestion.result);
  }
  function changeMonth(month) {
    closeModal(false);
    state.month = month;
    state.selectedDate = month === "2026-10" ? D.today : `${month}-01`;
    save();
    renderCalendar();
  }
  function resetDemo() {
    clearTimeout(suggestionTimer);
    clearTimeout(saveTimer);
    clearTimeout(toastTimer);
    modal = null;
    lastInteraction = 0;
    lastSuggestionAt = 0;
    detailScroll = 0;
    currentId = null;
    state = freshState();
    mapsSaved = false;
    save();
    closeModal(false);
    activeFileId = null;
    $("#toast").classList.remove("show");
    renderCalendar();
    window.scrollTo(0, 0);
  }
  const actions = {
    "select-date": (button) => {
      state.selectedDate = button.dataset.date;
      save();
      renderCalendar();
    },
    event: (button) => openEvent(button.dataset.id),
    back: () => {
      currentId = null;
      lastInteraction = 0;
      renderCalendar();
    },
    today: () => {
      closeModal(false);
      state.selectedDate = D.today;
      state.month = "2026-10";
      save();
      renderCalendar();
    },
    "change-month": (button) => changeMonth(button.dataset.month),
    "choose-month": () =>
      openModal({ type: "month", year: Number(state.month.slice(0, 4)) }),
    "prev-year": () => {
      modal.year--;
      renderModal();
    },
    "next-year": () => {
      modal.year++;
      renderModal();
    },
    menu: () => openModal({ type: "menu" }),
    search: () => openModal({ type: "search" }),
    account: () =>
      openModal({
        type: "info",
        title: "김민서",
        text: "kim.minseo@example.com · 내 캘린더",
      }),
    "add-event": () => openEditor(false),
    "edit-event": () => openEditor(true),
    "close-modal": () => closeModal(),
    "event-menu": () => openModal({ type: "event-menu" }),
    "delete-confirm": () => openModal({ type: "delete" }),
    "delete-event": () => {
      state.events = state.events.filter((event) => event.id !== currentId);
      save();
      closeModal(false);
      currentId = null;
      renderCalendar();
      toast("일정을 삭제했어요.");
    },
    "select-color": (button) => {
      modal.draft.color = button.dataset.color;
      document.querySelectorAll(".color-option").forEach((el) => {
        el.classList.toggle("selected", el === button);
        el.setAttribute("aria-pressed", String(el === button));
      });
      $(".form-section .event-color-square").style.background =
        button.dataset.color;
    },
    meet: () =>
      openModal({
        type: "info",
        title: "Google Meet",
        text: "회의 링크: meet.google.com/abc-demo-swe",
        symbol: "video",
      }),
    "open-maps": openMaps,
    "return-calendar": returnToCalendar,
    "map-zoom-in": () => {
      DemoMap.zoom(0.2);
      markInteraction();
    },
    "map-zoom-out": () => {
      DemoMap.zoom(-0.2);
      markInteraction();
    },
    "map-reset": () => {
      DemoMap.reset();
      markInteraction();
    },
    "map-pin": () => showPlace(true),
    "close-place": () => {
      if (screen === "maps") showPlace(false);
      else $("#place-info").innerHTML = "";
    },
    "maps-panel": () => {
      const panel = $(".maps-bottom-panel");
      const expanded = panel.classList.toggle("is-expanded");
      $(".maps-panel-handle").setAttribute("aria-expanded", String(expanded));
      if ($(".maps-screen").classList.contains("is-routing"))
        DemoMap.fitRoute();
    },
    "maps-compass": () => {
      DemoMap.reset();
      markInteraction();
    },
    "maps-layers": (button) => {
      const visible = DemoMap.layers();
      button.setAttribute("aria-pressed", String(visible));
    },
    "maps-voice": () =>
      openModal({
        type: "info",
        title: "음성 검색",
        text: "검색창에서 장소 이름을 입력해 보세요.",
        symbol: "mic",
      }),
    "maps-category": (button) => {
      if (button.dataset.category === "home") {
        openModal({
          type: "info",
          title: "집 설정",
          text: "Google 계정에 집 주소를 저장하면 쉽게 찾을 수 있어요.",
          symbol: "home",
        });
        return;
      }
      document
        .querySelectorAll(".maps-categories button")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      toast(`${button.textContent.trim()} 장소를 선택했어요.`);
    },
    "maps-save": (button) => {
      mapsSaved = !mapsSaved;
      button.setAttribute("aria-pressed", String(mapsSaved));
      button.innerHTML = `${icon(mapsSaved ? "check" : "bookmark")}<span>${mapsSaved ? "저장됨" : "저장"}</span>`;
    },
    "maps-share": () =>
      openModal({
        type: "info",
        title: placeOf(currentEvent()).name,
        text: placeOf(currentEvent()).address,
        symbol: "share",
      }),
    "maps-tab": (button) => {
      if (button.dataset.tab === "explore") {
        showPlace(false);
        return;
      }
      if (button.dataset.tab === "saved")
        openModal({
          type: "info",
          title: "내 페이지",
          text: mapsSaved
            ? `저장한 장소 · ${placeOf(currentEvent()).name}`
            : "저장한 장소가 없습니다.",
          symbol: "bookmark",
        });
      else
        openModal({
          type: "info",
          title: "참여",
          text: "방문한 장소의 경험을 공유해 보세요.",
          symbol: "contribute",
        });
    },
    directions: () => showDirections(),
    "route-mode": (button) => showDirections(button.dataset.mode),
    drive: openDrive,
    "drive-tab": (button) => {
      modal.tab = button.dataset.tab;
      document
        .querySelectorAll(".drive-tab")
        .forEach((tab) => tab.classList.toggle("active", tab === button));
      // 동일한 로컬 샘플 문서를 각 탭에서 재사용합니다.
      $("#drive-files").innerHTML = driveFiles($("#drive-search").value);
    },
    "attach-files": () => {
      if (!modal?.selected.length) return;
      if (state.settings.offline) {
        toast("인터넷 연결을 확인한 뒤 파일을 첨부해 주세요.");
        return;
      }
      const event = currentEvent();
      event.attachments = [
        ...new Set([...(event.attachments || []), ...modal.selected]),
      ];
      save();
      closeModal();
      refreshAttachments();
      markInteraction();
      toast("일정에 파일을 첨부했어요.");
    },
    storage: (button) => {
      if (!improved) return;
      markInteraction();
      const file = button.dataset.file;
      openModal({
        type: "storage",
        file,
        enabled: true,
        days: state.savedFiles[file]?.days || 7,
      });
    },
    "save-storage": saveStorage,
    "open-file": (button) => {
      markInteraction();
      const id = button.dataset.file;
      if (!improved) {
        openExternalDrive(id);
        return;
      }
      openModal(
        state.settings.offline && !fileSaved(id)
          ? { type: "network" }
          : { type: "viewer", file: id },
      );
    },
    "suggestion-detail": () => {
      modal.step = "detail";
      renderModal();
      $("#overlay .filled-button")?.focus();
    },
    "apply-suggestion": applySuggestion,
    "demo-meeting": () => {
      const event = state.events.find((event) => event.id === "team-meeting");
      if (event) openEvent(event.id);
      else {
        closeModal();
        toast("팀 회의 일정이 없어요.");
      }
    },
  };
  document.addEventListener("click", (event) => {
    if (
      event.target.matches(".native-picker input") &&
      event.target.showPicker
    ) {
      try {
        event.target.showPicker();
      } catch (_) {
        /* 브라우저 기본 입력 유지 */
      }
    }
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === "dismiss-backdrop") {
      if (event.target === button) closeModal();
      return;
    }
    actions[action]?.(button);
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id === "maps-search-form") {
      event.preventDefault();
      const query = $("#maps-search").value.trim();
      const place = placeOf(currentEvent());
      if (!query || `${place.name} ${place.address}`.includes(query))
        showPlace();
      else toast("이 지도에 표시된 장소 이름으로 검색해 주세요.");
      return;
    }
    if (event.target.id === "event-form") {
      event.preventDefault();
      saveEvent(event.target);
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "drive-search")
      $("#drive-files").innerHTML = driveFiles(event.target.value);
    if (event.target.id === "event-search")
      $("#search-results").innerHTML = searchResults(event.target.value);
  });
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (input.dataset.selectFile && modal?.type === "drive") {
      const id = input.dataset.selectFile;
      modal.selected = input.checked
        ? [...new Set([...modal.selected, id])]
        : modal.selected.filter((item) => item !== id);
      input.closest(".drive-file").classList.toggle("selected", input.checked);
      $("#selected-count").textContent = `${modal.selected.length}개 선택됨`;
      $('[data-action="attach-files"]').disabled = modal.selected.length === 0;
    }
    if (input.id === "storage-enabled") {
      modal.enabled = input.checked;
      $("#retention-period").disabled = !input.checked;
      $("#storage-expiry").innerHTML = `${storageExpiryText()}`;
    }
    if (input.id === "retention-period") {
      modal.days = Number(input.value);
      $("#storage-expiry").innerHTML = `${storageExpiryText()}`;
    }
    if (modal?.type === "editor") {
      const form = $("#event-form");
      if (input.name === "allDay") {
        form.elements.start.disabled = input.checked;
        form.elements.end.disabled = input.checked;
      }
      if (form.elements.date.value)
        $("#editor-date-label").textContent = prettyDate(
          form.elements.date.value,
        );
      $("#editor-start-label").textContent = form.elements.allDay.checked
        ? "—"
        : shortTime(form.elements.start.value);
      $("#editor-end-label").textContent = form.elements.allDay.checked
        ? "—"
        : shortTime(form.elements.end.value);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (modal) closeModal();
      else if (["maps", "drive-app"].includes(screen)) returnToCalendar();
      else if (screen === "detail") actions.back();
      return;
    }
    if (event.key === "Tab" && modal) {
      const focusable = [
        ...document.querySelectorAll(
          "#overlay button:not(:disabled), #overlay input:not(:disabled), #overlay select:not(:disabled), #overlay textarea, #overlay iframe",
        ),
      ].filter((el) => el.offsetParent !== null);
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.classList.contains("calendar-cell")
    ) {
      event.preventDefault();
      actions["select-date"](event.target);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(suggestionTimer);
      suggestionTimer = null;
    } else scheduleSuggestions();
  });
  // file://의 origin은 null이므로 발신 Window와 고정 channel을 검증합니다.
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.data?.channel !== CHANNEL)
      return;
    const { command } = event.data;
    if (command === "configure") applySettings(event.data.settings);
    if (command === "reset") resetDemo();
    if (command === "start") startScenario(event.data.scenario);
    if (command === "suggest" && improved) showSuggestion();
  });
  renderCalendar();
  publish("ready");
})();
