import { AmmoConfigApp } from "./ammo-app.js";

export const MODULE_ID = "swade-ammo-manager";

/* ------------------------------------------------------------------ */
/*  Core API                                                           */
/* ------------------------------------------------------------------ */
/*
 * Weapon items store their ammo config under:
 *   item.flags["swade-ammo-manager"].config = {
 *     enabled: bool,
 *     mode: "magazine" | "single" | "revolver",
 *     current: number,
 *     max: number,
 *     caliber: string   // free-text tag used to match ammo items
 *   }
 *
 * Any other item (gear, etc.) can be tagged as ammo via:
 *   item.flags["swade-ammo-manager"].ammo = {
 *     kind: "loose" | "magazine" | "speedloader",
 *     caliber: string,
 *     capacity: number  // rounds this item supplies when used to reload
 *   }
 * The item's own system.quantity field is used as the stock count.
 */
export const AmmoAPI = {
  getConfig(item) {
    return foundry.utils.mergeObject(
      { enabled: false, mode: "magazine", current: 0, max: 0, caliber: "" },
      item.getFlag(MODULE_ID, "config") ?? {},
      { inplace: false }
    );
  },

  async setConfig(item, data) {
    return item.setFlag(MODULE_ID, "config", data);
  },

  getAmmoFlag(item) {
    return item.getFlag(MODULE_ID, "ammo") ?? null;
  },

  findCompatibleAmmo(actor, caliber, kinds) {
    if (!actor) return [];
    return actor.items.filter((i) => {
      const ammo = i.getFlag(MODULE_ID, "ammo");
      if (!ammo) return false;
      if (!kinds.includes(ammo.kind)) return false;
      if (caliber && ammo.caliber && ammo.caliber !== caliber) return false;
      const qty = foundry.utils.getProperty(i, "system.quantity") ?? 0;
      return qty > 0;
    });
  },

  async consumeOne(ammoItem) {
    const qty = foundry.utils.getProperty(ammoItem, "system.quantity") ?? 0;
    await ammoItem.update({ "system.quantity": Math.max(0, qty - 1) });
  },

  async fire(item, rounds = 1) {
    const cfg = this.getConfig(item);
    if (!cfg.enabled) return cfg.current;
    const newCurrent = Math.max(0, cfg.current - rounds);
    await this.setConfig(item, { ...cfg, current: newCurrent });
    return newCurrent;
  },

  async reloadMagazine(item, ammoItem) {
    const cfg = this.getConfig(item);
    const ammoFlag = this.getAmmoFlag(ammoItem);
    const supplied = ammoFlag?.capacity || cfg.max;
    await this.consumeOne(ammoItem);
    await this.setConfig(item, { ...cfg, current: Math.min(cfg.max, supplied) });
    await this._postChat(
      item,
      game.i18n.format("SWAM.ChatReloadMagazine", { weapon: item.name })
    );
  },

  async reloadSpeedloader(item, ammoItem) {
    const cfg = this.getConfig(item);
    const ammoFlag = this.getAmmoFlag(ammoItem);
    const supplied = ammoFlag?.capacity || cfg.max;
    await this.consumeOne(ammoItem);
    await this.setConfig(item, { ...cfg, current: Math.min(cfg.max, supplied) });
    await this._postChat(
      item,
      game.i18n.format("SWAM.ChatReloadSpeedloader", { weapon: item.name })
    );
  },

  async reloadSingleRound(item, ammoItem) {
    const cfg = this.getConfig(item);
    await this.consumeOne(ammoItem);
    const newCurrent = Math.min(cfg.max, cfg.current + 1);
    await this.setConfig(item, { ...cfg, current: newCurrent });
    await this._postChat(
      item,
      game.i18n.format("SWAM.ChatReloadSingle", {
        weapon: item.name,
        current: newCurrent,
        max: cfg.max,
      })
    );
  },

  async _postChat(item, text) {
    const actor = item.actor;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="swam-chat"><p>${text}</p><p class="swam-action-cost">${game.i18n.localize(
        "SWAM.ActionCostNote"
      )}</p></div>`,
    });
  },
};

window.SWAM = AmmoAPI;

/* ------------------------------------------------------------------ */
/*  Sheet header buttons                                               */
/* ------------------------------------------------------------------ */
Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
  const item = sheet.object ?? sheet.item;
  if (!item) return;

  if (item.type === "weapon") {
    buttons.unshift({
      label: game.i18n.localize("SWAM.HeaderButton"),
      class: "swam-open-ammo",
      icon: "fas fa-box-open",
      onclick: () => new AmmoConfigApp(item).render(true),
    });
  } else {
    // Any non-weapon item can be tagged as an ammo source (loose rounds,
    // magazine, speedloader) so it shows up as reload stock.
    buttons.unshift({
      label: game.i18n.localize("SWAM.TagAmmo"),
      class: "swam-tag-ammo",
      icon: "fas fa-box",
      onclick: () => openAmmoTagDialog(item),
    });
  }
});

function openAmmoTagDialog(item) {
  const current = item.getFlag(MODULE_ID, "ammo") ?? { kind: "", caliber: "", capacity: 1 };
  new Dialog({
    title: game.i18n.localize("SWAM.TagAmmo"),
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("SWAM.AmmoKind")}</label>
          <select name="kind">
            <option value="">${game.i18n.localize("SWAM.NotAmmo")}</option>
            <option value="loose" ${current.kind === "loose" ? "selected" : ""}>${game.i18n.localize("SWAM.KindLoose")}</option>
            <option value="magazine" ${current.kind === "magazine" ? "selected" : ""}>${game.i18n.localize("SWAM.KindMagazine")}</option>
            <option value="speedloader" ${current.kind === "speedloader" ? "selected" : ""}>${game.i18n.localize("SWAM.KindSpeedloader")}</option>
          </select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("SWAM.Caliber")}</label>
          <input type="text" name="caliber" value="${current.caliber ?? ""}"/>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("SWAM.Capacity")}</label>
          <input type="number" name="capacity" value="${current.capacity ?? 1}" min="1"/>
        </div>
        <p class="swam-hint">${game.i18n.localize("SWAM.QuantityHint")}</p>
      </form>`,
    buttons: {
      save: {
        label: game.i18n.localize("SWAM.SaveSetup"),
        callback: async (html) => {
          const fd = new FormDataExtended(html[0].querySelector("form")).object;
          if (!fd.kind) {
            await item.unsetFlag(MODULE_ID, "ammo");
          } else {
            await item.setFlag(MODULE_ID, "ammo", {
              kind: fd.kind,
              caliber: (fd.caliber ?? "").trim(),
              capacity: Number(fd.capacity) || 1,
            });
          }
        },
      },
    },
    default: "save",
  }).render(true);
}
