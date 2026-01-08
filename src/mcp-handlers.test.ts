import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { getResources, getTools, handleResourceRead, handleToolCall } from "./mcp-handlers.js";

function synthesizeArgFromSchema(schema: any): any {
  if (!schema) return undefined;
  if (schema.const !== undefined) return schema.const;
  if (schema.default !== undefined) return schema.default;

  const t = schema.type;
  if (t === "number" || t === "integer") return 1;
  if (t === "string") return "x";
  if (t === "boolean") return true;
  if (t === "array") {
    const item = schema.items ? synthesizeArgFromSchema(schema.items) : undefined;
    return item === undefined ? [] : [item];
  }
  if (t === "object") {
    const out: Record<string, any> = {};
    const required: string[] = Array.isArray(schema.required) ? schema.required : [];
    const props: Record<string, any> = schema.properties || {};
    for (const key of required) {
      out[key] = synthesizeArgFromSchema(props[key]);
    }
    return out;
  }

  // If schema omits type, try to infer from common patterns
  if (schema.properties) {
    return synthesizeArgFromSchema({
      type: "object",
      properties: schema.properties,
      required: schema.required,
    });
  }
  return undefined;
}

function makeClient(overrides: Partial<any> = {}) {
  return {
    getDevices: async () => [
      {
        id: 1,
        name: "Kitchen Lamp",
        roomID: 10,
        type: "t",
        baseType: "b",
        enabled: true,
        visible: true,
        interfaces: ["power"],
        parentId: 99,
        dead: false,
        properties: { value: 1 },
      },
      {
        id: 2,
        name: "Bedroom Lamp",
        roomID: 11,
        type: "t2",
        baseType: "b2",
        enabled: false,
        visible: true,
        interfaces: ["battery"],
        parentId: 100,
        dead: true,
        properties: { value: 2 },
      },
    ],
    getDevice: async (id: number) => ({ id, name: `Device ${id}` }),
    callAction: async () => ({ ok: true }),
    turnOn: async () => {},
    turnOff: async () => {},
    setBrightness: async () => {},
    setColor: async () => {},
    setTemperature: async () => {},
    getRooms: async () => [
      { id: 10, name: "Kitchen", sectionID: 100, visible: true, isDefault: false },
      { id: 11, name: "Bedroom", sectionID: 100, visible: true, isDefault: false },
    ],
    getSections: async () => [{ id: 100, name: "Home" }],
    getScenes: async () => [{ id: 5, name: "S", roomID: 10 }],
    getScene: async (id: number) => ({ id, name: "S", roomID: 10 }),
    runScene: async () => {},
    stopScene: async () => {},
    getGlobalVariables: async () => [],
    getGlobalVariable: async () => ({ name: "x", value: "y" }),
    setGlobalVariable: async () => {},
    getSystemInfo: async () => ({ ok: true }),
    getWeather: async () => ({ ok: true }),
    getEnergyPanel: async () => ({ ok: true }),
    getSceneLua: async () => "",
    getQuickApps: async () => [],
    getDeviceLua: async () => ({ device: { id: 1, name: "QA" }, code: "", quickAppVariables: [] }),
    createScene: async () => ({ id: 9, name: "N" }),
    updateScene: async () => ({ id: 9, name: "N" }),
    deleteScene: async () => {},
    createQuickApp: async () => ({ id: 8, name: "QA" }),
    updateQuickAppCode: async () => {},
    updateQuickAppVariables: async () => {},
    deleteQuickApp: async () => {},
    deleteDevice: async () => {},
    createRoom: async () => ({ id: 12, name: "New Room" }),
    updateRoom: async (id: number) => ({ id, name: "Updated Room" }),
    deleteRoom: async () => {},
    createSection: async () => ({ id: 101, name: "New Section" }),
    updateSection: async (id: number) => ({ id, name: "Updated Section" }),
    deleteSection: async () => {},
    getPanels: async () => ({}),
    getClimateZones: async () => [],
    setClimateMode: async () => {},
    getUsers: async () => [],
    getUser: async () => ({}),
    getUserSettings: async () => ({}),
    getSystemSettings: async () => ({}),
    createUser: async () => ({ id: 55, name: "User" }),
    updateUser: async () => ({}),
    deleteUser: async () => {},
    getProfiles: async () => [{ id: 1, name: "Home" }],
    getActiveProfile: async () => ({ id: 1, name: "Home" }),
    setActiveProfile: async () => {},
    getNotifications: async () => [{ id: 1, text: "N" }],
    sendNotification: async () => ({}),
    getAlarms: async () => ({}),
    getAlarmPartitions: async () => ({}),
    getAlarmDevices: async () => ({}),
    armAlarm: async () => {},
    disarmAlarm: async () => {},
    getLastEvents: async () => ({}),
    getHistory: async () => ({}),
    getDeviceStats: async () => ({}),
    createGlobalVariable: async () => ({ name: "x" }),
    deleteGlobalVariable: async () => {},
    createBackup: async () => ({ id: "b" }),
    getBackups: async () => [{ id: "b" }],
    restoreBackup: async () => {},
    getSettings: async () => ({ ok: true }),
    updateSettings: async () => {},
    restartSystem: async () => {},
    getEventLog: async () => [{ id: 1 }],
    getGeofences: async () => [{ id: 1, name: "G" }],
    createGeofence: async () => ({ id: 1, name: "G" }),
    updateGeofence: async () => ({}),
    deleteGeofence: async () => {},
    getPlugins: async () => [{ id: "p" }],
    installPlugin: async () => ({}),
    uninstallPlugin: async () => ({}),
    restartPlugin: async () => ({}),
    triggerCustomEvent: async () => ({}),
    getZWaveNetwork: async () => ({ ok: true }),
    startZWaveInclusion: async () => {},
    stopZWaveInclusion: async () => {},
    startZWaveExclusion: async () => {},
    stopZWaveExclusion: async () => {},
    removeFailedZWaveNode: async () => {},
    healZWaveNetwork: async () => {},
    ...overrides,
  };
}

describe("mcp-handlers", () => {
  const prevEnvToolset = process.env.FIBARO_TOOLSET;

  afterEach(() => {
    process.env.FIBARO_TOOLSET = prevEnvToolset;
    vi.restoreAllMocks();
  });

  it("intent routing: missing op throws InvalidParams for intent tools", async () => {
    const { McpError } = await import("@modelcontextprotocol/sdk/types.js");
    const client = makeClient();

    await expect(handleToolCall(client as any, "fibaro_device", {})).rejects.toBeInstanceOf(
      McpError,
    );
    await expect(handleToolCall(client as any, "fibaro_scene", {})).rejects.toBeInstanceOf(
      McpError,
    );
    await expect(handleToolCall(client as any, "fibaro_variable", {})).rejects.toBeInstanceOf(
      McpError,
    );
    await expect(handleToolCall(client as any, "fibaro_quick_app", {})).rejects.toBeInstanceOf(
      McpError,
    );
    await expect(handleToolCall(client as any, "fibaro_home", {})).rejects.toBeInstanceOf(McpError);
  });

  it("getTools returns a tools list containing find_by_name and resolve_by_name", () => {
    const res = getTools();
    expect(res.tools.some((t) => t.name === "find_by_name")).toBe(true);
    expect(res.tools.some((t) => t.name === "resolve_by_name")).toBe(true);
  });

  it("getTools respects FIBARO_TOOLSET=legacy and does not include intent tools", () => {
    process.env.FIBARO_TOOLSET = "legacy";
    const res = getTools();
    expect(res.tools.some((t) => t.name === "list_devices")).toBe(true);
    expect(res.tools.some((t) => t.name === "fibaro_device")).toBe(false);
  });

  it("getTools respects FIBARO_TOOLSET=both and includes both intent and legacy tools", () => {
    process.env.FIBARO_TOOLSET = "both";
    const res = getTools();
    expect(res.tools.some((t) => t.name === "list_devices")).toBe(true);
    expect(res.tools.some((t) => t.name === "fibaro_device")).toBe(true);
    expect(res.tools.some((t) => t.name === "find_by_name")).toBe(true);
    expect(res.tools.some((t) => t.name === "resolve_by_name")).toBe(true);
  });

  it("getResources includes fibaro://devices", () => {
    const res = getResources();
    expect(res.resources.some((r) => r.uri === "fibaro://devices")).toBe(true);
  });

  it("handleResourceRead returns JSON text for known resource", async () => {
    const out = await handleResourceRead(makeClient(), "fibaro://devices");
    expect(out.contents[0].mimeType).toBe("application/json");
    const text = (out.contents[0] as any).text as string;
    expect(text).toContain("Kitchen Lamp");
  });

  it("handleResourceRead supports all known resource uris", async () => {
    const client = makeClient();
    const resources = getResources().resources;
    expect(resources.length).toBeGreaterThan(0);

    for (const r of resources) {
      const out = await handleResourceRead(client, r.uri);
      expect(out.contents[0].mimeType).toBe("application/json");
      expect(typeof (out.contents[0] as any).text).toBe("string");
    }
  });

  it("handleResourceRead throws on unknown resource", async () => {
    await expect(handleResourceRead(makeClient(), "fibaro://nope")).rejects.toBeInstanceOf(
      McpError,
    );
  });

  it("handleToolCall list_devices filters by name", async () => {
    const out = await handleToolCall(makeClient(), "list_devices", { name: "kitchen" });
    const text = (out.content[0] as any).text as string;
    expect(text).toContain("Kitchen Lamp");
    expect(text).not.toContain("Bedroom Lamp");
  });

  it("handleToolCall wraps result as JSON string when format=json (and strips format from forwarded args)", async () => {
    const client = makeClient();
    const out = await handleToolCall(client, "list_devices", { format: "json" });
    const text = (out.content[0] as any).text as string;
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty("content");
    expect(Array.isArray(parsed.content)).toBe(true);
  });

  it("handleToolCall supports first_run with non-object args (covers forwardedArgs non-object path)", async () => {
    const out = await handleToolCall(makeClient(), "first_run", "x" as any);
    const text = (out.content[0] as any).text as string;
    expect(text).toContain("first_run: configuration helper");
  });

  it("intent routing: fibaro_device supports common ops", async () => {
    const turnOn = vi.fn(async () => {});
    const turnOff = vi.fn(async () => {});
    const callAction = vi.fn(async () => ({ ok: true }));
    const setBrightness = vi.fn(async () => {});
    const setColor = vi.fn(async () => {});
    const setTemperature = vi.fn(async () => {});
    const getDevice = vi.fn(async (id: number) => ({ id, name: `Device ${id}` }));
    const deleteDevice = vi.fn(async () => {});
    const getDeviceLua = vi.fn(async () => ({
      device: { id: 1, name: "QA" },
      code: "",
      quickAppVariables: [],
    }));
    const client = makeClient({
      turnOn,
      turnOff,
      callAction,
      setBrightness,
      setColor,
      setTemperature,
      getDevice,
      deleteDevice,
      getDeviceLua,
    });

    await handleToolCall(client, "fibaro_device", { op: "turn_on", device_id: 1 });
    expect(turnOn).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", { op: "list" });

    await handleToolCall(client, "fibaro_device", { op: "turn_off", device_id: 1 });
    expect(turnOff).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", {
      op: "action",
      device_id: 1,
      action: "x",
      args: [1],
    });
    expect(callAction).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", {
      op: "set_brightness",
      device_id: 1,
      level: 50,
    });
    expect(setBrightness).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", {
      op: "set_color",
      device_id: 1,
      r: 1,
      g: 2,
      b: 3,
      w: 4,
    });
    expect(setColor).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", {
      op: "set_temperature",
      device_id: 1,
      temperature: 21,
    });
    expect(setTemperature).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", { op: "get", device_id: 1 });
    expect(getDevice).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", { op: "get_lua", device_id: 1 });
    expect(getDeviceLua).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_device", { op: "delete", device_id: 1 });
    expect(deleteDevice).toHaveBeenCalled();

    const unknown = await handleToolCall(client, "fibaro_device", { op: "nope" });
    expect((unknown.content[0] as any).text).toContain("unsupported op");
  });

  it("intent routing: fibaro_scene supports list/get/run/stop/create/update_lua/delete and unknown op", async () => {
    const runScene = vi.fn(async () => {});
    const stopScene = vi.fn(async () => {});
    const createScene = vi.fn(async () => ({ id: 9, name: "N" }));
    const updateScene = vi.fn(async () => ({ id: 9, name: "N" }));
    const deleteScene = vi.fn(async () => {});
    const getScene = vi.fn(async (id: number) => ({ id, name: "S", roomID: 10, lua: "--" }));
    const client = makeClient({
      runScene,
      stopScene,
      createScene,
      updateScene,
      deleteScene,
      getScene,
    });

    await handleToolCall(client, "fibaro_scene", { op: "list" });
    await handleToolCall(client, "fibaro_scene", { op: "get", scene_id: 5 });
    await handleToolCall(client, "fibaro_scene", { op: "run", scene_id: 5 });
    expect(runScene).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_scene", { op: "stop", scene_id: 5 });
    expect(stopScene).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_scene", { op: "create", name: "N", room_id: 10, lua: "" });
    expect(createScene).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_scene", { op: "update_lua", scene_id: 5, lua: "--" });
    expect(updateScene).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_scene", { op: "delete", scene_id: 5 });
    expect(deleteScene).toHaveBeenCalled();

    const luaOut = await handleToolCall(client, "fibaro_scene", { op: "get_lua", scene_id: 5 });
    expect(getScene).toHaveBeenCalled();
    expect((luaOut.content[0] as any).text).toContain("--");

    const unknown = await handleToolCall(client, "fibaro_scene", { op: "nope" });
    expect((unknown.content[0] as any).text).toContain("unsupported op");
  });

  it("intent routing: fibaro_variable supports list/get/set/create/delete and unknown op", async () => {
    const setGlobalVariable = vi.fn(async () => {});
    const createGlobalVariable = vi.fn(async () => ({ name: "x" }));
    const deleteGlobalVariable = vi.fn(async () => {});
    const client = makeClient({ setGlobalVariable, createGlobalVariable, deleteGlobalVariable });

    await handleToolCall(client, "fibaro_variable", { op: "list" });
    await handleToolCall(client, "fibaro_variable", { op: "get", name: "x" });
    await handleToolCall(client, "fibaro_variable", { op: "set", name: "x", value: "y" });
    expect(setGlobalVariable).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_variable", { op: "create", name: "x", value: "y" });
    expect(createGlobalVariable).toHaveBeenCalled();

    await handleToolCall(client, "fibaro_variable", {
      op: "create",
      variable: { name: "x", value: "y", isEnum: false },
    });
    expect(createGlobalVariable).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_variable", { op: "delete", name: "x" });
    expect(deleteGlobalVariable).toHaveBeenCalled();

    const unknown = await handleToolCall(client, "fibaro_variable", { op: "nope" });
    expect((unknown.content[0] as any).text).toContain("unsupported op");
  });

  it("intent routing: fibaro_quick_app supports list/create/update_code/update_variables/get_lua/delete and unknown op", async () => {
    const getQuickApps = vi.fn(async () => []);
    const createQuickApp = vi.fn(async () => ({ id: 8, name: "QA" }));
    const updateQuickAppCode = vi.fn(async () => {});
    const updateQuickAppVariables = vi.fn(async () => {});
    const getDeviceLua = vi.fn(async () => ({
      device: { id: 1, name: "QA" },
      code: "",
      quickAppVariables: [],
    }));
    const deleteDevice = vi.fn(async () => {});
    const client = makeClient({
      getQuickApps,
      createQuickApp,
      updateQuickAppCode,
      updateQuickAppVariables,
      getDeviceLua,
      deleteDevice,
    });

    await handleToolCall(client, "fibaro_quick_app", { op: "list" });
    expect(getQuickApps).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_quick_app", {
      op: "create",
      name: "QA",
      type: "t",
      code: "",
    });
    expect(createQuickApp).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_quick_app", { op: "update_code", device_id: 1, code: "" });
    expect(updateQuickAppCode).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_quick_app", {
      op: "update_variables",
      device_id: 1,
      variables: [{ name: "x", value: "y" }],
    });
    expect(updateQuickAppVariables).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_quick_app", { op: "get_lua", device_id: 1 });
    expect(getDeviceLua).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_quick_app", { op: "delete", device_id: 1 });
    expect(deleteDevice).toHaveBeenCalled();

    const unknown = await handleToolCall(client, "fibaro_quick_app", { op: "nope" });
    expect((unknown.content[0] as any).text).toContain("unsupported op");
  });

  it("intent routing: fibaro_home supports representative ops and unknown op", async () => {
    const getSystemInfo = vi.fn(async () => ({ ok: true }));
    const getWeather = vi.fn(async () => ({ ok: true }));
    const getEnergyPanel = vi.fn(async () => ({ ok: true }));
    const getRooms = vi.fn(async () => [{ id: 10, name: "Kitchen", sectionID: 100 }]);
    const getSections = vi.fn(async () => [{ id: 100, name: "Home" }]);
    const createRoom = vi.fn(async () => ({ id: 12, name: "New Room" }));
    const updateRoom = vi.fn(async () => ({ id: 12, name: "Updated Room" }));
    const deleteRoom = vi.fn(async () => {});
    const createSection = vi.fn(async () => ({ id: 101, name: "New Section" }));
    const updateSection = vi.fn(async () => ({ id: 101, name: "Updated Section" }));
    const deleteSection = vi.fn(async () => {});
    const getUsers = vi.fn(async () => []);
    const createUser = vi.fn(async () => ({ id: 55, name: "User" }));
    const updateUser = vi.fn(async () => ({}));
    const deleteUser = vi.fn(async () => {});
    const getProfiles = vi.fn(async () => [{ id: 1, name: "Home" }]);
    const getActiveProfile = vi.fn(async () => ({ id: 1, name: "Home" }));
    const setActiveProfile = vi.fn(async () => {});
    const getNotifications = vi.fn(async () => [{ id: 1, text: "N" }]);
    const sendNotification = vi.fn(async () => ({}));
    const getAlarms = vi.fn(async () => ({}));
    const armAlarm = vi.fn(async () => {});
    const disarmAlarm = vi.fn(async () => {});
    const getZWaveNetwork = vi.fn(async () => ({ ok: true }));
    const startZWaveInclusion = vi.fn(async () => {});
    const stopZWaveInclusion = vi.fn(async () => {});
    const startZWaveExclusion = vi.fn(async () => {});
    const stopZWaveExclusion = vi.fn(async () => {});
    const removeFailedZWaveNode = vi.fn(async () => {});
    const healZWaveNetwork = vi.fn(async () => {});
    const createBackup = vi.fn(async () => ({ id: "b" }));
    const getBackups = vi.fn(async () => [{ id: "b" }]);
    const restoreBackup = vi.fn(async () => {});
    const getSettings = vi.fn(async () => ({ ok: true }));
    const updateSettings = vi.fn(async () => {});
    const restartSystem = vi.fn(async () => {});
    const getEventLog = vi.fn(async () => [{ id: 1 }]);
    const getGeofences = vi.fn(async () => [{ id: 1, name: "G" }]);
    const createGeofence = vi.fn(async () => ({ id: 1, name: "G" }));
    const updateGeofence = vi.fn(async () => ({}));
    const deleteGeofence = vi.fn(async () => {});
    const getPlugins = vi.fn(async () => [{ id: "p" }]);
    const installPlugin = vi.fn(async () => ({}));
    const uninstallPlugin = vi.fn(async () => ({}));
    const restartPlugin = vi.fn(async () => ({}));
    const triggerCustomEvent = vi.fn(async () => ({}));
    const getDeviceStats = vi.fn(async () => ({}));
    const client = makeClient({
      getSystemInfo,
      getWeather,
      getEnergyPanel,
      getRooms,
      getSections,
      createRoom,
      updateRoom,
      deleteRoom,
      createSection,
      updateSection,
      deleteSection,
      getUsers,
      createUser,
      updateUser,
      deleteUser,
      getProfiles,
      getActiveProfile,
      setActiveProfile,
      getNotifications,
      sendNotification,
      getAlarms,
      armAlarm,
      disarmAlarm,
      getZWaveNetwork,
      startZWaveInclusion,
      stopZWaveInclusion,
      startZWaveExclusion,
      stopZWaveExclusion,
      removeFailedZWaveNode,
      healZWaveNetwork,
      createBackup,
      getBackups,
      restoreBackup,
      getSettings,
      updateSettings,
      restartSystem,
      getEventLog,
      getGeofences,
      createGeofence,
      updateGeofence,
      deleteGeofence,
      getPlugins,
      installPlugin,
      uninstallPlugin,
      restartPlugin,
      triggerCustomEvent,
      getDeviceStats,
    });

    await handleToolCall(client, "fibaro_home", { op: "system_info" });
    expect(getSystemInfo).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "weather" });
    expect(getWeather).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "energy_panel" });
    expect(getEnergyPanel).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "rooms" });
    expect(getRooms).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "sections" });
    expect(getSections).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "create_room",
      name: "New Room",
      section_id: 100,
    });
    expect(createRoom).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "update_room",
      room_id: 12,
      name: "Updated Room",
    });
    expect(updateRoom).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "delete_room", room_id: 12 });
    expect(deleteRoom).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "create_section", name: "New Section" });
    expect(createSection).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "update_section",
      section_id: 101,
      name: "Updated Section",
    });
    expect(updateSection).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "delete_section", section_id: 101 });
    expect(deleteSection).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "users" });
    expect(getUsers).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "create_user",
      name: "User",
      username: "u",
      password: "p",
    });
    expect(createUser).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "update_user", user_id: 55, name: "User" });
    expect(updateUser).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "delete_user", user_id: 55 });
    expect(deleteUser).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "profiles" });
    expect(getProfiles).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "get_active_profile" });
    expect(getActiveProfile).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "set_active_profile", profile_id: 1 });
    expect(setActiveProfile).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "notifications" });
    expect(getNotifications).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "send_notification",
      type: "info",
      text: "x",
    });
    expect(sendNotification).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "alarms" });
    expect(getAlarms).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "arm_alarm", partition_id: 1 });
    expect(armAlarm).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "disarm_alarm", partition_id: 1 });
    expect(disarmAlarm).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "zwave_network" });
    expect(getZWaveNetwork).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "start_zwave_inclusion" });
    expect(startZWaveInclusion).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "stop_zwave_inclusion" });
    expect(stopZWaveInclusion).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "start_zwave_exclusion" });
    expect(startZWaveExclusion).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "stop_zwave_exclusion" });
    expect(stopZWaveExclusion).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "remove_failed_zwave_node", node_id: 1 });
    expect(removeFailedZWaveNode).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "heal_zwave_network" });
    expect(healZWaveNetwork).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "create_backup" });
    expect(createBackup).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "list_backups" });
    expect(getBackups).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "restore_backup", backup_id: "b" });
    expect(restoreBackup).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "get_settings" });
    expect(getSettings).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "update_settings", settings: { a: 1 } });
    expect(updateSettings).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "restart_system" });
    expect(restartSystem).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "get_event_log", from: 0, to: 1, limit: 1 });
    expect(getEventLog).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "geofences" });
    expect(getGeofences).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "create_geofence",
      name: "G",
      latitude: 1,
      longitude: 2,
      radius: 3,
    });
    expect(createGeofence).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "update_geofence",
      geofence_id: 1,
      name: "G",
    });
    expect(updateGeofence).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "delete_geofence", geofence_id: 1 });
    expect(deleteGeofence).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "plugins" });
    expect(getPlugins).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "install_plugin",
      url: "https://example.com/x",
    });
    expect(installPlugin).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "uninstall_plugin", plugin_id: "p" });
    expect(uninstallPlugin).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", { op: "restart_plugin", plugin_id: "p" });
    expect(restartPlugin).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "trigger_custom_event",
      event_name: "x",
      data: { a: 1 },
    });
    expect(triggerCustomEvent).toHaveBeenCalled();
    await handleToolCall(client, "fibaro_home", {
      op: "device_stats",
      device_id: 1,
      params: { x: 1 },
    });
    expect(getDeviceStats).toHaveBeenCalled();

    const unknown = await handleToolCall(client, "fibaro_home", { op: "nope" });
    expect((unknown.content[0] as any).text).toContain("unsupported op");
  });

  it("handleToolCall list_devices covers additional filter branches", async () => {
    const client = makeClient();

    const byRoom = await handleToolCall(client, "list_devices", { room_id: 10 });
    expect((byRoom.content[0] as any).text).toContain("Kitchen Lamp");
    expect((byRoom.content[0] as any).text).not.toContain("Bedroom Lamp");

    const bySection = await handleToolCall(client, "list_devices", { section_id: 100 });
    const bySectionText = (bySection.content[0] as any).text as string;
    expect(bySectionText).toContain("Kitchen Lamp");
    expect(bySectionText).toContain("Bedroom Lamp");

    const byType = await handleToolCall(client, "list_devices", { type: "t2" });
    expect((byType.content[0] as any).text).toContain("Bedroom Lamp");
    expect((byType.content[0] as any).text).not.toContain("Kitchen Lamp");

    const byBaseType = await handleToolCall(client, "list_devices", { base_type: "b" });
    expect((byBaseType.content[0] as any).text).toContain("Kitchen Lamp");
    expect((byBaseType.content[0] as any).text).not.toContain("Bedroom Lamp");

    const byInterface = await handleToolCall(client, "list_devices", { interface: "battery" });
    expect((byInterface.content[0] as any).text).toContain("Bedroom Lamp");
    expect((byInterface.content[0] as any).text).not.toContain("Kitchen Lamp");

    const byParent = await handleToolCall(client, "list_devices", { parent_id: 99 });
    expect((byParent.content[0] as any).text).toContain("Kitchen Lamp");
    expect((byParent.content[0] as any).text).not.toContain("Bedroom Lamp");

    const byEnabled = await handleToolCall(client, "list_devices", { enabled: false });
    expect((byEnabled.content[0] as any).text).toContain("Bedroom Lamp");
    expect((byEnabled.content[0] as any).text).not.toContain("Kitchen Lamp");

    const byVisible = await handleToolCall(client, "list_devices", { visible: true });
    const visibleText = (byVisible.content[0] as any).text as string;
    expect(visibleText).toContain("Kitchen Lamp");
    expect(visibleText).toContain("Bedroom Lamp");

    const byDead = await handleToolCall(client, "list_devices", { dead: true });
    expect((byDead.content[0] as any).text).toContain("Bedroom Lamp");
    expect((byDead.content[0] as any).text).not.toContain("Kitchen Lamp");

    const filteredProps = await handleToolCall(client, "list_devices", {
      properties: ["id", "name", "value"],
    });
    const parsed = JSON.parse((filteredProps.content[0] as any).text);
    expect(parsed[0]).toMatchObject({ id: 1, name: "Kitchen Lamp", value: 1 });
  });

  it("handleToolCall resolve_by_name errors on ambiguity for singular query", async () => {
    await expect(
      handleToolCall(makeClient(), "resolve_by_name", { query: "lamp", kind: "devices" }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidRequest });
  });

  it("handleToolCall resolve_by_name can force allow_multiple true/false via boolean arg (covers allow_multiple ternary boolean branch)", async () => {
    const client = makeClient();

    const multi = await handleToolCall(client, "resolve_by_name", {
      query: "lamp",
      kind: "devices",
      allow_multiple: true,
    });
    const multiParsed = JSON.parse((multi.content[0] as any).text);
    expect(multiParsed.allow_multiple).toBe(true);
    expect(multiParsed.devices.length).toBe(2);

    await expect(
      handleToolCall(client, "resolve_by_name", {
        query: "lamp",
        kind: "devices",
        allow_multiple: false,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidRequest });
  });

  it("handleToolCall resolve_by_name covers no-match and kind=all ambiguity branches when allow_multiple=false", async () => {
    const client = makeClient();

    await expect(
      handleToolCall(client, "resolve_by_name", {
        query: "nope",
        kind: "devices",
        allow_multiple: false,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidRequest });

    await expect(
      handleToolCall(client, "resolve_by_name", {
        query: "nope",
        kind: "rooms",
        allow_multiple: false,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidRequest });

    await expect(
      handleToolCall(client, "resolve_by_name", {
        query: "nope",
        kind: "all",
        allow_multiple: false,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidRequest });

    await expect(
      handleToolCall(client, "resolve_by_name", {
        query: "lamp",
        kind: "all",
        allow_multiple: false,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidRequest });
  });

  it("handleToolCall resolve_by_name errors on room ambiguity when allow_multiple=false and kind=rooms", async () => {
    const client = makeClient({
      getRooms: async () => [
        { id: 10, name: "Kitchen", sectionID: 100, visible: true, isDefault: false },
        { id: 11, name: "Kitchen 2", sectionID: 100, visible: true, isDefault: false },
      ],
    });

    await expect(
      handleToolCall(client, "resolve_by_name", {
        query: "kitchen",
        kind: "rooms",
        exact: false,
        allow_multiple: false,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidRequest });
  });

  it("handleToolCall resolve_by_name allows multiple for plural query", async () => {
    const out = await handleToolCall(makeClient(), "resolve_by_name", {
      query: "lamps",
      kind: "devices",
    });
    const parsed = JSON.parse((out.content[0] as any).text);
    expect(parsed.devices.length).toBe(2);
  });

  it("handleToolCall resolve_by_name returns single device for exact match", async () => {
    const out = await handleToolCall(makeClient(), "resolve_by_name", {
      query: "Kitchen Lamp",
      kind: "devices",
      exact: true,
      allow_multiple: false,
    });
    const parsed = JSON.parse((out.content[0] as any).text);
    expect(parsed.devices.length).toBe(1);
    expect(parsed.devices[0].name).toBe("Kitchen Lamp");
  });

  it("handleToolCall list_scenes filters by room_id", async () => {
    const client = makeClient();
    const out = await handleToolCall(client, "list_scenes", { room_id: 10 });
    const parsed = JSON.parse((out.content[0] as any).text);
    expect(parsed.length).toBe(1);
    expect(parsed[0].roomID).toBe(10);
  });

  it("handleToolCall first_run covers windows path + http default port selection", async () => {
    const out = await handleToolCall(makeClient(), "first_run", {
      os: "Windows",
      fibaro_https: false,
    });
    const text = (out.content[0] as any).text as string;
    expect(text).toContain("%USERPROFILE%\\fibaro-mcp.json");
    expect(text).toContain('"port": 80');
    expect(text).toContain('"https": false');
  });

  it("all tool definitions are callable with minimal schema-derived args", async () => {
    const tools = getTools().tools;
    const client = makeClient();

    expect(tools.length).toBeGreaterThan(0);

    for (const tool of tools) {
      let args = synthesizeArgFromSchema(tool.inputSchema);
      if (!args || typeof args !== "object") args = {};

      // Provide stable args for tools where generic synthesis would be ambiguous or cause intentional errors.
      if (tool.name === "resolve_by_name") {
        args = { query: "Kitchen Lamp", kind: "devices", exact: true, allow_multiple: false };
      }
      if (tool.name === "find_by_name") {
        args = { query: "Kitchen", kind: "rooms", exact: true, limit: 10 };
      }
      if (tool.name === "list_devices") {
        args = {};
      }
      if (tool.name === "control_device") {
        args = { device_id: 1, action: "turnOn", args: [] };
      }
      if (tool.name === "get_scene_lua") {
        args = { scene_id: 5 };
      }
      if (tool.name === "get_device_lua") {
        args = { device_id: 1 };
      }

      const out = await handleToolCall(client, tool.name, args);
      expect(out.content.length).toBeGreaterThan(0);
      expect((out.content[0] as any).type).toBe("text");
      expect(typeof (out.content[0] as any).text).toBe("string");
    }
  });

  it("handleToolCall errors on unknown tool", async () => {
    await expect(handleToolCall(makeClient(), "nope", {})).rejects.toBeInstanceOf(McpError);
  });

  it("smoke: newly migrated scene/user/system tools execute and return text", async () => {
    const client = makeClient();

    const out1 = await handleToolCall(client, "list_scenes", {});
    expect((out1.content[0] as any).text).toContain('"id"');

    const out2 = await handleToolCall(client, "get_scene", { scene_id: 5 });
    expect((out2.content[0] as any).text).toContain('"id"');

    const out3 = await handleToolCall(client, "create_room", { name: "R", section_id: 100 });
    expect((out3.content[0] as any).text).toContain("Room");

    const out4 = await handleToolCall(client, "list_profiles", {});
    expect((out4.content[0] as any).text).toContain("Home");

    const out5 = await handleToolCall(client, "get_settings", {});
    expect((out5.content[0] as any).text).toContain("ok");
  });
});
