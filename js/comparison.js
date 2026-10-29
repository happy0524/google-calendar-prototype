/* 공통 제어만 postMessage로 전달합니다. 앱 데이터/DOM은 iframe마다 독립적입니다. */
(() => {
  "use strict";
  const CHANNEL = "calendar-comparison-v2";
  const SETTINGS_KEY = `calendar-course-comparison-controls-v2:${new URL("./", window.location.href).pathname}`;
  const $ = (selector) => document.querySelector(selector);
  const frames = { asis: $("#asis-frame"), tobe: $("#tobe-frame") };
  const defaults = () => ({ offline: false, auto: false, interval: 30 });
  let settings = defaults();
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (
      stored &&
      typeof stored.offline === "boolean" &&
      typeof stored.auto === "boolean" &&
      [15, 30, 60, 90].includes(stored.interval)
    )
      settings = stored;
  } catch (_) {
    /* 저장이 제한되어도 현재 탭에서 시연할 수 있습니다. */
  }
  function persist() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {}
  }
  function send(mode, command, payload = {}) {
    frames[mode].contentWindow.postMessage(
      { channel: CHANNEL, command, ...payload },
      "*",
    );
  }
  function both(command, payload = {}) {
    Object.keys(frames).forEach((mode) => send(mode, command, payload));
  }
  function syncControls() {
    $("#offline-toggle").checked = settings.offline;
    $("#auto-toggle").checked = settings.auto;
    $("#suggestion-interval").value = settings.interval;
  }
  function configure() {
    persist();
    both("configure", { settings });
  }
  function setStatus(text) {
    $("#comparison-status").textContent = text;
  }
  window.addEventListener("message", (event) => {
    const mode = Object.keys(frames).find(
      (key) => frames[key].contentWindow === event.source,
    );
    if (!mode || event.data?.channel !== CHANNEL) return;
    if (event.data.type === "ready") send(mode, "configure", { settings });
    if (event.data.type === "view") {
      const label = $(`#${mode}-location`);
      label.textContent =
        event.data.screen === "maps"
          ? "Google Maps"
          : event.data.screen === "drive-app"
            ? "Google Drive"
            : "Calendar";
      label.classList.toggle(
        "is-external",
        ["maps", "drive-app"].includes(event.data.screen),
      );
    }
    if (event.data.type === "notice") setStatus(event.data.text);
  });
  Object.entries(frames).forEach(([mode, frame]) =>
    frame.addEventListener("load", () => send(mode, "configure", { settings })),
  );
  $("#offline-toggle").addEventListener("change", (event) => {
    settings.offline = event.target.checked;
    configure();
    setStatus(
      settings.offline
        ? "오프라인 시연 중 · 양쪽에서 같은 첨부파일을 열어 보세요."
        : "온라인 시연으로 돌아왔습니다.",
    );
  });
  $("#auto-toggle").addEventListener("change", (event) => {
    settings.auto = event.target.checked;
    configure();
    setStatus(
      settings.auto
        ? "오른쪽에서만 자동 제안을 표시합니다."
        : "AI 자동 제안을 껐습니다.",
    );
  });
  $("#suggestion-interval").addEventListener("change", (event) => {
    settings.interval = Number(event.target.value);
    configure();
  });
  $("#suggest-now").addEventListener("click", () => send("tobe", "suggest"));
  $("#reset-demo").addEventListener("click", () => {
    settings = defaults();
    persist();
    syncControls();
    both("reset");
    document
      .querySelectorAll("[data-scenario]")
      .forEach((button) => button.classList.remove("active"));
    setStatus(
      "양쪽 데이터·화면·팝업을 초기화했습니다. 온라인 · 자동 제안 꺼짐",
    );
  });
  document.querySelectorAll("[data-scenario]").forEach((button) =>
    button.addEventListener("click", () => {
      const scenario = button.dataset.scenario;
      document
        .querySelectorAll("[data-scenario]")
        .forEach((item) => item.classList.toggle("active", item === button));
      both("start", { scenario });
      setStatus(
        {
          map: "같은 장소 · 왼쪽은 지도 앱으로, 오른쪽은 일정 안에서 확인하세요.",
          attachment:
            "같은 첨부파일 · 오른쪽에서 저장한 뒤 오프라인 열람을 비교하세요.",
          ai: "같은 일정 · 왼쪽에서 직접 수정하고 오른쪽의 AI 제안을 확인하세요.",
        }[scenario],
      );
    }),
  );
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = Icons.icon(el.dataset.icon);
  });
  syncControls();
})();
