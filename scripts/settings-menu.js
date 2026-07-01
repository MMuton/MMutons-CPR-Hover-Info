class CPRHoverSettingsMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "cpr-hover-settings-menu",
      title: "Hover Info Settings",
      template: "modules/mmutons-cpr-hover-info/templates/settings-menu.html",
      classes: ["cpr-hover-settings-menu"],
      width: 750,
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
      hideInfoForHiddenTokens: game.settings.get(id, "hideInfoForHiddenTokens"),
      skillBasedInfo: game.settings.get(id, "skillBasedInfo"),
      colorblindMode: game.settings.get(id, "colorblindMode")
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('input[type="checkbox"]').on("change", (event) => {
      this._updatePreviewImages(html);
    });

    html.find(".customize-btn").on("click", () => {
      const mainSettings = game.settings.sheet;
      mainSettings.render(true);
      setTimeout(() => {
        const tab = mainSettings.element.find(`[data-tab="modules"]`);
        if (tab.length) tab.click();
      }, 100);
    });

    this._updatePreviewImages(html);
  }

  _updatePreviewImages(html) {
    html.find("img[data-toggle]").each((i, img) => {
      const $img = $(img);
      const toggleSetting = $img.data("toggle");
      const variantSetting = $img.data("variant-setting");
      const isEnabled = html.find(`input[name="${toggleSetting}"]`).prop("checked");
      
      if (!isEnabled) {
        $img.addClass("hidden");
        return;
      }
      
      $img.removeClass("hidden");
      
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
        $img.addClass("fade-out");
        setTimeout(() => {
          $img.attr("src", newSrc);
          $img.removeClass("fade-out");
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

globalThis.CPRHoverSettingsMenu = CPRHoverSettingsMenu;