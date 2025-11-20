import fs from 'fs-extra';
import path from 'path';
import { StylePreferences, ConfigData } from './types';

export class ConfigManager {
  private configDir: string;
  private configFile: string;

  constructor(configDir: string = 'data/configs') {
    this.configDir = configDir;
    fs.ensureDirSync(configDir);
    this.configFile = path.join(configDir, 'saved_configs.json');
  }

  async saveConfig(configName: string, configData: StylePreferences): Promise<boolean> {
    try {
      const configs = await this.loadAllConfigs();
      
      configs[configName] = {
        name: configName,
        data: configData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await fs.writeJSON(this.configFile, configs, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  async loadConfig(configName: string): Promise<StylePreferences | null> {
    try {
      const configs = await this.loadAllConfigs();
      if (configName in configs) {
        return configs[configName].data;
      }
      return null;
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }

  async loadAllConfigs(): Promise<Record<string, ConfigData>> {
    try {
      if (await fs.pathExists(this.configFile)) {
        return await fs.readJSON(this.configFile);
      }
      return {};
    } catch (error) {
      console.error('Error reading config file:', error);
      return {};
    }
  }

  async getConfigNames(): Promise<string[]> {
    const configs = await this.loadAllConfigs();
    return Object.keys(configs);
  }

  async deleteConfig(configName: string): Promise<boolean> {
    try {
      const configs = await this.loadAllConfigs();
      if (configName in configs) {
        delete configs[configName];
        await fs.writeJSON(this.configFile, configs, { spaces: 2 });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting config:', error);
      return false;
    }
  }
}

let globalConfigManager: ConfigManager | null = null;

export function getGlobalConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager();
  }
  return globalConfigManager;
}



