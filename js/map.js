/* 로컬 SVG 지도. 외부 타일/위치 조회 없이 확대, 이동, 핀, 예시 경로를 표시합니다. */
window.DemoMap = (() => {
  const escape = (s) =>
    String(s).replace(
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
  const blocks = [
    [111, 98, 90, 56],
    [215, 98, 72, 56],
    [306, 98, 63, 56],
    [477, 85, 69, 66],
    [560, 85, 98, 66],
    [104, 189, 94, 73],
    [215, 189, 73, 73],
    [309, 185, 67, 77],
    [471, 186, 78, 53],
    [568, 184, 99, 56],
    [104, 305, 83, 67],
    [213, 305, 57, 67],
    [294, 312, 65, 62],
    [469, 313, 67, 54],
    [557, 307, 113, 68],
    [106, 409, 82, 65],
    [211, 410, 72, 63],
    [315, 410, 61, 65],
    [468, 411, 74, 66],
    [561, 411, 107, 63],
    [109, 512, 91, 52],
    [219, 512, 67, 52],
    [471, 510, 75, 55],
    [563, 510, 100, 56],
  ];
  function markup(place) {
    const main = escape(place.short || place.name);
    return `<div class="map-wrap">
      <div class="map-viewport" id="demo-map" role="region" aria-label="${escape(place.name)} 지도. 드래그하여 이동할 수 있습니다.">
        <div class="map-world" id="map-world">
          <svg class="map-svg" viewBox="0 0 800 600" aria-hidden="true">
            <rect width="800" height="600" fill="#ecebe7"/>
            <path d="M0 50h800M0 580h800M50 0v600M742 0v600" stroke="#fff" stroke-width="22"/>
            <path d="M75 0v600M695 0v600M0 168h800M0 390h800M0 489h800M196 0v600M296 0v600M454 0v600M550 0v600" stroke="#fff" stroke-width="13"/>
            <path d="M399-20c-8 91-10 163 0 247s15 197 0 393" stroke="#d9c7a0" stroke-width="38" fill="none"/>
            <path d="M399-20c-8 91-10 163 0 247s15 197 0 393" stroke="#fff3ce" stroke-width="31" fill="none"/>
            <path d="M-30 280c144 11 219-1 339 0s354 17 520-1" stroke="#dedbd3" stroke-width="25" fill="none"/>
            <path d="M-30 280c144 11 219-1 339 0s354 17 520-1" stroke="#fff" stroke-width="20" fill="none"/>
            ${blocks.map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${i % 4 === 0 ? "#e4e1db" : "#e1dfda"}" stroke="#d6d3cd" stroke-width="1"/>`).join("")}
            <path d="M317 19h60v128h-60zM563 19h101v46H563z" fill="#c8dfba" stroke="#b9d5a9"/>
            <path d="M13 305h46v173H13zM576 324h80v37h-80z" fill="#d2e5c5"/>
            <rect x="308" y="189" width="66" height="70" rx="4" fill="#d0e3bf" stroke="#bed6aa"/>
            <path d="m315 247 17-22 32-18m-33 18 25 27" stroke="#eaf0df" stroke-width="3" fill="none"/>
            <rect x="317" y="511" width="60" height="54" rx="3" fill="#d2e5c5"/>
            <rect x="416" y="228" width="25" height="34" rx="3" fill="#d2dce8" stroke="#b6c8df"/>
            <path d="M421 230v30M426 230v30M431 230v30M436 230v30" stroke="#b7c7db" stroke-width="1"/>
            <g font-family="Arial,Apple SD Gothic Neo,sans-serif" font-size="10" fill="#878681" text-anchor="middle">
              <text x="251" y="221">도서관</text><text x="515" y="211">학생회관</text>
              <text x="599" y="205">카페</text><text x="322" y="340">공학관</text>
              <text x="508" y="344">정문</text><text x="612" y="447">편의점</text>
              <text x="348" y="104" fill="#6f9460">녹지공원</text><text x="341" y="217" fill="#73915d">녹지쉼터</text>
              <text x="343" y="540" fill="#6f9460">쉼터</text>
              <text x="244" y="441">서강빌딩</text><text x="149" y="440">은행</text>
            </g>
            <g font-family="Arial,Apple SD Gothic Neo,sans-serif" font-size="10" fill="#9a9484"><text x="405" y="351" transform="rotate(90 405 351)">백범로</text><text x="498" y="285">서강로</text><text x="204" y="285">백범로길</text></g>
            <g id="map-route" style="display:none">
              <path d="M288 452 288 390 401 390 405 281 420 281" fill="none" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
              <path id="map-route-line" d="M288 452 288 390 401 390 405 281 420 281" fill="none" stroke="#4285f4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 8"/>
              <circle cx="288" cy="452" r="7" fill="#4285f4" stroke="white" stroke-width="3"/>
            </g>
            <g font-family="Arial,Apple SD Gothic Neo,sans-serif" text-anchor="middle"><rect x="${420 - Math.min(main.length * 5.5, 105) / 2}" y="288" width="${Math.min(main.length * 5.5, 105)}" height="20" rx="4" fill="white" opacity=".94"/><text x="420" y="302" fill="#b43c31" font-size="11" font-weight="600">${main}</text></g>
            <g transform="translate(279 454)"><rect width="17" height="17" rx="4" fill="#b98a2d"/><text x="8.5" y="12" fill="white" font-size="10" text-anchor="middle">6</text></g>
            <text x="300" y="467" fill="#717474" font-family="Arial,Apple SD Gothic Neo,sans-serif" font-size="10">${escape(place.origin)}</text>
          </svg>
          <button class="map-pin" data-action="map-pin" aria-label="${escape(place.name)} 장소 정보"><svg viewBox="0 0 36 46" aria-hidden="true"><path fill="#ea4335" stroke="#fff" stroke-width="1.5" d="M18 1C8.6 1 1 8.6 1 18c0 12 17 26 17 26s17-14 17-26C35 8.6 27.4 1 18 1Z"/><circle cx="18" cy="17" r="6" fill="#a52714"/></svg></button>
        </div>
        <button class="map-recenter" data-action="map-reset" aria-label="지도 중심으로 이동">${Icons.icon("target")}</button>
        <div class="map-controls"><button data-action="map-zoom-in" aria-label="지도 확대">${Icons.icon("plus")}</button><button data-action="map-zoom-out" aria-label="지도 축소">${Icons.icon("minus")}</button></div>
        <div class="map-wordmark">Google</div><div class="map-disclaimer">100m ━━━</div>
      </div>
      <div class="map-actions"><span class="map-hint">드래그하여 이동 · 핀을 눌러 장소 확인</span><button class="text-button outlined-button" data-action="directions">${Icons.icon("route")}길찾기</button></div>
      <div id="place-info"></div><div id="route-info"></div>
    </div>`;
  }
  let view = null;
  function attach(onInteraction) {
    const viewport = document.getElementById("demo-map");
    if (!viewport) {
      view = null;
      return;
    }
    const world = viewport.querySelector(".map-world");
    view = { zoom: 0.95, x: 0, y: 0, world, viewport };
    update();
    let drag = null;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      drag = { x: e.clientX, y: e.clientY, startX: view.x, startY: view.y };
      viewport.setPointerCapture(e.pointerId);
      onInteraction();
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!drag) return;
      view.x = Math.max(-210, Math.min(210, drag.startX + e.clientX - drag.x));
      view.y = Math.max(-155, Math.min(155, drag.startY + e.clientY - drag.y));
      update();
    });
    const stop = () => {
      drag = null;
    };
    viewport.addEventListener("pointerup", stop);
    viewport.addEventListener("pointercancel", stop);
    viewport.addEventListener("lostpointercapture", stop);
  }
  function update() {
    if (view)
      view.world.style.transform = `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) scale(${view.zoom})`;
  }
  function zoom(delta) {
    if (view) {
      view.zoom = Math.max(0.75, Math.min(2, view.zoom + delta));
      update();
    }
  }
  function reset() {
    if (view) {
      view.x = 0;
      view.y = 0;
      view.zoom = 0.95;
      update();
    }
  }
  function route(mode = "walk") {
    const path = document.getElementById("map-route");
    if (path) {
      path.style.display = "";
      document
        .getElementById("map-route-line")
        .setAttribute("stroke-dasharray", mode === "walk" ? "1 8" : "none");
    }
  }
  return { markup, attach, zoom, reset, route };
})();
