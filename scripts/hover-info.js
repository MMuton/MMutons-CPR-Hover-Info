class CPRHoverSettingsMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "cpr-hover-settings-menu",
      title: "Hover Info Settings",
      template: "modules/mmutons-cpr-hover-info/templates/settings-menu.html",
      classes: ["cpr-hover-settings-menu"],
      width: 850,
      height: "auto",
      resizable: true
    });
  }

  getData() {
    const id = "mmutons-cpr-hover-info";
    return {
      showHoverInfo: game.settings.get(id, "showHoverInfo"),
      hoverInfoOnlyInCombat: game.settings.get(id, "hoverInfoOnlyInCombat"),
      showDVDisplay: game.settings.get(id, "showDVDisplay"),
      dvDisplayOnlyInCombat: game.settings.get(id, "dvDisplayOnlyInCombat"),
      showDistanceDisplay: game.settings.get(id, "showDistanceDisplay"),
      distanceDisplayOnlyInCombat: game.settings.get(id, "distanceDisplayOnlyInCombat"),
      showTargetLine: game.settings.get(id, "showTargetLine"),
      targetLineOnlyInCombat: game.settings.get(id, "targetLineOnlyInCombat"),
      skillBasedInfo: game.settings.get(id, "skillBasedInfo"),
      colorblindMode: game.settings.get(id, "colorblindMode")
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('input[type="checkbox"]').on("change", (event) => {
      this._updatePreviewImages(html);
      this._updateSubToggles(html);
    });

    this._updatePreviewImages(html);
    this._updateSubToggles(html);
  }

  _updateSubToggles(html) {
    html.find("label[data-requires]").each((i, label) => {
      const $label = $(label);
      const parentSetting = $label.data("requires");
      const parentChecked = html.find(`input[name="${parentSetting}"]`).prop("checked");
      
      if (parentChecked) {
        $label.removeClass("cpr-disabled");
      } else {
        $label.addClass("cpr-disabled");
      }
    });
  }

  _updatePreviewImages(html) {
    html.find("img[data-line-toggle]").each((i, img) => {
      const $img = $(img);
      const toggleSetting = $img.data("line-toggle");
      const isEnabled = html.find(`input[name="${toggleSetting}"]`).prop("checked");
      
      if (isEnabled) {
        $img.removeClass("cpr-faded");
      } else {
        $img.addClass("cpr-faded");
      }
    });

    html.find("img[data-toggle]").each((i, img) => {
      const $img = $(img);
      const toggleSetting = $img.data("toggle");
      const variantSetting = $img.data("variant-setting");
      const isEnabled = html.find(`input[name="${toggleSetting}"]`).prop("checked");
      
      if (!isEnabled) {
        $img.addClass("cpr-faded");
      } else {
        $img.removeClass("cpr-faded");
      }
      
      let newSrc = $img.data("default");
      
      if (variantSetting) {
        const variantEnabled = html.find(`input[name="${variantSetting}"]`).prop("checked");
        if (variantEnabled) {
          if ($img.data("skill")) newSrc = $img.data("skill");
          else if ($img.data("colorblind")) newSrc = $img.data("colorblind");
          else if ($img.data("targetline")) newSrc = $img.data("targetline");
        }
      }

      if ($img.attr("src") !== newSrc) {
        $img.addClass("cpr-fade-transition");
        setTimeout(() => {
          $img.attr("src", newSrc);
          $img.removeClass("cpr-fade-transition");
        }, 150);
      }
    });
  }

  async _updateObject(event, formData) {
    const id = "mmutons-cpr-hover-info";
    
    for (const [key, value] of Object.entries(formData)) {
      await game.settings.set(id, key, value);
    }
    
    CPRHoverInfo.invalidateSettingsCache();
    ui.notifications.info("Hover Info settings saved.");
  }
}

class CPRHoverInfo {
  static ID = 'mmutons-cpr-hover-info';
  static DV_CACHE = new Map();
  static DV_CACHE_MAX_SIZE = 50;
  static DV_DISTANCE_CACHE_MAX_SIZE = 100;
  static activeAnimations = new Map();
  static settingsCache = null;
  static exclusionCache = null;
  static textStyles = null;
  static iconTextures = new Map();
  static currentHoveredTokenId = null;
  static targetLine = null;

  static VALID_SINGLE_SHOT_TABLES = [
    "Pistol", "Snubnose Pistol", "Long Barrel Pistol",
    "SMG", "Subcompact SMG",
    "Shotgun", "Short Barrel Shotgun", "Long Barrel Shotgun",
    "Assault Rifle", "Carbine", "Battle Rifle", "Marksman Rifle",
    "Sniper Rifle", "Scout Rifle", "Anti-materiel Rifle",
    "Bow", "Shortbow", "Longbow",
    "Grenade Launcher", "Rocket Launcher", "Missile Launcher"
  ];

  static VALID_AUTOFIRE_TABLES = [
    "Machine Gun", "Machine Pistol", "SMG", "Assault Rifle"
  ];

  static registerSettings() {
    game.settings.registerMenu(this.ID, "settingsMenu", {
      name: "Hover Info Settings",
      label: "Open Settings",
      hint: "Configure display options with visual preview",
      icon: "fas fa-cog",
      type: CPRHoverSettingsMenu,
      restricted: false
    });

    game.settings.register(this.ID, "showHoverInfo", {
      scope: "client",
      config: false,
      type: Boolean,
      default: true
    });
    
    game.settings.register(this.ID, "hoverInfoOnlyInCombat", {
      scope: "client",
      config: false,
      type: Boolean,
      default: false
    });
    
    game.settings.register(this.ID, "showDVDisplay", {
      scope: "client",
      config: false,
      type: Boolean,
      default: true
    });
    
    game.settings.register(this.ID, "dvDisplayOnlyInCombat", {
      scope: "client",
      config: false,
      type: Boolean,
      default: true
    });

    game.settings.register(this.ID, "showDistanceDisplay", {
      scope: "client",
      config: false,
      type: Boolean,
      default: true
    });

    game.settings.register(this.ID, "distanceDisplayOnlyInCombat", {
      scope: "client",
      config: false,
      type: Boolean,
      default: false
    });

    game.settings.register(this.ID, "showTargetLine", {
      scope: "client",
      config: false,
      type: Boolean,
      default: false
    });

    game.settings.register(this.ID, "targetLineOnlyInCombat", {
      scope: "client",
      config: false,
      type: Boolean,
      default: true
    });
	
    game.settings.register(this.ID, "hideInfoForHiddenTokens", {
      name: "Hide Info for Hidden/Secret Tokens",
      hint: "Don't show hover info for tokens that are invisible or have Secret disposition",
      scope: "client",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(this.ID, "skillBasedInfo", {
      scope: "client",
      config: false,
      type: Boolean,
      default: true
    });

    game.settings.register(this.ID, "colorblindMode", {
      scope: "client",
      config: false,
      type: Boolean,
      default: false
    });
	
	game.settings.register(this.ID, "dismissedDiwakoWarning", {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });

	game.settings.register(this.ID, "sofSupport", {
      name: "Solo of Fortune Support",
      hint: "Parses weapon descriptions first for extended Range Table and Autofire types from Interface RED Vol 5. Expected format in description of items: 'Range Table: Assault Rifle' and 'Autofire (Machine Gun)'. When disabled, uses the weapon's default DV Table setting.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register(this.ID, "enableFadeIn", {
      name: "Enable Fade-In Animations",
      hint: "Smooth fade-in effect when displays appear. Disable for maximum performance.",
      scope: "client",
      config: true,
      type: Boolean,
      default: true
    });
    
    game.settings.register(this.ID, "weaponWordExclusions", {
      name: "Weapon Word Exclusions",
      hint: "Comma-separated list of words to hide weapons containing them (e.g., 'Martial Art, MA:, Unarmed')",
      scope: "world",
      config: true,
      type: String,
      default: "Martial Art, MA:,"
    });
    
    game.settings.register(this.ID, "weaponExactExclusions", {
      name: "Weapon Exact Name Exclusions",
      hint: "Comma-separated list of exact weapon names to hide",
      scope: "world",
      config: true,
      type: String,
      default: "Unarmed"
    });
    
    game.settings.register(this.ID, "armorWordExclusions", {
      name: "Armor Word Exclusions",
      hint: "Comma-separated list of words to hide armor containing them",
      scope: "world",
      config: true,
      type: String,
      default: "Mimic, Riding Suit, Skid Row Trench, Corporate Island, Executive Armor, Skin Weave, Subdermal, FleshWeave"
    });
    
    game.settings.register(this.ID, "armorExactExclusions", {
      name: "Armor Exact Name Exclusions",
      hint: "Comma-separated list of exact armor names to hide",
      scope: "world",
      config: true,
      type: String,
      default: ""
    });
  }

  static async initializeTokenDisplays(wrapped, ...args) {
    await wrapped(...args);
    
    this.equipmentDisplay = this.addChild(new PIXI.Container());
    this.dvDisplay = this.addChild(new PIXI.Container());
    this.distanceDisplay = this.addChild(new PIXI.Container());
    
    this.equipmentDisplay.zIndex = 1000;
    this.dvDisplay.zIndex = 1000;
    this.distanceDisplay.zIndex = 1000;
    
    this._hoverInfoInitialized = true;
    
    return this;
  }

  static async showEquipmentInfo() {
    const settings = CPRHoverInfo.getSettings();
    const inCombat = game.combat?.started || false;
    
    if (!settings.showHoverInfo || (settings.hoverInfoOnlyInCombat && !inCombat)) {
      return;
    }

    if (CPRHoverInfo.isTokenHidden(this)) {
      return;
    }

    if (!this.actor) {
      return;
    }
    this.equipmentDisplay?.removeChildren()?.forEach(c => c.destroy({ children: true }));

    const observer = canvas.tokens.controlled[0]?.actor || null;
    const data = CPRHoverInfo.gatherActorData(this.actor, observer);
    
    if (data.weapons.length === 0 && !data.armorStatus) {
      return;
    }
    
    const panel = CPRHoverInfo.createInfoPanel(data);
    
    const yOffset = (this.h - panel.height) / 2;
    panel.position.set(-panel.width - 15, yOffset);
    
    if (settings.enableFadeIn) {
      panel.alpha = 0;
      CPRHoverInfo.fadeIn(panel, this.id);
    }
    
    this.equipmentDisplay.addChild(panel);
  }

  static async showDVInfo() {
    const settings = CPRHoverInfo.getSettings();
    const inCombat = game.combat?.started || false;
    
    if (!settings.showDVDisplay || (settings.dvDisplayOnlyInCombat && !inCombat)) {
      return;
    }

    if (CPRHoverInfo.isTokenHidden(this)) {
      return;
    }

    const controlled = canvas.tokens.controlled[0];
    if (!controlled || controlled.id === this.id) {
      return;
    }

    if (!this.actor) {
      return;
    }

    this.dvDisplay?.removeChildren()?.forEach(c => c.destroy({ children: true }));

    const tokenId = this.id;

    if (CPRHoverInfo.currentHoveredTokenId !== tokenId) {
      return;
    }

    const distance = CPRHoverInfo.getDistance(controlled, this);
    
    const dvData = await CPRHoverInfo.gatherDVData(controlled.actor, distance);
    
    const token = canvas.tokens?.get(tokenId);
    if (!token?._hoverInfoInitialized || !token.dvDisplay?.parent) {
      return;
    }
    
    if (CPRHoverInfo.currentHoveredTokenId !== tokenId) {
      return;
    }
    
    if (!dvData || dvData.length === 0) {
      return;
    }

    const panel = CPRHoverInfo.createDVPanel(dvData);
    
    const yOffset = (token.h - panel.height) / 2;
    panel.position.set(token.w + 15, yOffset);
    
    if (CPRHoverInfo.getSettings().enableFadeIn) {
      panel.alpha = 0;
      CPRHoverInfo.fadeIn(panel, tokenId);
    }
    
    token.dvDisplay.addChild(panel);
  }

  static async showDistanceInfo() {
    const settings = CPRHoverInfo.getSettings();
    const inCombat = game.combat?.started || false;
    
    if (!settings.showDistanceDisplay || (settings.distanceDisplayOnlyInCombat && !inCombat)) {
      return;
    }

    if (CPRHoverInfo.isTokenHidden(this)) {
      return;
    }

    const controlled = canvas.tokens.controlled[0];
    if (!controlled || controlled.id === this.id) {
      return;
    }

    this.distanceDisplay?.removeChildren()?.forEach(c => c.destroy({ children: true }));

    const tokenId = this.id;
    const distance = CPRHoverInfo.getDistance(controlled, this);
    
    const token = canvas.tokens?.get(tokenId);
    if (!token?._hoverInfoInitialized || !token.distanceDisplay?.parent) {
      return;
    }
    
    const panel = CPRHoverInfo.createDistancePanel(distance);
    
    panel.position.set((token.w - panel.width) / 2, -65);
    
    if (settings.enableFadeIn) {
      panel.alpha = 0;
      CPRHoverInfo.fadeIn(panel, tokenId);
    }
    
    token.distanceDisplay.addChild(panel);
  }

  static clearAllDisplays() {
    CPRHoverInfo.cancelAnimations(this.id);

    this.equipmentDisplay?.removeChildren()?.forEach(c => c.destroy({ children: true }));
    this.dvDisplay?.removeChildren()?.forEach(c => c.destroy({ children: true }));
    this.distanceDisplay?.removeChildren()?.forEach(c => c.destroy({ children: true }));
  }

  static clearTokenDisplaysById(tokenId) {
    if (!tokenId) return;
    
    const token = canvas.tokens?.get(tokenId);
    if (token?._hoverInfoInitialized) {
      token.clearAllDisplays?.();
    }
  }

  static handleHoverStart(tokenId) {
    if (this.currentHoveredTokenId && this.currentHoveredTokenId !== tokenId) {
      this.clearTokenDisplaysById(this.currentHoveredTokenId);
    }
    this.currentHoveredTokenId = tokenId;
  }

  static handleHoverEnd(tokenId) {
    if (this.currentHoveredTokenId === tokenId) {
      this.clearTokenDisplaysById(tokenId);
      this.clearTargetLine();
      this.currentHoveredTokenId = null;
    }
  }

  static drawTargetLine(fromToken, toToken) {
    const settings = this.getSettings();
    if (!settings.showTargetLine) return;
    
    const inCombat = game.combat?.started || false;
    if (settings.targetLineOnlyInCombat && !inCombat) return;
    
    this.clearTargetLine();
    
    const line = new PIXI.Graphics();
    
    const fromX = fromToken.center.x;
    const fromY = fromToken.center.y;
    const toX = toToken.center.x;
    const toY = toToken.center.y;
    
    line.lineStyle({
      width: 4,
      color: 0xFFFFFF,
      alpha: 0.6,
      join: PIXI.LINE_JOIN.ROUND,
      cap: PIXI.LINE_CAP.ROUND
    });
    line.moveTo(fromX, fromY);
    line.lineTo(toX, toY);
    
    canvas.tokens.addChildAt(line, 0);
    this.targetLine = line;
  }

  static clearTargetLine() {
    if (this.targetLine) {
      this.targetLine.destroy();
      this.targetLine = null;
    }
  }

  static isTokenHidden(token) {
    const settings = this.getSettings();
    if (!settings.hideInfoForHiddenTokens) return false;
    
    if (token.document?.hidden) return true;
    
    if (token.document?.disposition === CONST.TOKEN_DISPOSITIONS.SECRET) return true;
    
    return false;
  }

  static getObserverSkillBase(observer, skillName) {
    const skill = observer?.system?.skills?.[skillName];
    if (!skill) return 0;
    return (skill.level || 0) + (skill.stat || 0) + (skill.mods || 0);
  }

  static formatWeaponType(weaponType) {
    if (!weaponType) return "Weapon";
    return weaponType
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  static cleanArmorName(name) {
    if (!name) return name;
    return name.replace(/\s*\((Body|Head)\)\s*/gi, '').trim();
  }

  static getTablesFromDescription(item) {
    const description = item.system?.description?.value || "";
    
    const rangeMatch = description.match(/Range\s*Table:\s*<\/strong>?\s*([A-Za-z\-\s]+?)(?=<|•|\s*\.|,|$)/i);
    const autofireMatch = description.match(/Autofire\s*\(\s*(Machine Gun|Machine Pistol|Assault Rifle|SMG)\s*\d*\s*\)/i);
    
    let singleShot = null;
    let autofire = null;
    
    if (rangeMatch) {
      const cleaned = rangeMatch[1].trim();
      const match = this.VALID_SINGLE_SHOT_TABLES.find(t => t.toLowerCase() === cleaned.toLowerCase());
      if (match) {
        singleShot = `DV ${match}`;
      }
    }
    
    if (autofireMatch) {
      const cleaned = autofireMatch[1].trim();
      const match = this.VALID_AUTOFIRE_TABLES.find(t => t.toLowerCase() === cleaned.toLowerCase());
      if (match) {
        autofire = `DV ${match} (Autofire)`;
      }
    }
    
    return { singleShot, autofire };
  }

  static getWeaponSizeCategory(weapon) {
    const weaponType = weapon.system?.weaponType || "";
    const isRanged = weapon.system?.isRanged;
    
    if (isRanged) {
      if (["grenadeLauncher", "rocketLauncher"].includes(weaponType)) return "Huge Gun";
      if (["medPistol", "heavyPistol", "vHeavyPistol", "smg"].includes(weaponType)) return "Small Gun";
      return "Big Gun";
    } else {
      if (["vHeavyMelee"].includes(weaponType)) return "Huge Melee Weapon";
      if (["medMelee", "heavyMelee"].includes(weaponType)) return "Big Melee Weapon";
      return "Small Melee Weapon";
    }
  }

  static fadeIn(container, tokenId, duration = 200) {
    const startTime = Date.now();
    
    const animate = () => {
      if (!container || !container.parent || container.destroyed) {
        canvas.app.ticker.remove(animate);
        this.removeAnimation(tokenId, animate);
        return;
      }
      
      try {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        container.alpha = progress;
        
        if (progress >= 1) {
          canvas.app.ticker.remove(animate);
          this.removeAnimation(tokenId, animate);
        }
      } catch (error) {
        console.warn(`${this.ID} | Animation error:`, error);
        canvas.app.ticker.remove(animate);
        this.removeAnimation(tokenId, animate);
      }
    };

    canvas.app.ticker.add(animate);
    
    if (!this.activeAnimations.has(tokenId)) {
      this.activeAnimations.set(tokenId, []);
    }
    this.activeAnimations.get(tokenId).push(animate);
  }

  static removeAnimation(tokenId, animate) {
    const animations = this.activeAnimations.get(tokenId);
    if (!animations) return;
    
    const index = animations.indexOf(animate);
    if (index > -1) {
      animations.splice(index, 1);
    }

    if (animations.length === 0) {
      this.activeAnimations.delete(tokenId);
    }
  }

  static cancelAnimations(tokenId) {
    const animations = this.activeAnimations.get(tokenId);
    if (!animations) return;
    
    const animationsCopy = [...animations];
    animationsCopy.forEach(animate => {
      canvas.app.ticker.remove(animate);
    });
    
    this.activeAnimations.delete(tokenId);
  }

  static cleanupAllAnimations() {
    this.activeAnimations.forEach((animations, tokenId) => {
      animations.forEach(animate => {
        canvas.app.ticker.remove(animate);
      });
    });
    this.activeAnimations.clear();
    this.clearTargetLine();
    this.currentHoveredTokenId = null;
    console.log(`${this.ID} | Cleaned up all animations`);
  }

  static getSettings() {
    if (!this.settingsCache) {
      try {
        this.settingsCache = {
          showHoverInfo: game.settings.get(this.ID, "showHoverInfo"),
          hoverInfoOnlyInCombat: game.settings.get(this.ID, "hoverInfoOnlyInCombat"),
          showDVDisplay: game.settings.get(this.ID, "showDVDisplay"),
          dvDisplayOnlyInCombat: game.settings.get(this.ID, "dvDisplayOnlyInCombat"),
          showDistanceDisplay: game.settings.get(this.ID, "showDistanceDisplay"),
          distanceDisplayOnlyInCombat: game.settings.get(this.ID, "distanceDisplayOnlyInCombat"),
          enableFadeIn: game.settings.get(this.ID, "enableFadeIn"),
          colorblindMode: game.settings.get(this.ID, "colorblindMode"),
          hideInfoForHiddenTokens: game.settings.get(this.ID, "hideInfoForHiddenTokens"),
          skillBasedInfo: game.settings.get(this.ID, "skillBasedInfo"),
          showTargetLine: game.settings.get(this.ID, "showTargetLine"),
          targetLineOnlyInCombat: game.settings.get(this.ID, "targetLineOnlyInCombat"),
          sofSupport: game.settings.get(this.ID, "sofSupport")
        };
      } catch (error) {
        console.warn(`${this.ID} | Failed to load settings, using defaults:`, error);
        return {
          showHoverInfo: true,
          hoverInfoOnlyInCombat: false,
          showDVDisplay: true,
          dvDisplayOnlyInCombat: true,
          showDistanceDisplay: true,
          distanceDisplayOnlyInCombat: false,
          enableFadeIn: true,
          colorblindMode: false,
          hideInfoForHiddenTokens: true,
          skillBasedInfo: true,
          showTargetLine: false,
          targetLineOnlyInCombat: true,
          sofSupport: false
        };
      }
    }
    return this.settingsCache;
  }

  static getExclusions() {
    if (!this.exclusionCache) {
      try {
        this.exclusionCache = {
          weaponWords: game.settings.get(this.ID, "weaponWordExclusions")
            .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
          weaponExact: game.settings.get(this.ID, "weaponExactExclusions")
            .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
          armorWords: game.settings.get(this.ID, "armorWordExclusions")
            .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
          armorExact: game.settings.get(this.ID, "armorExactExclusions")
            .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        };
      } catch (error) {
        console.warn(`${this.ID} | Failed to load exclusions, using defaults:`, error);
        return {
          weaponWords: ["martial art", "ma:"],
          weaponExact: ["unarmed"],
          armorWords: ["mimic", "riding suit", "skid row trench", "corporate island", "executive armor", "skin weave", "subdermal", "fleshweave"],
          armorExact: []
        };
      }
    }
    return this.exclusionCache;
  }

  static getDVColor(dv) {
    if (dv <= 13) return 0x00FF00;
    if (dv <= 15) return 0xADFF2F;
    if (dv <= 17) return 0xFFA500;
    return 0xFF0000;
  }

  static getTextStyles() {
    if (!this.textStyles) {
      this.textStyles = {
        equipment: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 26,
          fill: 0xFFFFFF,
          align: 'left'
        }),
        distance: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 22,
          fill: 0xFFFFFF,
          align: 'center',
          fontWeight: 'bold'
        }),
        dvName: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0xFFFFFF,
          align: 'left'
        }),
        dvGreen: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0x00FF00,
          align: 'left'
        }),
        dvLime: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0xCEFF2E,
          align: 'left'
        }),
        dvOrange: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0xFFA500,
          align: 'left'
        }),
        dvRed: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0xFF0000,
          align: 'left'
        }),
        dvColorblind1: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0xFFFFFF,
          align: 'left'
        }),
        dvColorblind2: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0x44FF00,
          align: 'left'
        }),
        dvColorblind3: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0x0600C1,
          align: 'left'
        }),
        dvColorblind4: new PIXI.TextStyle({
          fontFamily: 'Tektur, Arial, sans-serif',
          fontSize: 24,
          fill: 0x3DBEFF,
          align: 'left'
        })
      };
    }
    return this.textStyles;
  }

  static getDVStyle(dv) {
    const styles = this.getTextStyles();
    const settings = this.getSettings();
    
    if (settings.colorblindMode) {
      if (dv <= 13) return styles.dvColorblind1;
      if (dv <= 15) return styles.dvColorblind2;
      if (dv <= 17) return styles.dvColorblind3;
      return styles.dvColorblind4;
    } else {
      if (dv <= 13) return styles.dvGreen;
      if (dv <= 15) return styles.dvLime;
      if (dv <= 17) return styles.dvOrange;
      return styles.dvRed;
    }
  }

  static getIconTexture(iconPath) {
    if (!this.iconTextures.has(iconPath)) {
      const texture = PIXI.Texture.from(iconPath);
      this.iconTextures.set(iconPath, texture);
    }
    return this.iconTextures.get(iconPath);
  }

  static truncateText(text, maxWidth, style) {
    const tempText = new PIXI.Text(text, style);

    if (tempText.width <= maxWidth) {
      tempText.destroy();
      return text;
    }

    let truncated = text;
    while (tempText.width > maxWidth && truncated.length > 3) {
      truncated = truncated.slice(0, -4) + '...';
      tempText.text = truncated;
    }
    
    tempText.destroy();
    return truncated;
  }

  static invalidateSettingsCache() {
    this.settingsCache = null;
    this.exclusionCache = null;
    this.textStyles = null;
  }
  
  static async checkDiwakoConflict() {

    if (game.settings.get(this.ID, "dismissedDiwakoWarning")) return;
    
    const diwakoModule = game.modules.get("diwako-cpred-additions");
    if (!diwakoModule?.active) return;
    
    let diwakoDVEnabled = false;
    try {
      diwakoDVEnabled = game.settings.get("diwako-cpred-additions", "showDVDisplay");
    } catch (e) {
      return;
    }
    
    if (!diwakoDVEnabled) return;
    
    const content = `
      <p style="margin-bottom: 15px;">
        <strong>Diwako's Cyberpunk Red - Core Additions</strong> also has a DV display feature enabled.
      </p>
      <p style="margin-bottom: 15px;">
        Running both DV displays simultaneously may cause issues. 
        It is recommended to only use one DV display system at a time.
      </p>
      <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="cpr-hover-dismiss-warning" style="margin: 0;">
          <span>Don't show this warning again</span>
        </label>
      </div>
    `;
    
    new Dialog({
      title: "MMuton's Cyberpunk RED Hover Info",
      content: content,
      buttons: {
        disable: {
          label: "Disable Diwako's DV Display",
          callback: async (html) => {
            const dismiss = html.find("#cpr-hover-dismiss-warning").prop("checked");
            
            try {
              await game.settings.set("diwako-cpred-additions", "showDVDisplay", false);
              ui.notifications.info("Diwako's DV Display has been disabled. Refresh recommended!");
            } catch (e) {
              ui.notifications.error("Failed to disable Diwako's DV Display. Please disable it manually.");
            }
            
            if (dismiss) {
              await game.settings.set(this.ID, "dismissedDiwakoWarning", true);
            }
          }
        },
        ignore: {
          label: "Change Nothing",
          callback: async (html) => {
            const dismiss = html.find("#cpr-hover-dismiss-warning").prop("checked");
            if (dismiss) {
              await game.settings.set(this.ID, "dismissedDiwakoWarning", true);
            }
          }
        }
      },
      default: "disable"
    }).render(true);
  }

  static cleanup() {
    this.cleanupAllAnimations();
    this.DV_CACHE.clear();
    this.iconTextures.clear();
    this.settingsCache = null;
    this.exclusionCache = null;
    this.textStyles = null;
    console.log(`${this.ID} | Module cleanup complete`);
  }

  static getDistance(token1, token2) {
    if (token1.document) token1 = token1.document;
    if (token2.document) token2 = token2.document;

    const horizontal = canvas.grid.measureDistance(token1, token2, { gridSpaces: true });
    
    const elevation1 = token1.elevation || 0;
    const elevation2 = token2.elevation || 0;
    const vertical = elevation1 - elevation2;
    
    return Math.round(Math.sqrt(horizontal * horizontal + vertical * vertical));
  }

  static async getDV(dvTable, distance) {
    let cachedData = this.DV_CACHE.get(dvTable);
    
    if (!cachedData) {
      let table = game.tables.getName(dvTable);
      
      if (!table) {
        const compendium = game.settings.get(game.system.id, "dvRollTableCompendium");
        const pack = game.packs.get(compendium) || 
                     game.packs.get("cyberpunk-red-core.dv-tables") || 
                     game.packs.get("cyberpunk-red-core.dvTables");
        
        if (!pack) {
          console.warn(`${this.ID} | No DV compendium found for table: ${dvTable}`);
          return -1;
        }
        
        const tableId = pack.index.getName(dvTable)?._id;
        if (!tableId) {
          console.warn(`${this.ID} | Table not found in compendium: ${dvTable}`);
          return -1;
        }
        
        table = await pack.getDocument(tableId);
      }
      
      if (this.DV_CACHE.size >= this.DV_CACHE_MAX_SIZE) {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, value] of this.DV_CACHE.entries()) {
          if (value.lastAccessed < oldestTime) {
            oldestTime = value.lastAccessed;
            oldestKey = key;
          }
        }
        
        if (oldestKey) {
          this.DV_CACHE.delete(oldestKey);
          console.log(`${this.ID} | DV cache full, evicted LRU entry: ${oldestKey}`);
        }
      }
      
      console.log(`${this.ID} | Caching DV table: ${dvTable}`);
      cachedData = { 
        table, 
        dvs: new Map(),
        lastAccessed: Date.now()
      };
      this.DV_CACHE.set(dvTable, cachedData);
    }

    cachedData.lastAccessed = Date.now();

    let dv = cachedData.dvs.get(distance);
    
    if (dv === undefined) {
      const draw = await cachedData.table.getResultsForRoll(distance);
      
      if (!draw || draw.length === 0) {
        console.warn(`${this.ID} | Could not get DV from table ${cachedData.table.name} at distance ${distance}`);
        return -1;
      }
      
      dv = parseInt(draw[0].text);

      if (cachedData.dvs.size >= this.DV_DISTANCE_CACHE_MAX_SIZE) {
        const firstKey = cachedData.dvs.keys().next().value;
        cachedData.dvs.delete(firstKey);
      }
      
      cachedData.dvs.set(distance, dv);
    }
    
    return dv;
  }

  static async gatherDVData(actor, distance) {
    const weapons = [];
    const shownWeapons = [];
    
    const exclusions = this.getExclusions();
    const wordExcl = exclusions.weaponWords;
    const exactExcl = exclusions.weaponExact;
    
    const settings = this.getSettings();
    const useSoF = settings.sofSupport;

    const weaponPromises = [];

    for (const item of actor.items) {
      if (!item.system?.isRanged) continue;
      
      if (item.system.equipped !== "equipped" && 
          !(item.type === "cyberware" && item.system.isInstalled)) {
        continue;
      }
      
      if (!item.system.dvTable || item.system.dvTable === "") continue;

      const name = item.name.toLowerCase();
      if (exactExcl.includes(name)) continue;
      if (wordExcl.some(w => name.includes(w))) continue;

      if (shownWeapons.includes(item.name)) continue;
      shownWeapons.push(item.name);

      const tables = useSoF ? this.getTablesFromDescription(item) : { singleShot: null, autofire: null };
      const singleShotTable = tables.singleShot || item.system.dvTable;
      const fallbackTable = item.system.dvTable;

      weaponPromises.push(
        this.getDV(singleShotTable, distance).then(async dv => {
          if (dv !== -1) return { name: item.name, dv };
          
          if (singleShotTable !== fallbackTable) {
            console.warn(`${this.ID} | Table "${singleShotTable}" not found, trying fallback "${fallbackTable}"`);
            const fallbackDV = await this.getDV(fallbackTable, distance);
            if (fallbackDV !== -1) return { name: item.name, dv: fallbackDV };
          }
          return null;
        }).catch(error => {
          console.warn(`${this.ID} | Failed to get DV for ${item.name}:`, error);
          return null;
        })
      );

      if (item.system.fireModes?.suppressiveFire) {
        const autofireName = `${item.name} (AF)`;
        if (!shownWeapons.includes(autofireName)) {
          shownWeapons.push(autofireName);
          
          const autofireTable = tables.autofire || singleShotTable + " (Autofire)";
          const autofireFallback = fallbackTable + " (Autofire)";
          
          weaponPromises.push(
            this.getDV(autofireTable, distance).then(async dv => {
              if (dv !== -1) return { name: autofireName, dv };
              
              if (autofireTable !== autofireFallback) {
                console.warn(`${this.ID} | Table "${autofireTable}" not found, trying fallback "${autofireFallback}"`);
                const fallbackDV = await this.getDV(autofireFallback, distance);
                if (fallbackDV !== -1) return { name: autofireName, dv: fallbackDV };
              }
              return null;
            }).catch(error => {
              console.warn(`${this.ID} | Failed to get DV for ${autofireName}:`, error);
              return null;
            })
          );
        }
      }

      if (item.system.upgrades?.length > 0) {
        for (const upgrade of item.system.upgrades) {
          if (upgrade.system?.type !== "weapon") continue;
          
          const upgradeDoc = actor.items.get(upgrade._id);
          if (!upgradeDoc || !upgradeDoc.system.isRanged || 
              !upgradeDoc.system.isInstalled || !upgradeDoc.system.dvTable) {
            continue;
          }
          
          if (!shownWeapons.includes(upgradeDoc.name)) {
            shownWeapons.push(upgradeDoc.name);
            
            const upgradeTables = useSoF ? this.getTablesFromDescription(upgradeDoc) : { singleShot: null, autofire: null };
            const upgradeSingleShotTable = upgradeTables.singleShot || upgradeDoc.system.dvTable;
            
            weaponPromises.push(
              this.getDV(upgradeSingleShotTable, distance).then(dv => {
                if (dv !== -1) return { name: upgradeDoc.name, dv };
                return null;
              }).catch(error => {
                console.warn(`${this.ID} | Failed to get DV for ${upgradeDoc.name}:`, error);
                return null;
              })
            );
          }
        }
      }
    }

    const results = await Promise.allSettled(weaponPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        weapons.push(result.value);
      }
    });

    return weapons.length > 0 ? weapons : null;
  }

  static gatherActorData(actor, observer = null) {
    const data = { 
      weapons: [], 
      armorStatus: null, 
      armorCondition: null,
      weaponType: null
    };
    
    const exclusions = this.getExclusions();
    const wordExcl = exclusions.weaponWords;
    const exactExcl = exclusions.weaponExact;
    const armorWordExcl = exclusions.armorWords;
    const armorExactExcl = exclusions.armorExact;

    const settings = this.getSettings();
    const useSkillBased = settings.skillBasedInfo && observer;
    const weaponstechBase = useSkillBased ? this.getObserverSkillBase(observer, "weaponstech") : 99;
    const basicTechBase = useSkillBased ? this.getObserverSkillBase(observer, "basicTech") : 99;

    if (actor.itemTypes.weapon) {
      let hasRanged = false;
      let hasMelee = false;
      
      const filteredWeapons = actor.itemTypes.weapon.filter(w => {
        if (w.system?.equipped !== "equipped") return false;
        const name = w.name.toLowerCase();
        if (exactExcl.includes(name)) return false;
        if (wordExcl.some(word => name.includes(word))) return false;
        return true;
      });
      
      data.weapons = filteredWeapons.map(w => {
        if (w.system?.isRanged) {
          hasRanged = true;
        } else {
          hasMelee = true;
        }
        
        if (weaponstechBase >= 14) return w.name;
        if (weaponstechBase >= 10) return this.formatWeaponType(w.system?.weaponType) || w.name;
        return this.getWeaponSizeCategory(w);
      });
      
      if (hasRanged && hasMelee) {
        data.weaponType = "both";
      } else if (hasRanged) {
        data.weaponType = "ranged";
      } else if (hasMelee) {
        data.weaponType = "melee";
      }
    }

    const equippedArmor = (actor.itemTypes.armor || []).filter(a => {
      if (a.system?.equipped !== "equipped") return false;
      const name = a.name.toLowerCase();
      if (armorExactExcl.includes(name)) return false;
      if (armorWordExcl.some(word => name.includes(word))) return false;
      return true;
    });

    if (equippedArmor.length > 0) {
      const bodyArmor = equippedArmor.filter(a => a.system?.isBodyLocation);
      
      if (bodyArmor.length > 0) {
        const best = bodyArmor.reduce((max, a) => 
          (a.system?.bodyLocation?.sp || 0) > (max.system?.bodyLocation?.sp || 0) ? a : max
        );
        
        const currentSp = best.system?.bodyLocation?.sp || 0;
        const ablation = best.system?.bodyLocation?.ablation || 0;
        const maxSp = currentSp + ablation;

        if (basicTechBase >= 14) {
          data.armorStatus = this.cleanArmorName(best.name);
        } else if (basicTechBase >= 10) {
          if (currentSp >= 18) data.armorStatus = "Metalgear";
          else if (currentSp >= 16) data.armorStatus = "Heavy Armor";
          else if (currentSp >= 14) data.armorStatus = "Medium Armor";
          else if (currentSp >= 12) data.armorStatus = "Armor";
          else if (currentSp >= 7) data.armorStatus = "Light Armor";
        } else {
          if (currentSp >= 7) data.armorStatus = "Armor";
        }

        if (maxSp > 0) {
          const pct = (ablation / maxSp) * 100;
          if (pct === 0) data.armorCondition = "Pristine";
          else if (pct < 20) data.armorCondition = "Scuffed";
          else if (pct < 40) data.armorCondition = "Damaged";
          else if (pct < 60) data.armorCondition = "Shredded";
          else if (pct < 90) data.armorCondition = "Swiss Cheese";
          else data.armorCondition = "Destroyed";
        }
      }
    }

    return data;
  }

  static createInfoPanel(data) {
    const panel = new PIXI.Container();
    const lineHeight = 36;
    const padding = 12;
    const iconSize = 30;
    const iconPad = 4;
    const width = 400;

	let lines = 0;
	if (data.weapons.length > 0) lines++;
	if (data.armorStatus && data.armorCondition) lines++;

    const height = padding + (lines * lineHeight) + padding;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.50);
    bg.drawRoundedRect(0, 0, width, height, 8);
    bg.endFill();
    panel.addChild(bg);

    const style = this.getTextStyles().equipment;

    let y = padding;

	if (data.weapons.length > 0) {
	  let iconPath = "modules/mmutons-cpr-hover-info/icons/gun.svg";
	  if (data.weaponType === "melee") {
	    iconPath = "modules/mmutons-cpr-hover-info/icons/melee.svg";
	  } else if (data.weaponType === "both") {
	    iconPath = "modules/mmutons-cpr-hover-info/icons/both.svg";
	  }
	  
	  const iconTexture = this.getIconTexture(iconPath);
	  if (iconTexture) {
		const icon = new PIXI.Sprite(iconTexture);
		icon.width = icon.height = iconSize;
		icon.position.set(padding, y + (lineHeight - iconSize) / 2);
		panel.addChild(icon);
	  }

	  const maxTextWidth = width - padding * 2 - iconSize - iconPad;
	  const weaponText = data.weapons.join(', ');
	  const displayText = this.truncateText(weaponText, maxTextWidth, style);
	  
	  const text = new PIXI.Text(displayText, style);
	  const textOffset = (lineHeight - 26) / 2;
	  text.position.set(padding + iconSize + iconPad, y + textOffset);
	  panel.addChild(text);
	  y += lineHeight;
	}

    if (data.armorStatus && data.armorCondition) {
      const iconTexture = this.getIconTexture("modules/mmutons-cpr-hover-info/icons/armor.svg");
      if (iconTexture) {
        const icon = new PIXI.Sprite(iconTexture);
        icon.width = icon.height = iconSize;
        icon.position.set(padding, y + (lineHeight - iconSize) / 2);
        panel.addChild(icon);
      }

      const maxTextWidth = width - padding * 2 - iconSize - iconPad;
      const armorText = `${data.armorCondition} ${data.armorStatus}`;
      const displayText = this.truncateText(armorText, maxTextWidth, style);

      const text = new PIXI.Text(displayText, style);
      const textOffset = (lineHeight - 27) / 2;
      text.position.set(padding + iconSize + iconPad, y + textOffset);
      panel.addChild(text);
    }

    return panel;
  }

  static createDVPanel(dvData) {
    const panel = new PIXI.Container();
    const lineHeight = 36;
    const padding = 12;
    const width = 350;
    const height = padding + (dvData.length * lineHeight) + padding;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.50);
    bg.drawRoundedRect(0, 0, width, height, 8);
    bg.endFill();
    panel.addChild(bg);

    const styles = this.getTextStyles();

    let y = padding;
    dvData.forEach(w => {
      const textOffset = (lineHeight - 24) / 2;
      
      const dvNumWidth = 50;
      const labelWidth = 50;
      const maxNameWidth = width - padding * 2 - labelWidth - dvNumWidth;
      
      const truncatedName = this.truncateText(w.name, maxNameWidth, styles.dvName);
      
      const nameText = new PIXI.Text(`${truncatedName}: DV `, styles.dvName);
      nameText.position.set(padding, y + textOffset);
      panel.addChild(nameText);

      const dvStyle = this.getDVStyle(w.dv);
      const dvText = new PIXI.Text(`${w.dv}`, dvStyle);
      dvText.position.set(padding + nameText.width, y + textOffset);
      panel.addChild(dvText);

      y += lineHeight;
    });

    return panel;
  }

  static createDistancePanel(distance) {
    const panel = new PIXI.Container();
    const padding = 8;
    const height = 32;
    
    const style = this.getTextStyles().distance;

    const text = new PIXI.Text(`${distance}m`, style);
    const width = text.width + (padding * 2);

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.50);
    bg.drawRoundedRect(0, 0, width, height, 6);
    bg.endFill();
    panel.addChild(bg);

    text.position.set(padding, padding / 2);
    panel.addChild(text);

    return panel;
  }
}

Hooks.once("init", () => {
  CPRHoverInfo.registerSettings();

  if (typeof libWrapper !== 'function') {
    console.error(`${CPRHoverInfo.ID} | libWrapper is required but not loaded. Please install libWrapper module.`);
    ui.notifications.error("MMuton's Cyberpunk RED Hover Info requires the libWrapper module. Please install it from the module browser.");
    return;
  }

  libWrapper.register(
    CPRHoverInfo.ID,
    "Token.prototype.draw",
    CPRHoverInfo.initializeTokenDisplays,
    "WRAPPER"
  );

  Token.prototype.showEquipmentInfo = CPRHoverInfo.showEquipmentInfo;
  Token.prototype.showDVInfo = CPRHoverInfo.showDVInfo;
  Token.prototype.showDistanceInfo = CPRHoverInfo.showDistanceInfo;
  Token.prototype.clearAllDisplays = CPRHoverInfo.clearAllDisplays;
  
  console.log(`${CPRHoverInfo.ID} | Module initialized successfully`);
});

Hooks.on("hoverToken", (token, hovered) => {
  if (hovered) {
    CPRHoverInfo.handleHoverStart(token.id);

    const tokenObj = canvas.tokens?.get(token.id);
    const controlled = canvas.tokens.controlled[0];
    
    if (tokenObj) {
      tokenObj.showEquipmentInfo();
      tokenObj.showDVInfo();
      tokenObj.showDistanceInfo();
      
      if (controlled && controlled.id !== token.id) {
        CPRHoverInfo.drawTargetLine(controlled, tokenObj);
      }
    }
  } else {
    CPRHoverInfo.handleHoverEnd(token.id);
  }
});

Hooks.on("controlToken", (token, _) => {
  CPRHoverInfo.handleHoverEnd(token.id);
});

Hooks.on("deleteToken", (tokenDocument, options, userId) => {
  CPRHoverInfo.cancelAnimations(tokenDocument.id);
  if (CPRHoverInfo.currentHoveredTokenId === tokenDocument.id) {
    CPRHoverInfo.currentHoveredTokenId = null;
  }
});

Hooks.once("ready", () => {
  CPRHoverInfo.checkDiwakoConflict();
});

Hooks.on("canvasReady", (canvas) => {
  CPRHoverInfo.cleanupAllAnimations();
  
  canvas.stage?.on("pointerleave", () => {
    if (CPRHoverInfo.currentHoveredTokenId) {
      CPRHoverInfo.clearTokenDisplaysById(CPRHoverInfo.currentHoveredTokenId);
      CPRHoverInfo.currentHoveredTokenId = null;
    }
  });
});

Hooks.on("closeSettingsConfig", () => {
  CPRHoverInfo.invalidateSettingsCache();
});