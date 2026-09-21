## 1.3
- Implemented support for the "Square Grid Diagonals" core setting.
- Added an adjustable scale override setting. (Per Client)
- Added an option to autoscale depending on the zoom so the hover info is always readable.

## 1.2
- Moved all hover panels to a single shared overlay container drawn above the token layer, so info panels can no longer render underneath adjacent tokens.
- Dropped lib-wrapper from the module's required dependencies.
- Rewrote the equipment panel to show one weapon per line instead of a single truncated comma-separated line.
- Made the equipment and DV panels size their width dynamically to fit their content (equipment capped with wrapping, DV growing so the tinted DV number always stays visible).
- Adding scaling code to ensure the Hover Info panels stay the correct size no matter the scene grid size settings.
- Bunch of bug fixes.