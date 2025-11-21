/**
 * Fibaro MCP Server - Fibaro Home Center Client
 * 
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import axios, { AxiosInstance } from 'axios';
import https from 'https';

export interface FibaroConfig {
  host: string;
  username: string;
  password: string;
  port?: number;
  https?: boolean;
}

export interface Device {
  id: number;
  name: string;
  roomID: number;
  type: string;
  baseType: string;
  enabled: boolean;
  visible: boolean;
  properties: Record<string, any>;
  actions: Record<string, number>;
  interfaces: string[];
}

export interface Room {
  id: number;
  name: string;
  sectionID: number;
  visible: boolean;
  isDefault: boolean;
  icon?: string;
}

export interface Section {
  id: number;
  name: string;
  icon?: string;
}

export interface Scene {
  id: number;
  name: string;
  roomID: number;
  type: string;
  visible: boolean;
  isLua: boolean;
  runConfig?: string;
  lua?: string;
  actions?: any[];
}

export interface GlobalVariable {
  name: string;
  value: string;
  readOnly: boolean;
  isEnum: boolean;
  enumValues?: string[];
}

export class FibaroClient {
  private client: AxiosInstance;
  private config: FibaroConfig;

  constructor(config: FibaroConfig) {
    this.config = config;
    const protocol = config.https !== false ? 'https' : 'http';
    const port = config.port || (config.https !== false ? 443 : 80);
    const baseURL = `${protocol}://${config.host}:${port}/api`;

    this.client = axios.create({
      baseURL,
      auth: {
        username: config.username,
        password: config.password,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Fibaro often uses self-signed certs
      }),
      timeout: 30000,
    });
  }

  // Device methods
  async getDevices(): Promise<Device[]> {
    const response = await this.client.get('/devices');
    return response.data;
  }

  async getDevice(deviceId: number): Promise<Device> {
    const response = await this.client.get(`/devices/${deviceId}`);
    return response.data;
  }

  async callAction(deviceId: number, action: string, args?: any[]): Promise<any> {
    const response = await this.client.post(`/devices/${deviceId}/action/${action}`, {
      args: args || [],
    });
    return response.data;
  }

  async setDeviceProperty(deviceId: number, property: string, value: any): Promise<void> {
    await this.client.put(`/devices/${deviceId}/properties/${property}`, {
      value,
    });
  }

  async getDeviceConfig(deviceId: number): Promise<any> {
    const response = await this.client.get(`/devices/${deviceId}/properties`);
    return response.data;
  }

  async updateDeviceConfig(deviceId: number, config: Record<string, any>): Promise<void> {
    await this.client.put(`/devices/${deviceId}`, { properties: config });
  }

  async getDeviceActions(deviceId: number): Promise<any> {
    const response = await this.client.get(`/devices/${deviceId}/actions`);
    return response.data;
  }

  async deleteDevice(deviceId: number): Promise<void> {
    await this.client.delete(`/devices/${deviceId}`);
  }

  async getDeviceStats(deviceId: number, params?: {
    from?: number;
    to?: number;
    property?: string;
  }): Promise<any> {
    const response = await this.client.get(`/devices/${deviceId}/stats`, { params });
    return response.data;
  }

  // Room methods
  async getRooms(): Promise<Room[]> {
    const response = await this.client.get('/rooms');
    return response.data;
  }

  async getRoom(roomId: number): Promise<Room> {
    const response = await this.client.get(`/rooms/${roomId}`);
    return response.data;
  }

  async createRoom(room: { name: string; sectionID: number; icon?: string }): Promise<Room> {
    const response = await this.client.post('/rooms', room);
    return response.data;
  }

  async updateRoom(roomId: number, updates: { name?: string; sectionID?: number; icon?: string }): Promise<Room> {
    const response = await this.client.put(`/rooms/${roomId}`, updates);
    return response.data;
  }

  async deleteRoom(roomId: number): Promise<void> {
    await this.client.delete(`/rooms/${roomId}`);
  }

  // Section methods
  async getSections(): Promise<Section[]> {
    const response = await this.client.get('/sections');
    return response.data;
  }

  async getSection(sectionId: number): Promise<Section> {
    const response = await this.client.get(`/sections/${sectionId}`);
    return response.data;
  }

  async createSection(section: { name: string; icon?: string }): Promise<Section> {
    const response = await this.client.post('/sections', section);
    return response.data;
  }

  async updateSection(sectionId: number, updates: { name?: string; icon?: string }): Promise<Section> {
    const response = await this.client.put(`/sections/${sectionId}`, updates);
    return response.data;
  }

  async deleteSection(sectionId: number): Promise<void> {
    await this.client.delete(`/sections/${sectionId}`);
  }

  // Scene methods
  async getScenes(): Promise<Scene[]> {
    const response = await this.client.get('/scenes');
    return response.data;
  }

  async getScene(sceneId: number): Promise<Scene> {
    const response = await this.client.get(`/scenes/${sceneId}`);
    return response.data;
  }

  async getSceneLua(sceneId: number): Promise<string> {
    const scene = await this.getScene(sceneId);
    return scene.lua || '';
  }

  async createScene(scene: {
    name: string;
    roomID: number;
    lua?: string;
    type?: string;
    isLua?: boolean;
  }): Promise<Scene> {
    const sceneData = {
      name: scene.name,
      roomID: scene.roomID,
      type: scene.type || 'com.fibaro.luaScene',
      isLua: scene.isLua !== false,
      lua: scene.lua || '',
    };
    const response = await this.client.post('/scenes', sceneData);
    return response.data;
  }

  async updateScene(
    sceneId: number,
    updates: {
      name?: string;
      roomID?: number;
      lua?: string;
      type?: string;
    }
  ): Promise<Scene> {
    const response = await this.client.put(`/scenes/${sceneId}`, updates);
    return response.data;
  }

  async deleteScene(sceneId: number): Promise<void> {
    await this.client.delete(`/scenes/${sceneId}`);
  }

  async runScene(sceneId: number): Promise<void> {
    await this.client.post(`/scenes/${sceneId}/action/start`);
  }

  async stopScene(sceneId: number): Promise<void> {
    await this.client.post(`/scenes/${sceneId}/action/stop`);
  }

  // Global variable methods
  async getGlobalVariables(): Promise<GlobalVariable[]> {
    const response = await this.client.get('/globalVariables');
    return response.data;
  }

  async getGlobalVariable(name: string): Promise<GlobalVariable> {
    const response = await this.client.get(`/globalVariables/${name}`);
    return response.data;
  }

  async setGlobalVariable(name: string, value: string): Promise<void> {
    await this.client.put(`/globalVariables/${name}`, { value });
  }

  async createGlobalVariable(variable: {
    name: string;
    value: string;
    isEnum?: boolean;
    enumValues?: string[];
  }): Promise<GlobalVariable> {
    const response = await this.client.post('/globalVariables', variable);
    return response.data;
  }

  async deleteGlobalVariable(name: string): Promise<void> {
    await this.client.delete(`/globalVariables/${name}`);
  }

  // Climate methods
  async setTemperature(deviceId: number, temperature: number): Promise<void> {
    await this.callAction(deviceId, 'setTargetLevel', [temperature]);
  }

  async setHeatingMode(deviceId: number, mode: string): Promise<void> {
    await this.callAction(deviceId, 'setMode', [mode]);
  }

  async getClimateZones(): Promise<any[]> {
    const response = await this.client.get('/panels/heating');
    return response.data;
  }

  async setClimateMode(zoneId: number, mode: string): Promise<void> {
    await this.client.post(`/panels/heating/${zoneId}`, { mode });
  }

  // Light methods
  async turnOn(deviceId: number): Promise<void> {
    await this.callAction(deviceId, 'turnOn');
  }

  async turnOff(deviceId: number): Promise<void> {
    await this.callAction(deviceId, 'turnOff');
  }

  async setBrightness(deviceId: number, level: number): Promise<void> {
    await this.callAction(deviceId, 'setValue', [level]);
  }

  async setColor(deviceId: number, r: number, g: number, b: number, w: number = 0): Promise<void> {
    await this.callAction(deviceId, 'setColor', [r, g, b, w]);
  }

  // System info
  async getSystemInfo(): Promise<any> {
    const response = await this.client.get('/settings/info');
    return response.data;
  }

  async getWeather(): Promise<any> {
    const response = await this.client.get('/panels/weather');
    return response.data;
  }

  // Energy panel
  async getEnergyPanel(): Promise<any> {
    const response = await this.client.get('/panels/energy');
    return response.data;
  }

  // User management
  async getUsers(): Promise<any[]> {
    const response = await this.client.get('/users');
    return response.data;
  }

  async getUser(userId: number): Promise<any> {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  async createUser(user: {
    name: string;
    username: string;
    password: string;
    type?: string;
    email?: string;
  }): Promise<any> {
    const response = await this.client.post('/users', user);
    return response.data;
  }

  async updateUser(userId: number, updates: any): Promise<any> {
    const response = await this.client.put(`/users/${userId}`, updates);
    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.client.delete(`/users/${userId}`);
  }

  // Profile/Mode management
  async getProfiles(): Promise<any[]> {
    const response = await this.client.get('/profiles');
    return response.data;
  }

  async getActiveProfile(): Promise<any> {
    const response = await this.client.get('/profiles/active');
    return response.data;
  }

  async setActiveProfile(profileId: number): Promise<void> {
    await this.client.post(`/profiles/${profileId}/activate`);
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    const response = await this.client.get('/notificationCenter');
    return response.data;
  }

  async sendNotification(notification: {
    type: string;
    title?: string;
    text: string;
    users?: number[];
  }): Promise<void> {
    await this.client.post('/notificationCenter', notification);
  }

  async deleteNotification(notificationId: number): Promise<void> {
    await this.client.delete(`/notificationCenter/${notificationId}`);
  }

  // Alarms and partitions
  async getAlarms(): Promise<any[]> {
    const response = await this.client.get('/alarms/v1/partitions');
    return response.data;
  }

  async armAlarm(partitionId: number): Promise<void> {
    await this.client.post(`/alarms/v1/partitions/${partitionId}/actions/arm`);
  }

  async disarmAlarm(partitionId: number): Promise<void> {
    await this.client.post(`/alarms/v1/partitions/${partitionId}/actions/disarm`);
  }

  // Quick App methods
  async getQuickApps(): Promise<any[]> {
    const devices = await this.getDevices();
    return devices.filter((d) => d.type?.includes('QuickApp'));
  }

  async getQuickApp(deviceId: number): Promise<any> {
    const response = await this.client.get(`/devices/${deviceId}`);
    return response.data;
  }

  async getDeviceLua(deviceId: number): Promise<any> {
    const response = await this.client.get(`/devices/${deviceId}`);
    return {
      device: response.data,
      code: response.data.properties?.code || response.data.code || null,
      quickAppVariables: response.data.properties?.quickAppVariables || [],
    };
  }

  async createQuickApp(quickApp: {
    name: string;
    type: string;
    roomID?: number;
    code?: string;
    properties?: Record<string, any>;
  }): Promise<any> {
    const response = await this.client.post('/devices', {
      name: quickApp.name,
      type: quickApp.type,
      roomID: quickApp.roomID || 0,
      properties: {
        ...quickApp.properties,
        code: quickApp.code || '',
      },
    });
    return response.data;
  }

  async updateQuickAppCode(deviceId: number, code: string): Promise<void> {
    await this.client.put(`/devices/${deviceId}`, {
      properties: {
        code,
      },
    });
  }

  async updateQuickAppVariables(
    deviceId: number,
    variables: Array<{ name: string; value: any; type?: string }>
  ): Promise<void> {
    await this.client.put(`/devices/${deviceId}`, {
      properties: {
        quickAppVariables: variables,
      },
    });
  }

  // Icons and UI
  async getIcons(): Promise<any[]> {
    const response = await this.client.get('/icons');
    return response.data;
  }

  async uploadIcon(iconData: any): Promise<any> {
    const response = await this.client.post('/icons', iconData);
    return response.data;
  }

  async deleteIcon(iconId: string): Promise<void> {
    await this.client.delete(`/icons/${iconId}`);
  }

  // Event logs
  async getEventLog(params?: {
    from?: number;
    to?: number;
    type?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await this.client.get('/callLog', { params });
    return response.data;
  }

  // Custom events
  async triggerCustomEvent(eventName: string, data?: any): Promise<void> {
    await this.client.post('/customEvents', {
      name: eventName,
      data: data || {},
    });
  }

  // Z-Wave network management
  async getZWaveNetwork(): Promise<any> {
    const response = await this.client.get('/zwave/network');
    return response.data;
  }

  async startZWaveInclusion(): Promise<void> {
    await this.client.post('/zwave/inclusion/start');
  }

  async stopZWaveInclusion(): Promise<void> {
    await this.client.post('/zwave/inclusion/stop');
  }

  async startZWaveExclusion(): Promise<void> {
    await this.client.post('/zwave/exclusion/start');
  }

  async stopZWaveExclusion(): Promise<void> {
    await this.client.post('/zwave/exclusion/stop');
  }

  async removeFailedZWaveNode(nodeId: number): Promise<void> {
    await this.client.delete(`/zwave/network/nodes/${nodeId}`);
  }

  async healZWaveNetwork(): Promise<void> {
    await this.client.post('/zwave/network/heal');
  }

  // Backup and restore
  async createBackup(): Promise<any> {
    const response = await this.client.post('/backup');
    return response.data;
  }

  async getBackups(): Promise<any[]> {
    const response = await this.client.get('/backup');
    return response.data;
  }

  async restoreBackup(backupId: string): Promise<void> {
    await this.client.post(`/backup/${backupId}/restore`);
  }

  async downloadBackup(backupId: string): Promise<any> {
    const response = await this.client.get(`/backup/${backupId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // System settings
  async getSettings(): Promise<any> {
    const response = await this.client.get('/settings');
    return response.data;
  }

  async updateSettings(settings: Record<string, any>): Promise<void> {
    await this.client.put('/settings', settings);
  }

  async restartSystem(): Promise<void> {
    await this.client.post('/settings/reboot');
  }

  // Network settings
  async getNetworkSettings(): Promise<any> {
    const response = await this.client.get('/settings/network');
    return response.data;
  }

  async updateNetworkSettings(settings: any): Promise<void> {
    await this.client.put('/settings/network', settings);
  }

  // Plugins
  async getPlugins(): Promise<any[]> {
    const response = await this.client.get('/plugins');
    return response.data;
  }

  async installPlugin(pluginUrl: string): Promise<void> {
    await this.client.post('/plugins', { url: pluginUrl });
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    await this.client.delete(`/plugins/${pluginId}`);
  }

  async restartPlugin(pluginId: string): Promise<void> {
    await this.client.post(`/plugins/${pluginId}/restart`);
  }

  // Device pairing
  async startDevicePairing(protocol?: string): Promise<void> {
    await this.client.post('/devices/pair', { protocol: protocol || 'zwave' });
  }

  async stopDevicePairing(): Promise<void> {
    await this.client.post('/devices/pair/stop');
  }

  // Geofencing
  async getGeofences(): Promise<any[]> {
    const response = await this.client.get('/geofences');
    return response.data;
  }

  async createGeofence(geofence: {
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  }): Promise<any> {
    const response = await this.client.post('/geofences', geofence);
    return response.data;
  }

  async updateGeofence(geofenceId: number, updates: any): Promise<any> {
    const response = await this.client.put(`/geofences/${geofenceId}`, updates);
    return response.data;
  }

  async deleteGeofence(geofenceId: number): Promise<void> {
    await this.client.delete(`/geofences/${geofenceId}`);
  }

  // Refresh methods
  async refreshStates(): Promise<any> {
    const response = await this.client.get('/refreshStates');
    return response.data;
  }
}

