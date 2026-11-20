> Архивные заметки прошлой сборки. Для текущей Lite Stable используйте `DEPLOY_FIRST.md` и `LITE_RELEASE_NOTES.md`.

# THAOS V14.2 — activity art + interactive Core manual

## Preserved
All previously existing files, including classes, races, class art, world data, Pact, selection, and all JS except archived `core.html` were preserved. Existing `js/core-modules.js` stays as a legacy reference; the new cards no longer load it.

## Activities
- Hunt → `assets/activities/hunt.webp` (defeated dragon skull)
- Event → `assets/activities/event.webp` (colossal dead remains)
- Competition → `assets/activities/competition.webp` (combatants in ruins)
- All three are new 1916×821 static cinematic banners with space on the left for text. CSS renders them `background-size: cover`, without distortion or an obstructing mask.

## Core navigation
`core.html` now opens separate static pages:
- core-checks.html — 2d20, resonance, doubles, conditions, combat checks
- core-character.html — character building, point-buy, Health/Speed/Mana
- core-combat.html — actions, grid, reactions, initiative
- core-magic.html — Circle costs and spellcasting, spell preparation and sources
- core-states.html — stacks, condition timing, exhaustion, control
- core-gear.html — inventory, equipment, quality, durability, consumables
- core-progression.html — 1–10 milestones, paths, breakthrough, true classes

Each page contains complete instructional HTML, anchored TOC, working static-file JS demo, previous/next links, and responsive CSS.

## Rules status
**Agreed or previously established**: 2d20 roll + modifiers; +3/-3 conditions as existing Core baseline; critical resonance natural 17-20 both; doubles; six attributes; 8 point-buy; base Mana 5; magic normal cost = Circle and boosted cost=2×Circle; circles unlock 1/3/5/7/9; default inventory 10 slots, ordinary bags +3/+5; reaction once per round; action trades; 1m per tile; 10 levels and Paths.

**Intentionally marked as proposals pending playtesting**: exact mana growth beyond level 1, rest recovery, casting portfolios per class, crit bonus effects, numerical initiative tie-breaking, exhaustive condition penalties, magical attunement limit and price list.

## Validation
Before publishing, check each manual in the browser and open all module routes, artwork, and demos. GitHub Pages supports these pages without a backend.
