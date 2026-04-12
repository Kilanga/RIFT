## RIFT - Easter Eggs Implementation Summary

### Status

4 hidden easter egg titles are currently implemented and active.

### Implemented Titles

1. Pentakill
- Condition: kill 5 enemies in 4 turns max.
- Status: implemented and persisted in `meta.easterEggTitles` at trigger time.

2. Shiny Encounter
- Condition: every 8192 combat rooms.
- Status: implemented (counter increments on combat rooms only).
- Note: visual yellow enemy skin effect is still to be added in rendering.

3. Leroy Jenkins
- Condition: 20 consecutive deaths before reaching a boss.
- Status: implemented.
- Run behavior: on next run, first combat triggers chaos spawn on free cells.

4. Arrow in the Knee
- Condition: die from a ranged attack.
- Status: implemented.

### Architecture (current)

- `utils/easterEggs.js`
  - Catalog of 4 hidden easter eggs
  - `checkNewEasterEggTitles(meta, run, extra)`
  - `getEasterEggById(id)`
  - `formatEasterEggText(egg, lang, params)`

- `store/slices/combatSlice.js`
  - Tracks ranged lethal hits (`lastKillingAttackType`)
  - Handles Pentakill unlock persistence

- `store/slices/navigationSlice.js`
  - Stores `easterEggTitles`, `totalCombats`, `deathsBeforeBossStreak`
  - Checks unlocks on death and logs FR/EN based on preferred language

- `store/slices/progressionSlice.js`
  - Increments `totalCombats` on combat-type rooms only
  - Applies Leroy chaos spawn once via `leroyChaosConsumed`

### Test Checklist

- [ ] Pentakill: kill 5 enemies in <= 4 turns and verify unlock
- [ ] Shiny: simulate/force `totalCombats` multiple of 8192 and verify unlock
- [ ] Arrow in the Knee: die to ranged attacker and verify unlock
- [ ] Leroy Jenkins: do 20 pre-boss deaths, then verify chaos in first combat of next run
- [ ] Verify unlock logs show FR/EN text according to language

### Build Status

- Export validation passed after fixes.
