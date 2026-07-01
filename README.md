<p align="center">
  <img src = "https://i.imgur.com/zVTtkMw.png" width=700>
</p>

<h1 align="center"> Cyberpunk RED: Hover Info </h1> <br>

<p align="center">
  An information display module for Cyberpunk RED, made by MMuton.
</p>

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Solo of Fortune Support](#solo-of-fortune-support)
- [Known Issues](#known-issues)
- [Credits](#credits)
- [Disclaimer](#disclaimer)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

This module displays tactical information when hovering over tokens in Cyberpunk RED. See equipped weapons, armor status, weapon DVs, and distance to targets at a glance.

## Features

* **Equipment Info Panel:** (Left) Displays all equipped weapons and armor status when hovering over any token.
* **DV Display Panel:** (Right) Shows Difficulty Values for all your equipped ranged weapons against the hovered target.
* **Distance Display:** (Above) Shows 3D distance including elevation to the hovered token.
* **Target Line:** Draws a visual line between your selected token and the hovered target.
* **Skill-Based Display:** Optionally obscures equipment details based on observer's Weaponstech and Basic Tech skill levels for weapons and armor, respectively.
* **Colorblind Mode:** alternative DV color scheme for accessibility. (Designed by an user with deuteranopia)
* **Visual Settings Menu:** With example images that change depending on your settings, showing you how changes affect the display.
* **Customizable Exclusions:** Hide specific weapons or armor from the display (e.g., Unarmed, Martial Arts, Mimic armor etc).

<h1 align="center"> Equipment, Distance, and DV  Displays </h1>

<p align="center">
  <img src = "https://i.imgur.com/8GL0txq.png" width=700>
</p>

<h1 align="center"> Visual Settings Menu </h1>

<p align="center">
  <img src = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWF6bnd5bWZoNWZid2cxYmU2NXM5c3I5b3BheXpxMW04Y3Y4d3VpZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/47ibTxkqksx2krSPGx/giphy.gif" width=700>
</p>

## Solo of Fortune Support

Made for weapons from Interface RED Vol 5+ that have separate single-shot and autofire range tables (e.g., MK.27 LMG, Mountain Goat Rifle etc). Enable it in the options.

In the weapon's description field, include: **"Autofire (X)"**

**Valid autofire types:** ```Machine Gun, Machine Pistol, SMG, Assault Rifle```

And **"Range Table: X"**

**Valid range tables:** ```Pistol, Snubnose Pistol, Long Barrel Pistol, SMG, Subcompact SMG, Shotgun, Short Barrel Shotgun, Long Barrel Shotgun, Assault Rifle, Carbine, Battle Rifle, Marksman Rifle, Sniper Rifle, Scout Rifle, Anti-materiel Rifle, Bow, Shortbow, Longbow, Grenade Launcher, Rocket Launcher, Missile Launcher```


When enabled, the module parses this value to show correct DVs for autofire. Falls back to the weapon's default DV Table if not found.

The module includes a "Soldier of Fortune DV Table" compendium with a converter macro that can convert your DV table to have the additional range tables needed for these weapons.

<p align="center">
  <img src = "https://i.imgur.com/TVHVxah.png" width=500>
</p>

## Known Issues

No known issues at this time.

## Credits

All files in the icons folder are from game-icons.net

## Disclaimer

As someone who is still new to programming, I have enlisted the help of AI during this project when I have struggled with the code.
