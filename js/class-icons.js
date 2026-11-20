(() => {
  const common = (body) => `<svg class="thaos-class-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const icons = {
    warrior: common('<path d="M17 49 49 17M22 12l30 30M13 44l7 7M44 13l7 7"/><path d="m15 15 9-3-3 9M49 49l-9 3 3-9"/>'),
    monk: common('<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="9"/><path d="M32 6v8M32 50v8M6 32h8M50 32h8M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6"/>'),
    bard: common('<path d="M38 12v31a8 8 0 1 1-5-7.4V18l17-4v25a8 8 0 1 1-5-7.4V10z"/>'),
    ranger: common('<circle cx="32" cy="32" r="19"/><circle cx="32" cy="32" r="6"/><path d="M32 5v12M32 47v12M5 32h12M47 32h12"/>'),
    archer: common('<path d="M18 9c16 10 16 36 0 46M18 9c-8 13-8 33 0 46M18 32h34"/><path d="m45 26 8 6-8 6"/>'),
    mage: common('<path d="m32 7 5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/><path d="M47 44l5 5M12 48l5-5M48 12l-5 5"/>'),
    wizard: common('<path d="M10 15h17c4 0 5 3 5 6v31c0-4-3-7-8-7H10zM54 15H37c-4 0-5 3-5 6v31c0-4 3-7 8-7h14z"/><path d="m43 23 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>'),
    warlock: common('<path d="M8 32s9-15 24-15 24 15 24 15-9 15-24 15S8 32 8 32Z"/><circle cx="32" cy="32" r="6"/><path d="M20 11l4 7M44 11l-4 7M20 53l4-7M44 53l-4-7"/>'),
    priest: common('<circle cx="32" cy="32" r="20"/><path d="M32 14v36M20 27h24"/><path d="M11 32H5M59 32h-6M32 11V5M32 59v-6"/>'),
    druid: common('<path d="M49 10C30 11 16 21 15 39c12 2 28-3 34-29Z"/><path d="M14 53c7-15 16-24 33-36M25 32c4 1 8 4 11 8"/>'),
    summoner: common('<circle cx="20" cy="23" r="8"/><circle cx="44" cy="23" r="8"/><circle cx="32" cy="45" r="8"/><path d="M27 27l7 12M37 27l-7 12M28 23h8"/>'),
    rogue: common('<path d="M32 6 42 19 55 23 45 34 46 50 32 43 18 50 19 34 9 23 22 19Z"/><path d="M22 31h20M26 24l6 7 6-7M26 38l6-7 6 7"/>'),
    mechanist: common('<circle cx="32" cy="32" r="10"/><path d="M32 7v7M32 50v7M7 32h7M50 32h7M14 14l5 5M45 45l5 5M50 14l-5 5M19 45l-5 5"/><circle cx="32" cy="32" r="3"/>')
  };
  window.thaosClassIcon = (id) => icons[id] || common('<circle cx="32" cy="32" r="18"/>');
})();
