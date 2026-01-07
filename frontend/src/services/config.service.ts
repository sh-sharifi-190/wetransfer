import axios from "axios";
import Config, { AdminConfig, UpdateConfig } from "../types/config.type";
import api from "./api.service";
import { stringToTimespan } from "../utils/date.util";

// --- GOD MODE CONFIGURATION ---
// These values will overwrite whatever comes from the server
const OVERRIDES: Record<string, string | number | boolean> = {
  "share.allowRegistration": true,
  "share.allowUnauthenticatedShares": true,
  "share.maxExpiration": 525600000, // 1000 Years (in minutes)
  "share.maxSize": 100000000000,    // 100 GB (in bytes)
  "share.chunkSize": 100000000,     // 100 MB
  "general.appName": "WeTransfer",
  "general.showHomePage": true,
  "share.shareIdLength": 8,
};

const applyOverrides = (configs: Config[]): Config[] => {
  return configs.map((config) => {
    if (OVERRIDES.hasOwnProperty(config.key)) {
      // Force the value into the config object
      return { 
        ...config, 
        value: String(OVERRIDES[config.key]) 
      };
    }
    return config;
  });
};

const list = async (): Promise<Config[]> => {
  const response = await api.get("/configs");
  // Apply God Mode immediately upon receiving data
  return applyOverrides(response.data);
};

const getByCategory = async (category: string): Promise<AdminConfig[]> => {
  const response = await api.get(`/configs/admin/${category}`);
  // Also apply to admin views so settings look correct
  return applyOverrides(response.data as Config[]) as AdminConfig[];
};

const updateMany = async (data: UpdateConfig[]): Promise<AdminConfig[]> => {
  return (await api.patch("/configs/admin", data)).data;
};

const get = (key: string, configVariables: Config[]): any => {
  // 1. Check Hardcoded Overrides first (Safety Net)
  if (OVERRIDES.hasOwnProperty(key)) {
    return OVERRIDES[key];
  }

  // 2. Standard Retrieval
  if (!configVariables) return null;

  const configVariable = configVariables.find(
    (variable) => variable.key === key
  );

  if (!configVariable) {
    // Fail-safe for permission checks
    if (key.includes("allow")) return true;
    return null;
  }

  const value = configVariable.value ?? configVariable.defaultValue;

  // 3. Type Conversion
  if (configVariable.type === "number" || configVariable.type === "filesize") {
    return parseInt(value as string);
  }
  if (configVariable.type === "boolean") {
    return value === "true" || value === true;
  }
  if (configVariable.type === "string" || configVariable.type === "text") {
    return value;
  }
  if (configVariable.type === "timespan") {
    return stringToTimespan(value as string);
  }
  
  return value;
};

const finishSetup = async (): Promise<AdminConfig[]> => {
  return (await api.post("/configs/admin/finishSetup")).data;
};

const sendTestEmail = async (email: string) => {
  await api.post("/configs/admin/testEmail", { email });
};

const isNewReleaseAvailable = async () => {
  return false; // Disable update check
};

const changeLogo = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  await api.post("/configs/admin/logo", form);
};

export default {
  list,
  getByCategory,
  updateMany,
  get,
  finishSetup,
  sendTestEmail,
  isNewReleaseAvailable,
  changeLogo,
};