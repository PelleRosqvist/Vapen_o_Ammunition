import { AmmoAPI, MODULE_ID } from "./ammo-manager.js";

export class AmmoConfigApp extends Application {
  constructor(item, options = {}) {
    super(options);
    this.item = item;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swam-ammo-app",
      title: game.i18n.localize("SWAM.HeaderButton"),
      template: `modules/${MODULE_ID}/templates/ammo-app.hbs`,
      width: 360,
      height: "auto",
      classes: ["swam-app"],
    });
  }

  get title() {
    return `${game.i18n.localize("SWAM.HeaderButton")} — ${this.item.name}`;
  }

  getData() {
    const cfg = AmmoAPI.getConfig(this.item);
    const actor = this.item.actor;
    const magazines = AmmoAPI.findCompatibleAmmo(actor, cfg.caliber, ["magazine"]);
    const speedloaders = AmmoAPI.findCompatibleAmmo(actor, cfg.caliber, ["speedloader"]);
    const looseRounds = AmmoAPI.findCompatibleAmmo(actor, cfg.caliber, ["loose"]);

    return {
      cfg,
      isEditable: this.item.isOwner,
      isRevolver: cfg.mode === "revolver",
      isMagazine: cfg.mode === "magazine",
      isSingle: cfg.mode === "single" || cfg.mode === "revolver",
      canFire: cfg.enabled && cfg.current > 0,
      canMagazineReload: cfg.mode === "magazine" && magazines.length > 0,
      canSpeedloaderReload: cfg.mode === "revolver" && speedloaders.length > 0,
      canSingleReload: (cfg.mode === "single" || cfg.mode === "revolver") && looseRounds.length > 0,
      magazineCount: magazines.length,
      speedloaderCount: speedloaders.length,
      looseCount: looseRounds.reduce(
        (sum, i) => sum + (foundry.utils.getProperty(i, "system.quantity") ?? 0),
        0
      ),
      modes: {
        magazine: game.i18n.localize("SWAM.ModeMagazine"),
        single: game.i18n.localize("SWAM.ModeSingle"),
        revolver: game.i18n.localize("SWAM.ModeRevolver"),
      },
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="save-config"]').on("click", this._onSaveConfig.bind(this));
    html.find('[data-action="fire-one"]').on("click", this._onFireOne.bind(this));
    html.find('[data-action="reload-magazine"]').on("click", this._onReloadMagazine.bind(this));
    html.find('[data-action="reload-speedloader"]').on("click", this._onReloadSpeedloader.bind(this));
    html.find('[data-action="reload-single"]').on("click", this._onReloadSingle.bind(this));
  }

  async _onSaveConfig(ev) {
    ev.preventDefault();
    const form = this.element.find("form")[0];
    const fd = new FormDataExtended(form).object;
    const max = Number(fd.max) || 0;
    await AmmoAPI.setConfig(this.item, {
      enabled: true,
      mode: fd.mode,
      max,
      current: Math.min(Number(fd.current) || 0, max),
      caliber: (fd.caliber ?? "").trim(),
    });
    this.render();
  }

  async _onFireOne(ev) {
    ev.preventDefault();
    await AmmoAPI.fire(this.item, 1);
    this.render();
  }

  async _onReloadMagazine(ev) {
    ev.preventDefault();
    const cfg = AmmoAPI.getConfig(this.item);
    const [mag] = AmmoAPI.findCompatibleAmmo(this.item.actor, cfg.caliber, ["magazine"]);
    if (!mag) return ui.notifications.warn(game.i18n.localize("SWAM.NoMagazine"));
    await AmmoAPI.reloadMagazine(this.item, mag);
    this.render();
  }

  async _onReloadSpeedloader(ev) {
    ev.preventDefault();
    const cfg = AmmoAPI.getConfig(this.item);
    const [sl] = AmmoAPI.findCompatibleAmmo(this.item.actor, cfg.caliber, ["speedloader"]);
    if (!sl) return ui.notifications.warn(game.i18n.localize("SWAM.NoSpeedloader"));
    await AmmoAPI.reloadSpeedloader(this.item, sl);
    this.render();
  }

  async _onReloadSingle(ev) {
    ev.preventDefault();
    const cfg = AmmoAPI.getConfig(this.item);
    const [round] = AmmoAPI.findCompatibleAmmo(this.item.actor, cfg.caliber, ["loose"]);
    if (!round) return ui.notifications.warn(game.i18n.localize("SWAM.NoLooseAmmo"));
    await AmmoAPI.reloadSingleRound(this.item, round);
    this.render();
  }
}
