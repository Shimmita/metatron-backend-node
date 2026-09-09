import PlatformSettingsModel from "../model/PlatformSettingsModel.js";

const SETTINGS_KEY = "platform";

export const defaultPlatformSettings = {
  jobGeographicApplicationRestriction: false,
};

export const getPlatformSettings = async () => {
  const settings = await PlatformSettingsModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY, ...defaultPlatformSettings } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    ...defaultPlatformSettings,
    ...settings,
  };
};

export const updatePlatformSettings = async (updates = {}, updatedBy = "") => {
  const allowedUpdates = {};

  if (typeof updates.jobGeographicApplicationRestriction === "boolean") {
    allowedUpdates.jobGeographicApplicationRestriction = updates.jobGeographicApplicationRestriction;
  }

  const settings = await PlatformSettingsModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        ...allowedUpdates,
        updatedBy,
      },
      $setOnInsert: {
        key: SETTINGS_KEY,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    ...defaultPlatformSettings,
    ...settings,
  };
};
