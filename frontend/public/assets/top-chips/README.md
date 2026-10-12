# Chip assets (top view)

Top-down view of each chip, for bet buttons and chip selectors.
Same colors and values as `/assets/chips/` (3D stacking view).

One file per denomination, named `<value>.svg`.
Values match `CHIP_DENOMINATIONS` in `src/utils/chipUtils.ts`:

`1.svg` `5.svg` `25.svg` `100.svg` `500.svg` `1000.svg` `5000.svg`

Served at `/assets/chips-top/<file>`. viewBox is 200x200 (square), with a soft shadow included.
