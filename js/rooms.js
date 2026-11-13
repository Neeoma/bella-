/* Bella Paint — illustrated SVG rooms + paint bucket.
   Walls read their fill from CSS variables (--wall, --accent, --trim, --sheen)
   set on a parent element, so recolouring is just a style change. */
(function () {
  const shell = `
    <defs>
      <linearGradient id="SHEEN" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".9"/>
        <stop offset=".45" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".25"/>
      </linearGradient>
      <linearGradient id="FLOOR" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8a6a4c"/><stop offset="1" stop-color="#b08a63"/>
      </linearGradient>
    </defs>
    <!-- ceiling -->
    <polygon points="0,0 800,0 650,60 150,60" fill="#f3efe8"/>
    <!-- side walls -->
    <polygon class="paint" points="0,0 150,60 150,340 0,430" style="fill:var(--wall)"/>
    <polygon class="paint" points="800,0 650,60 650,340 800,430" style="fill:var(--wall)"/>
    <polygon points="0,0 150,60 150,340 0,430" fill="#000" opacity=".07"/>
    <polygon points="800,0 650,60 650,340 800,430" fill="#000" opacity=".16"/>
    <!-- back (feature) wall -->
    <rect class="paint" x="150" y="60" width="500" height="280" style="fill:var(--accent)"/>
    <!-- sheen -->
    <g style="opacity:var(--sheen);transition:opacity .5s">
      <rect x="150" y="60" width="500" height="280" fill="url(#SHEEN)"/>
      <polygon points="0,0 150,60 150,340 0,430" fill="url(#SHEEN)"/>
    </g>
    <!-- floor -->
    <polygon points="0,430 150,340 650,340 800,430 800,500 0,500" fill="url(#FLOOR)"/>
    <g stroke="#000" stroke-opacity=".08">
      <line x1="150" y1="340" x2="0" y2="470"/><line x1="275" y1="340" x2="170" y2="500"/>
      <line x1="400" y1="340" x2="400" y2="500"/><line x1="525" y1="340" x2="630" y2="500"/>
      <line x1="650" y1="340" x2="800" y2="470"/>
    </g>
    <!-- skirting + cornice (trim) -->
    <rect class="paint" x="150" y="328" width="500" height="12" style="fill:var(--trim)"/>
    <polygon class="paint" points="0,416 150,328 150,340 0,430" style="fill:var(--trim)"/>
    <polygon class="paint" points="800,416 650,328 650,340 800,430" style="fill:var(--trim)"/>
    <rect class="paint" x="150" y="60" width="500" height="6" style="fill:var(--trim)"/>
    <!-- window on left wall -->
    <polygon class="paint" points="36,92 112,116 112,262 36,280" style="fill:var(--trim)"/>
    <polygon points="44,104 104,123 104,254 44,269" fill="#cfe3ea"/>
    <polygon points="44,104 104,123 104,254 44,269" fill="#fff" opacity=".35"/>
    <line x1="74" y1="113" x2="74" y2="262" style="stroke:var(--trim)" stroke-width="4"/>
    <polygon points="112,340 150,340 330,500 120,500" fill="#fff" opacity=".1"/>
  `;

  const plant = (x, y) => `
    <g transform="translate(${x},${y})">
      <path d="M0,0 C-30,-40 -34,-80 -16,-112 C-8,-76 -2,-40 0,0Z" fill="#3f5b45"/>
      <path d="M0,0 C26,-36 40,-70 30,-104 C14,-74 4,-38 0,0Z" fill="#4f7355"/>
      <path d="M0,0 C-4,-50 2,-96 8,-128 C16,-92 10,-46 0,0Z" fill="#5f8556"/>
      <path d="M-20,0 h40 l-6,44 h-28z" fill="#d8cdbd"/>
    </g>`;

  const scenes = {
    living: `
      <ellipse cx="400" cy="440" rx="250" ry="34" fill="#e9dfd0" opacity=".85"/>
      <rect x="340" y="110" width="120" height="90" fill="#f7f3ec" stroke="#2a2522" stroke-width="5"/>
      <circle cx="384" cy="160" r="22" fill="#c98a62"/><rect x="398" y="134" width="40" height="48" fill="#27406b" opacity=".85"/>
      <rect x="230" y="262" width="340" height="96" rx="16" fill="#ded5c6"/>
      <rect x="214" y="290" width="372" height="92" rx="18" fill="#ece5d9"/>
      <rect x="214" y="290" width="40" height="92" rx="14" fill="#ded5c6"/><rect x="546" y="290" width="40" height="92" rx="14" fill="#ded5c6"/>
      <rect x="270" y="278" width="66" height="50" rx="10" fill="#b5533c"/><rect x="466" y="278" width="66" height="50" rx="10" fill="#3f5b45"/>
      <rect x="236" y="382" width="8" height="20" fill="#2a2522"/><rect x="556" y="382" width="8" height="20" fill="#2a2522"/>
      <rect x="330" y="412" width="140" height="12" rx="6" fill="#2a2522"/>
      <rect x="346" y="424" width="6" height="30" fill="#2a2522"/><rect x="448" y="424" width="6" height="30" fill="#2a2522"/>
      <line x1="640" y1="176" x2="640" y2="400" stroke="#2a2522" stroke-width="4"/>
      <path d="M612,176 h56 l-12,-46 h-32z" fill="#f4e9c9"/><ellipse cx="640" cy="402" rx="24" ry="6" fill="#2a2522"/>
      ${plant(176, 380)}`,
    bedroom: `
      <ellipse cx="400" cy="452" rx="290" ry="30" fill="#e9dfd0" opacity=".8"/>
      <line x1="250" y1="60" x2="250" y2="150" stroke="#2a2522" stroke-width="2"/>
      <path d="M232,150 h36 l8,30 h-52z" fill="#d9b25f"/>
      <rect x="290" y="176" width="300" height="130" rx="60" fill="#ded5c6"/>
      <rect x="290" y="240" width="300" height="100" fill="#ded5c6"/>
      <rect x="270" y="318" width="340" height="96" rx="10" fill="#f6f2ea"/>
      <rect x="270" y="356" width="340" height="62" rx="10" fill="#5d7491"/>
      <rect x="310" y="290" width="110" height="46" rx="16" fill="#fff"/><rect x="460" y="290" width="110" height="46" rx="16" fill="#fff"/>
      <rect x="282" y="414" width="10" height="20" fill="#2a2522"/><rect x="588" y="414" width="10" height="20" fill="#2a2522"/>
      <rect x="196" y="340" width="60" height="62" rx="4" fill="#6b3a2e"/><rect x="204" y="350" width="44" height="18" fill="#8e4a2f"/>
      <rect x="214" y="300" width="24" height="40" rx="10" fill="#f4e9c9"/>
      <rect x="622" y="340" width="60" height="62" rx="4" fill="#6b3a2e"/><rect x="630" y="350" width="44" height="18" fill="#8e4a2f"/>
      <rect x="636" y="318" width="32" height="22" rx="3" fill="#e9dcc3"/>`,
    dining: `
      <line x1="330" y1="60" x2="330" y2="150" stroke="#2a2522" stroke-width="2"/>
      <line x1="470" y1="60" x2="470" y2="130" stroke="#2a2522" stroke-width="2"/>
      <circle cx="330" cy="168" r="20" fill="#f4e9c9"/><circle cx="470" cy="148" r="20" fill="#f4e9c9"/>
      <rect x="196" y="120" width="70" height="150" fill="#f7f3ec" stroke="#2a2522" stroke-width="4"/>
      <path d="M206,250 q26,-80 50,-110 v110z" fill="#3f5b45" opacity=".8"/>
      <rect x="540" y="230" width="90" height="110" rx="4" fill="#6b3a2e"/>
      <rect x="548" y="240" width="74" height="40" fill="#8e4a2f"/><rect x="548" y="288" width="74" height="40" fill="#8e4a2f"/>
      <ellipse cx="400" cy="448" rx="260" ry="30" fill="#e9dfd0" opacity=".8"/>
      <rect x="262" y="300" width="56" height="70" rx="12" fill="#2a2522"/><rect x="482" y="300" width="56" height="70" rx="12" fill="#2a2522"/>
      <rect x="372" y="290" width="56" height="60" rx="12" fill="#2a2522"/>
      <rect x="230" y="356" width="340" height="16" rx="6" fill="#c98a62"/>
      <rect x="250" y="372" width="10" height="74" fill="#8e4a2f"/><rect x="540" y="372" width="10" height="74" fill="#8e4a2f"/>
      <rect x="384" y="326" width="32" height="30" rx="6" fill="#ece5d9"/>
      <path d="M400,326 C386,300 392,282 400,270 C408,282 414,300 400,326Z" fill="#5f8556"/>
      <rect x="290" y="386" width="52" height="60" rx="10" fill="#3a3430"/><rect x="458" y="386" width="52" height="60" rx="10" fill="#3a3430"/>
      ${plant(690, 420)}`
  };

  let n = 0;
  /* Unique gradient ids per instance so several rooms can share a page. */
  function roomSVG(scene, label) {
    const k = ++n;
    const body = (shell + (scenes[scene] || scenes.living))
      .replace(/SHEEN/g, 'sheen' + k).replace(/FLOOR/g, 'floor' + k);
    return `<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label || 'Illustrated room'}">${body}</svg>`;
  }

  function bucketSVG(hex, light) {
    const band = light ? '#15120f' : '#f4efe6';
    return `<svg viewBox="0 0 200 220" aria-hidden="true">
      <ellipse cx="100" cy="204" rx="70" ry="9" fill="#000" opacity=".12"/>
      <path d="M34,60 L46,196 Q100,212 154,196 L166,60Z" class="bucket-body" style="fill:${hex}"/>
      <path d="M34,60 L46,196 Q70,204 84,205 L74,60Z" fill="#fff" opacity=".14"/>
      <path d="M140,60 L132,203 Q146,200 154,196 L166,60Z" fill="#000" opacity=".14"/>
      <ellipse cx="100" cy="60" rx="66" ry="15" fill="#d9d5cf"/>
      <ellipse cx="100" cy="60" rx="57" ry="11" class="bucket-body" style="fill:${hex}"/>
      <ellipse cx="88" cy="57" rx="26" ry="4" fill="#fff" opacity=".25"/>
      <path d="M36,66 C20,150 180,150 164,66" fill="none" stroke="#a9a49c" stroke-width="3"/>
      <rect x="62" y="112" width="76" height="50" rx="3" fill="${band}" opacity=".92"/>
      <text x="100" y="135" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="${light ? '#f4efe6' : '#15120f'}">Bella</text>
      <text x="100" y="151" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" letter-spacing="2.5" fill="${light ? '#f4efe6' : '#15120f'}">PAINT</text>
    </svg>`;
  }

  window.Bella.roomSVG = roomSVG;
  window.Bella.bucketSVG = bucketSVG;
  window.Bella.SCENES = [{ id: 'living', label: 'Living room' }, { id: 'bedroom', label: 'Bedroom' }, { id: 'dining', label: 'Dining room' }];
})();
