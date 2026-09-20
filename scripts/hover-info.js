class CPRHoverSettingsMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "cpr-hover-settings-menu",
      title: "Hover Info Settings",
      template: "modules/mmutons-cpr-hover-info/templates/settings-menu.html",
      classes: ["cpr-hover-settings-menu"],
      width: 950,
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
      colorblindMode: game.settings.get(id, "colorblindMode"),
      isGM: game.user.isGM
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
  static iconTextures = new Map();
  static currentHoveredTokenId = null;
  static targetLine = null;
  static FONT = "CPRHoverInfoTektur";
  static fontReady = false;
  static overlay = null;

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
      scope: "world",
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

  static async initFont() {
    if (this.fontReady) return;
    try {
      if (document.fonts?.load) {
        await document.fonts.load('26px Tektur');
        await document.fonts.ready;
      }
      PIXI.BitmapFont.from(this.FONT, { fontFamily: "Tektur", fontSize: 64, fill: 0xFFFFFF }, { chars: PIXI.BitmapFont.ASCII });
      this.fontReady = true;
    } catch (e) {
      console.warn(`${this.ID} | Failed to generate bitmap font:`, e);
    }
  }

  static ensureOverlay() {
    if (!this.overlay || this.overlay.destroyed || !this.overlay.parent) {
      this.createOverlay();
    }
  }

  static createOverlay() {
    if (this.overlay && !this.overlay.destroyed) {
      this.overlay.destroy({ children: true });
    }
    this.overlay = new PIXI.Container();
    this.overlay.eventMode = "none";
    this.overlay.interactiveChildren = false;
    const layer = canvas.controls ?? canvas.interface ?? canvas.stage;
    layer.addChild(this.overlay);
  }

  static clearOverlay() {
    this.activeAnimations.forEach(anims => anims.forEach(a => canvas.app.ticker.remove(a)));
    this.activeAnimations.clear();
    if (this.overlay && !this.overlay.destroyed) {
      this.overlay.removeChildren().forEach(c => c.destroy({ children: true }));
    }
  }

  static async showEquipmentInfo(token) {
    const settings = this.getSettings();
    const inCombat = game.combat?.started || false;

    if (!settings.showHoverInfo || (settings.hoverInfoOnlyInCombat && !inCombat)) {
      return;
    }

    if (this.isTokenHidden(token)) {
      return;
    }

    if (!token.actor) {
      return;
    }

    const observer = canvas.tokens.controlled[0]?.actor || game.user.character || null;
    const data = this.gatherActorData(token.actor, observer);

    if (data.weapons.length === 0 && !data.armorStatus) {
      return;
    }

    if (this.currentHoveredTokenId !== token.id || !this.overlay || this.overlay.destroyed) {
      return;
    }

    const panel = this.createInfoPanel(data);

    const scale = this.getGridScale();
    const unscaledWidth = panel.width;
    const unscaledHeight = panel.height;
    panel.scale.set(scale);

    const scaledWidth = unscaledWidth * scale;
    const scaledHeight = unscaledHeight * scale;
    const gap = Math.max(10, 15 * scale);
    const yOffset = (token.h - scaledHeight) / 2;
    panel.position.set(token.x - scaledWidth - gap, token.y + yOffset);

    if (settings.enableFadeIn) {
      panel.alpha = 0;
      this.fadeIn(panel, token.id);
    }

    this.overlay.addChild(panel);
  }

  static async showDVInfo(token, controlled, distance) {
    const settings = this.getSettings();
    const inCombat = game.combat?.started || false;

    if (!settings.showDVDisplay || (settings.dvDisplayOnlyInCombat && !inCombat)) {
      return;
    }

    if (this.isTokenHidden(token)) {
      return;
    }

    if (!controlled || controlled.id === token.id) {
      return;
    }

    if (!token.actor) {
      return;
    }

    const tokenId = token.id;

    if (this.currentHoveredTokenId !== tokenId) {
      return;
    }

    const dvData = await this.gatherDVData(controlled.actor, distance);

    if (this.currentHoveredTokenId !== tokenId || !this.overlay || this.overlay.destroyed) {
      return;
    }

    if (!dvData || dvData.length === 0) {
      return;
    }

    const panel = this.createDVPanel(dvData);

    const scale = this.getGridScale();
    const unscaledHeight = panel.height;
    panel.scale.set(scale);

    const scaledHeight = unscaledHeight * scale;
    const gap = Math.max(10, 15 * scale);
    const yOffset = (token.h - scaledHeight) / 2;
    panel.position.set(token.x + token.w + gap, token.y + yOffset);

    if (settings.enableFadeIn) {
      panel.alpha = 0;
      this.fadeIn(panel, tokenId);
    }

    this.overlay.addChild(panel);
  }

  static async showDistanceInfo(token, controlled, distance) {
    const settings = this.getSettings();
    const inCombat = game.combat?.started || false;

    if (!settings.showDistanceDisplay || (settings.distanceDisplayOnlyInCombat && !inCombat)) {
      return;
    }

    if (this.isTokenHidden(token)) {
      return;
    }

    if (!controlled || controlled.id === token.id) {
      return;
    }

    if (this.currentHoveredTokenId !== token.id || !this.overlay || this.overlay.destroyed) {
      return;
    }

    const panel = this.createDistancePanel(distance);

    const scale = this.getGridScale();
    const unscaledWidth = panel.width;
    panel.scale.set(scale);

    const scaledWidth = unscaledWidth * scale;
    panel.position.set(token.x + (token.w - scaledWidth) / 2, token.y - 65 * scale);

    if (settings.enableFadeIn) {
      panel.alpha = 0;
      this.fadeIn(panel, token.id);
    }

    this.overlay.addChild(panel);
  }

  static handleHoverStart(tokenId) {
    this.ensureOverlay();
    this.clearOverlay();
    this.currentHoveredTokenId = tokenId;
  }

  static handleHoverEnd(tokenId) {
    if (this.currentHoveredTokenId === tokenId) {
      this.clearOverlay();
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

  static getGridScale() {
    const baseGridSize = 256;
    const currentGridSize = canvas.grid.size || baseGridSize;
    return Math.max(0.15, Math.min(1.5, currentGridSize / baseGridSize));
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

  static getDVTint(dv) {
    const settings = this.getSettings();
    if (settings.colorblindMode) {
      if (dv <= 13) return 0xFFFFFF;
      if (dv <= 15) return 0x44FF00;
      if (dv <= 17) return 0x0600C1;
      return 0x3DBEFF;
    }
    if (dv <= 13) return 0x00FF00;
    if (dv <= 15) return 0xCEFF2E;
    if (dv <= 17) return 0xFFA500;
    return 0xFF0000;
  }

  static getIconTexture(iconPath) {
    if (!this.iconTextures.has(iconPath)) {
      const texture = PIXI.Texture.from(iconPath);
      this.iconTextures.set(iconPath, texture);
    }
    return this.iconTextures.get(iconPath);
  }

  static invalidateSettingsCache() {
    this.settingsCache = null;
    this.exclusionCache = null;
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
    const padding = 12;
    const iconSize = 30;
    const iconPad = 4;
    const rowGap = 6;
    const minWidth = 200;
    const maxWidth = 500;
    const fontSize = 26;
    const textMax = maxWidth - padding * 2 - iconSize - iconPad;

    const rows = [];

    if (data.weapons.length > 0) {
      let iconPath = "modules/mmutons-cpr-hover-info/icons/gun.svg";
      if (data.weaponType === "melee") {
        iconPath = "modules/mmutons-cpr-hover-info/icons/melee.svg";
      } else if (data.weaponType === "both") {
        iconPath = "modules/mmutons-cpr-hover-info/icons/both.svg";
      }

      data.weapons.forEach((name, i) => {
        const text = new PIXI.BitmapText(name, { fontName: this.FONT, fontSize });
        text.maxWidth = textMax;
        rows.push({ icon: i === 0 ? iconPath : null, text });
      });
    }

    if (data.armorStatus && data.armorCondition) {
      const text = new PIXI.BitmapText(`${data.armorCondition} ${data.armorStatus}`, { fontName: this.FONT, fontSize });
      text.maxWidth = textMax;
      rows.push({ icon: "modules/mmutons-cpr-hover-info/icons/armor.svg", text });
    }

    let contentWidth = 0;
    let height = padding;
    rows.forEach(row => {
      contentWidth = Math.max(contentWidth, row.text.width);
      row.height = Math.max(iconSize, row.text.height);
      height += row.height + rowGap;
    });
    height = height - rowGap + padding;

    const width = Math.min(maxWidth, Math.max(minWidth, contentWidth + padding * 2 + iconSize + iconPad));

    const panel = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.50);
    bg.drawRoundedRect(0, 0, width, height, 8);
    bg.endFill();
    panel.addChild(bg);

    let y = padding;
    rows.forEach(row => {
      if (row.icon) {
        const texture = this.getIconTexture(row.icon);
        if (texture) {
          const icon = new PIXI.Sprite(texture);
          icon.width = icon.height = iconSize;
          icon.position.set(padding, y + (row.height - iconSize) / 2);
          panel.addChild(icon);
        }
      }

      row.text.position.set(padding + iconSize + iconPad, y + (row.height - row.text.height) / 2);
      panel.addChild(row.text);

      y += row.height + rowGap;
    });

    return panel;
  }

  static createDVPanel(dvData) {
    const padding = 12;
    const lineHeight = 36;
    const minWidth = 200;
    const nameFont = 24;

    const rows = dvData.map(w => {
      const nameText = new PIXI.BitmapText(`${w.name}: DV `, { fontName: this.FONT, fontSize: nameFont });
      const dvText = new PIXI.BitmapText(`${w.dv}`, { fontName: this.FONT, fontSize: nameFont });
      dvText.tint = this.getDVTint(w.dv);
      return { nameText, dvText };
    });

    let contentWidth = 0;
    rows.forEach(row => {
      contentWidth = Math.max(contentWidth, row.nameText.width + row.dvText.width);
    });

    const width = Math.max(minWidth, contentWidth + padding * 2);
    const height = padding + (rows.length * lineHeight) + padding;

    const panel = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.50);
    bg.drawRoundedRect(0, 0, width, height, 8);
    bg.endFill();
    panel.addChild(bg);

    let y = padding;
    rows.forEach(row => {
      row.nameText.position.set(padding, y + (lineHeight - row.nameText.height) / 2);
      panel.addChild(row.nameText);

      row.dvText.position.set(padding + row.nameText.width, y + (lineHeight - row.dvText.height) / 2);
      panel.addChild(row.dvText);

      y += lineHeight;
    });

    return panel;
  }

  static createDistancePanel(distance) {
    const padding = 8;
    const height = 32;
    const units = canvas.scene?.grid?.units || "";

    const text = new PIXI.BitmapText(`${distance}${units}`, { fontName: this.FONT, fontSize: 22 });
    const width = text.width + (padding * 2);

    const panel = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.50);
    bg.drawRoundedRect(0, 0, width, height, 6);
    bg.endFill();
    panel.addChild(bg);

    text.position.set(padding, (height - text.height) / 2);
    panel.addChild(text);

    return panel;
  }
}

Hooks.once("init", () => {
  CPRHoverInfo.registerSettings();
  console.log(`${CPRHoverInfo.ID} | Module initialized successfully`);
});

Hooks.on("hoverToken", (token, hovered) => {
  if (hovered) {
    CPRHoverInfo.handleHoverStart(token.id);

    const tokenObj = canvas.tokens?.get(token.id);
    if (!tokenObj) return;

    const controlled = canvas.tokens.controlled[0];
    const hasTarget = controlled && controlled.id !== token.id;
    const distance = hasTarget ? CPRHoverInfo.getDistance(controlled, tokenObj) : null;

    CPRHoverInfo.showEquipmentInfo(tokenObj);
    CPRHoverInfo.showDVInfo(tokenObj, controlled, distance);
    CPRHoverInfo.showDistanceInfo(tokenObj, controlled, distance);

    if (hasTarget) {
      CPRHoverInfo.drawTargetLine(controlled, tokenObj);
    }
  } else {
    CPRHoverInfo.handleHoverEnd(token.id);
  }
});

Hooks.on("controlToken", (token, _) => {
  CPRHoverInfo.clearOverlay();
  CPRHoverInfo.clearTargetLine();
  CPRHoverInfo.currentHoveredTokenId = null;
});

Hooks.on("deleteToken", (tokenDocument, options, userId) => {
  if (CPRHoverInfo.currentHoveredTokenId === tokenDocument.id) {
    CPRHoverInfo.clearOverlay();
    CPRHoverInfo.clearTargetLine();
    CPRHoverInfo.currentHoveredTokenId = null;
  }
});

Hooks.once("ready", async () => {
  await CPRHoverInfo.initFont();
  CPRHoverInfo.checkDiwakoConflict();
});

Hooks.on("canvasReady", (canvas) => {
  CPRHoverInfo.cleanupAllAnimations();
  CPRHoverInfo.createOverlay();

  canvas.stage?.on("pointerleave", () => {
    if (CPRHoverInfo.currentHoveredTokenId) {
      CPRHoverInfo.clearOverlay();
      CPRHoverInfo.clearTargetLine();
      CPRHoverInfo.currentHoveredTokenId = null;
    }
  });
});

Hooks.on("closeSettingsConfig", () => {
  CPRHoverInfo.invalidateSettingsCache();
});
