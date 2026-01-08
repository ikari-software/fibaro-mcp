import { beforeEach, describe, expect, it, vi } from "vitest";
import nock from "nock";
import { FibaroClient } from "./fibaro-client.js";

function makeClient() {
  return new FibaroClient({
    host: "fibaro.test",
    username: "u",
    password: "p",
    https: false,
    port: 80,
  });
}

describe("FibaroClient caching", () => {
  beforeEach(() => {
    nock.cleanAll();
    process.env.FIBARO_CACHE_TTL_MS = "10000";
  });

  it("climate + system + panels endpoints", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/panels/heating")
      .once()
      .reply(200, [{ id: 1 }])
      .post("/api/panels/heating/1", { mode: "auto" })
      .once()
      .reply(200, {})
      .get("/api/settings/info")
      .once()
      .reply(200, { serial: "x" })
      .get("/api/panels/weather")
      .once()
      .reply(200, { temp: 10 })
      .get("/api/panels/energy")
      .once()
      .reply(200, { total: 1 });

    const client = makeClient();
    expect(await client.getClimateZones()).toEqual([{ id: 1 }]);
    await client.setClimateMode(1, "auto");
    expect(await client.getSystemInfo()).toEqual({ serial: "x" });
    expect(await client.getWeather()).toEqual({ temp: 10 });
    expect(await client.getEnergyPanel()).toEqual({ total: 1 });
    expect(scope.isDone()).toBe(true);
  });

  it("user fetch endpoints", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/users")
      .once()
      .reply(200, [{ id: 1 }])
      .get("/api/users/1")
      .once()
      .reply(200, { id: 1, name: "u" });

    const client = makeClient();
    expect(await client.getUsers()).toEqual([{ id: 1 }]);
    expect(await client.getUser(1)).toEqual({ id: 1, name: "u" });
    expect(scope.isDone()).toBe(true);
  });

  it("caches getDevices within TTL", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .reply(200, [
        { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
      ]);

    const client = makeClient();
    const a = await client.getDevices();
    const b = await client.getDevices();

    expect(a).toEqual(b);
    expect(scope.isDone()).toBe(true);
  });

  it("invalidates rooms/devices list after room create/update/delete", async () => {
    const rooms1 = [{ id: 1, name: "R1", sectionID: 10, visible: true, isDefault: false }];
    const rooms2 = [{ id: 1, name: "R1b", sectionID: 10, visible: true, isDefault: false }];
    const rooms3: any[] = [];
    const devices1 = [
      { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];
    const devices2 = [
      { id: 1, name: "D1b", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];
    const devices3: any[] = [];

    const scope = nock("http://fibaro.test:80")
      .get("/api/rooms")
      .once()
      .reply(200, rooms1)
      .get("/api/devices")
      .once()
      .reply(200, devices1)
      .post("/api/rooms", { name: "R2", sectionID: 10 })
      .once()
      .reply(200, { id: 2, name: "R2", sectionID: 10, visible: true, isDefault: false })
      .get("/api/rooms")
      .once()
      .reply(200, rooms2)
      .get("/api/devices")
      .once()
      .reply(200, devices2)
      .put("/api/rooms/1", { name: "R1b" })
      .once()
      .reply(200, rooms2[0])
      .get("/api/rooms")
      .once()
      .reply(200, rooms2)
      .delete("/api/rooms/1")
      .once()
      .reply(200, {})
      .get("/api/rooms")
      .once()
      .reply(200, rooms3)
      .get("/api/devices")
      .once()
      .reply(200, devices3);

    const client = makeClient();
    expect(await client.getRooms()).toEqual(rooms1);
    expect(await client.getDevices()).toEqual(devices1);

    await client.createRoom({ name: "R2", sectionID: 10 });
    expect(await client.getRooms()).toEqual(rooms2);
    expect(await client.getDevices()).toEqual(devices2);

    await client.updateRoom(1, { name: "R1b" });
    expect(await client.getRooms()).toEqual(rooms2);

    await client.deleteRoom(1);
    expect(await client.getRooms()).toEqual(rooms3);
    expect(await client.getDevices()).toEqual(devices3);
    expect(scope.isDone()).toBe(true);
  });

  it("invalidates sections/rooms/devices list after section create/delete", async () => {
    const sections1 = [{ id: 10, name: "S1" }];
    const sections2 = [
      { id: 10, name: "S1" },
      { id: 11, name: "S2" },
    ];
    const sections3 = [{ id: 10, name: "S1" }];
    const rooms1 = [{ id: 1, name: "R1", sectionID: 10, visible: true, isDefault: false }];
    const rooms2 = [{ id: 1, name: "R1", sectionID: 10, visible: true, isDefault: false }];
    const devices1 = [
      { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];
    const devices2 = [
      { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];

    const scope = nock("http://fibaro.test:80")
      .get("/api/sections")
      .once()
      .reply(200, sections1)
      .get("/api/rooms")
      .once()
      .reply(200, rooms1)
      .get("/api/devices")
      .once()
      .reply(200, devices1)
      .post("/api/sections", { name: "S2" })
      .once()
      .reply(200, { id: 11, name: "S2" })
      .get("/api/sections")
      .once()
      .reply(200, sections2)
      .get("/api/rooms")
      .once()
      .reply(200, rooms2)
      .get("/api/devices")
      .once()
      .reply(200, devices2)
      .delete("/api/sections/11")
      .once()
      .reply(200, {})
      .get("/api/sections")
      .once()
      .reply(200, sections3);

    const client = makeClient();
    expect(await client.getSections()).toEqual(sections1);
    expect(await client.getRooms()).toEqual(rooms1);
    expect(await client.getDevices()).toEqual(devices1);

    await client.createSection({ name: "S2" });
    expect(await client.getSections()).toEqual(sections2);
    expect(await client.getRooms()).toEqual(rooms2);
    expect(await client.getDevices()).toEqual(devices2);

    await client.deleteSection(11);
    expect(await client.getSections()).toEqual(sections3);
    expect(scope.isDone()).toBe(true);
  });

  it("refetches at exact TTL boundary (expiresAt == now)", async () => {
    vi.useFakeTimers();
    process.env.FIBARO_CACHE_TTL_MS = "50";

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .twice()
      .reply(200, [
        { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
      ]);

    const client = makeClient();
    await client.getDevices();
    vi.advanceTimersByTime(50);
    await client.getDevices();

    expect(scope.isDone()).toBe(true);
    vi.useRealTimers();
  });

  it("clears in-flight cache entry on failure and allows retry", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .delay(10)
      .reply(500, { error: "nope" })
      .get("/api/devices")
      .once()
      .reply(200, [
        { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
      ]);

    const client = makeClient();

    const p1 = client.getDevices();
    const p2 = client.getDevices();
    const results = await Promise.allSettled([p1, p2]);
    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("rejected");

    // Retry after failure should trigger a new HTTP call.
    const ok = await client.getDevices();
    expect(ok[0].name).toBe("D1");
    expect(scope.isDone()).toBe(true);
  });

  it("deduplicates in-flight getDevices calls", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .delay(10)
      .reply(200, [
        { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
      ]);

    const client = makeClient();

    const p1 = client.getDevices();
    const p2 = client.getDevices();
    const [a, b] = await Promise.all([p1, p2]);

    expect(a).toEqual(b);
    expect(scope.isDone()).toBe(true);
  });

  it("expires cache after TTL", async () => {
    vi.useFakeTimers();
    process.env.FIBARO_CACHE_TTL_MS = "50";

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .twice()
      .reply(200, [
        { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
      ]);

    const client = makeClient();

    await client.getDevices();
    vi.advanceTimersByTime(100);
    await client.getDevices();

    expect(scope.isDone()).toBe(true);
    vi.useRealTimers();
  });

  it("invalidates devices list after callAction", async () => {
    const devices1 = [
      { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];
    const devices2 = [
      { id: 1, name: "D1b", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .reply(200, devices1)
      .post("/api/devices/1/action/turnOn", { args: [] })
      .once()
      .reply(200, { ok: true })
      .get("/api/devices")
      .once()
      .reply(200, devices2);

    const client = makeClient();
    expect(await client.getDevices()).toEqual(devices1);

    await client.callAction(1, "turnOn");
    expect(await client.getDevices()).toEqual(devices2);

    expect(scope.isDone()).toBe(true);
  });

  it("caches rooms and sections within TTL", async () => {
    const roomsScope = nock("http://fibaro.test:80")
      .get("/api/rooms")
      .once()
      .reply(200, [{ id: 1, name: "Kitchen", sectionID: 10, visible: true, isDefault: false }]);
    const sectionsScope = nock("http://fibaro.test:80")
      .get("/api/sections")
      .once()
      .reply(200, [{ id: 10, name: "Downstairs" }]);

    const client = makeClient();
    const r1 = await client.getRooms();
    const r2 = await client.getRooms();
    const s1 = await client.getSections();
    const s2 = await client.getSections();

    expect(r1).toEqual(r2);
    expect(s1).toEqual(s2);
    expect(roomsScope.isDone()).toBe(true);
    expect(sectionsScope.isDone()).toBe(true);
  });

  it("disables caching when FIBARO_CACHE_TTL_MS <= 0", async () => {
    process.env.FIBARO_CACHE_TTL_MS = "0";

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .twice()
      .reply(200, [
        { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
      ]);

    const client = makeClient();
    await client.getDevices();
    await client.getDevices();
    expect(scope.isDone()).toBe(true);
  });

  it("invalidates devices list after setDeviceProperty", async () => {
    const devices1 = [
      { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];
    const devices2 = [
      { id: 1, name: "D1c", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .reply(200, devices1)
      .put("/api/devices/1/properties/value", { value: 1 })
      .once()
      .reply(200, {})
      .get("/api/devices")
      .once()
      .reply(200, devices2);

    const client = makeClient();
    expect(await client.getDevices()).toEqual(devices1);
    await client.setDeviceProperty(1, "value", 1);
    expect(await client.getDevices()).toEqual(devices2);
    expect(scope.isDone()).toBe(true);
  });

  it("invalidates rooms list after createRoom", async () => {
    const rooms1 = [{ id: 1, name: "Kitchen", sectionID: 10, visible: true, isDefault: false }];
    const rooms2 = [
      { id: 1, name: "Kitchen", sectionID: 10, visible: true, isDefault: false },
      { id: 2, name: "Office", sectionID: 10, visible: true, isDefault: false },
    ];

    const scope = nock("http://fibaro.test:80")
      .get("/api/rooms")
      .once()
      .reply(200, rooms1)
      .post("/api/rooms", { name: "Office", sectionID: 10 })
      .once()
      .reply(200, { id: 2, name: "Office", sectionID: 10, visible: true, isDefault: false })
      .get("/api/rooms")
      .once()
      .reply(200, rooms2);

    const client = makeClient();
    expect(await client.getRooms()).toEqual(rooms1);
    await client.createRoom({ name: "Office", sectionID: 10 });
    expect(await client.getRooms()).toEqual(rooms2);
    expect(scope.isDone()).toBe(true);
  });

  it("invalidates sections/rooms cache after updateSection", async () => {
    const sections1 = [{ id: 10, name: "Downstairs" }];
    const sections2 = [{ id: 10, name: "Ground Floor" }];
    const rooms1 = [{ id: 1, name: "Kitchen", sectionID: 10, visible: true, isDefault: false }];

    const scope = nock("http://fibaro.test:80")
      .get("/api/sections")
      .once()
      .reply(200, sections1)
      .get("/api/rooms")
      .once()
      .reply(200, rooms1)
      .put("/api/sections/10", { name: "Ground Floor" })
      .once()
      .reply(200, { id: 10, name: "Ground Floor" })
      .get("/api/sections")
      .once()
      .reply(200, sections2)
      .get("/api/rooms")
      .once()
      .reply(200, rooms1);

    const client = makeClient();
    expect(await client.getSections()).toEqual(sections1);
    expect(await client.getRooms()).toEqual(rooms1);
    await client.updateSection(10, { name: "Ground Floor" });
    expect(await client.getSections()).toEqual(sections2);
    expect(await client.getRooms()).toEqual(rooms1);
    expect(scope.isDone()).toBe(true);
  });

  it("Z-Wave network operations", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/zwave/network")
      .once()
      .reply(200, { ok: true })
      .post("/api/zwave/inclusion/start")
      .once()
      .reply(200, {})
      .post("/api/zwave/inclusion/stop")
      .once()
      .reply(200, {})
      .post("/api/zwave/exclusion/start")
      .once()
      .reply(200, {})
      .post("/api/zwave/exclusion/stop")
      .once()
      .reply(200, {})
      .delete("/api/zwave/network/nodes/10")
      .once()
      .reply(200, {})
      .post("/api/zwave/network/heal")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getZWaveNetwork()).toEqual({ ok: true });
    await client.startZWaveInclusion();
    await client.stopZWaveInclusion();
    await client.startZWaveExclusion();
    await client.stopZWaveExclusion();
    await client.removeFailedZWaveNode(10);
    await client.healZWaveNetwork();
    expect(scope.isDone()).toBe(true);
  });

  it("backup lifecycle", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/backup")
      .once()
      .reply(200, { id: "b1" })
      .get("/api/backup")
      .once()
      .reply(200, [{ id: "b1" }])
      .post("/api/backup/b1/restore")
      .once()
      .reply(200, {})
      .get("/api/backup/b1/download")
      .once()
      .reply(200, "blobdata");

    const client = makeClient();
    expect(await client.createBackup()).toEqual({ id: "b1" });
    expect(await client.getBackups()).toEqual([{ id: "b1" }]);
    await client.restoreBackup("b1");
    expect(await client.downloadBackup("b1")).toEqual("blobdata");
    expect(scope.isDone()).toBe(true);
  });

  it("system settings and reboot", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/settings")
      .once()
      .reply(200, { name: "hc" })
      .put("/api/settings", { foo: "bar" })
      .once()
      .reply(200, {})
      .post("/api/settings/reboot")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getSettings()).toEqual({ name: "hc" });
    await client.updateSettings({ foo: "bar" });
    await client.restartSystem();
    expect(scope.isDone()).toBe(true);
  });

  it("network settings", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/settings/network")
      .once()
      .reply(200, { ip: "1.2.3.4" })
      .put("/api/settings/network", { dhcp: true })
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getNetworkSettings()).toEqual({ ip: "1.2.3.4" });
    await client.updateNetworkSettings({ dhcp: true });
    expect(scope.isDone()).toBe(true);
  });

  it("plugins install/uninstall/restart", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/plugins")
      .once()
      .reply(200, [{ id: "p1" }])
      .post("/api/plugins", { url: "http://example/plugin.fpl" })
      .once()
      .reply(200, {})
      .post("/api/plugins/p1/restart")
      .once()
      .reply(200, {})
      .delete("/api/plugins/p1")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getPlugins()).toEqual([{ id: "p1" }]);
    await client.installPlugin("http://example/plugin.fpl");
    await client.restartPlugin("p1");
    await client.uninstallPlugin("p1");
    expect(scope.isDone()).toBe(true);
  });

  it("quick app write APIs", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/devices", {
        name: "QA",
        type: "com.fibaro.QuickApp",
        roomID: 1,
        properties: {
          code: "print(1)",
        },
      })
      .once()
      .reply(200, { id: 200, name: "QA" })
      .put("/api/devices/200", {
        properties: {
          code: "print(2)",
        },
      })
      .once()
      .reply(200, {})
      .put("/api/devices/200", {
        properties: {
          quickAppVariables: [{ name: "x", value: 1 }],
        },
      })
      .once()
      .reply(200, {});

    const client = makeClient();
    const created = await client.createQuickApp({
      name: "QA",
      type: "com.fibaro.QuickApp",
      roomID: 1,
      code: "print(1)",
    });
    expect(created).toEqual({ id: 200, name: "QA" });

    await client.updateQuickAppCode(200, "print(2)");
    await client.updateQuickAppVariables(200, [{ name: "x", value: 1 }]);
    expect(scope.isDone()).toBe(true);
  });

  it("user CRUD", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/users", { name: "N", username: "u", password: "p", email: "e@example.com" })
      .once()
      .reply(200, { id: 10, name: "N" })
      .put("/api/users/10", { email: "n@example.com" })
      .once()
      .reply(200, { id: 10, email: "n@example.com" })
      .delete("/api/users/10")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(
      await client.createUser({
        name: "N",
        username: "u",
        password: "p",
        email: "e@example.com",
      }),
    ).toEqual({ id: 10, name: "N" });

    expect(await client.updateUser(10, { email: "n@example.com" })).toEqual({
      id: 10,
      email: "n@example.com",
    });
    await client.deleteUser(10);
    expect(scope.isDone()).toBe(true);
  });

  it("event log and custom events", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/callLog")
      .query({ from: 1, to: 2, type: "t", limit: 3 })
      .once()
      .reply(200, [{ id: 1 }])
      .post("/api/customEvents", { name: "evt", data: { ok: true } })
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getEventLog({ from: 1, to: 2, type: "t", limit: 3 })).toEqual([{ id: 1 }]);
    await client.triggerCustomEvent("evt", { ok: true });
    expect(scope.isDone()).toBe(true);
  });

  it("geofence CRUD", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/geofences")
      .once()
      .reply(200, [{ id: 1, name: "G" }])
      .post("/api/geofences", { name: "G2", latitude: 1, longitude: 2, radius: 3 })
      .once()
      .reply(200, { id: 2, name: "G2" })
      .put("/api/geofences/2", { name: "G3" })
      .once()
      .reply(200, { id: 2, name: "G3" })
      .delete("/api/geofences/2")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getGeofences()).toEqual([{ id: 1, name: "G" }]);
    expect(
      await client.createGeofence({ name: "G2", latitude: 1, longitude: 2, radius: 3 }),
    ).toEqual({ id: 2, name: "G2" });
    expect(await client.updateGeofence(2, { name: "G3" })).toEqual({ id: 2, name: "G3" });
    await client.deleteGeofence(2);
    expect(scope.isDone()).toBe(true);
  });

  it("icons CRUD", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/icons")
      .once()
      .reply(200, [{ id: "i1" }])
      .post("/api/icons", { name: "icon" })
      .once()
      .reply(200, { id: "i2" })
      .delete("/api/icons/i2")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getIcons()).toEqual([{ id: "i1" }]);
    expect(await client.uploadIcon({ name: "icon" })).toEqual({ id: "i2" });
    await client.deleteIcon("i2");
    expect(scope.isDone()).toBe(true);
  });

  it("device pairing start/stop", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/devices/pair", { protocol: "zwave" })
      .once()
      .reply(200, {})
      .post("/api/devices/pair", { protocol: "zigbee" })
      .once()
      .reply(200, {})
      .post("/api/devices/pair/stop")
      .once()
      .reply(200, {});

    const client = makeClient();
    await client.startDevicePairing();
    await client.startDevicePairing("zigbee");
    await client.stopDevicePairing();
    expect(scope.isDone()).toBe(true);
  });

  it("refreshStates", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/refreshStates")
      .once()
      .reply(200, { ok: true });

    const client = makeClient();
    expect(await client.refreshStates()).toEqual({ ok: true });
    expect(scope.isDone()).toBe(true);
  });

  it("getRoom and getSection", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/rooms/1")
      .once()
      .reply(200, { id: 1, name: "R", sectionID: 10, visible: true, isDefault: false })
      .get("/api/sections/10")
      .once()
      .reply(200, { id: 10, name: "S" });

    const client = makeClient();
    expect(await client.getRoom(1)).toEqual({
      id: 1,
      name: "R",
      sectionID: 10,
      visible: true,
      isDefault: false,
    });
    expect(await client.getSection(10)).toEqual({ id: 10, name: "S" });
    expect(scope.isDone()).toBe(true);
  });

  it("getDeviceStats with params", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/devices/1/stats")
      .query({ from: 1, to: 2, property: "power" })
      .once()
      .reply(200, { ok: true });

    const client = makeClient();
    expect(await client.getDeviceStats(1, { from: 1, to: 2, property: "power" })).toEqual({
      ok: true,
    });
    expect(scope.isDone()).toBe(true);
  });

  it("setHeatingMode delegates to callAction", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/devices/1/action/setMode", { args: ["auto"] })
      .once()
      .reply(200, { ok: true });

    const client = makeClient();
    await client.setHeatingMode(1, "auto");
    expect(scope.isDone()).toBe(true);
  });
});

describe("FibaroClient API methods", () => {
  beforeEach(() => {
    nock.cleanAll();
    process.env.FIBARO_CACHE_TTL_MS = "10000";
  });

  it("gets device details", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/devices/7")
      .once()
      .reply(200, { id: 7, name: "D7" });

    const client = makeClient();
    const res = await client.getDevice(7);
    expect(res).toEqual({ id: 7, name: "D7" });
    expect(scope.isDone()).toBe(true);
  });

  it("gets and updates device config and invalidates devices cache", async () => {
    const devices1 = [
      { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];
    const devices2 = [
      { id: 1, name: "D1b", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .reply(200, devices1)
      .get("/api/devices/1/properties")
      .once()
      .reply(200, { foo: "bar" })
      .put("/api/devices/1", { properties: { foo: "baz" } })
      .once()
      .reply(200, {})
      .get("/api/devices")
      .once()
      .reply(200, devices2);

    const client = makeClient();
    expect(await client.getDevices()).toEqual(devices1);
    expect(await client.getDeviceConfig(1)).toEqual({ foo: "bar" });
    await client.updateDeviceConfig(1, { foo: "baz" });
    expect(await client.getDevices()).toEqual(devices2);
    expect(scope.isDone()).toBe(true);
  });

  it("gets device actions", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/devices/9/actions")
      .once()
      .reply(200, { turnOn: 0 });

    const client = makeClient();
    expect(await client.getDeviceActions(9)).toEqual({ turnOn: 0 });
    expect(scope.isDone()).toBe(true);
  });

  it("deletes device and invalidates devices cache", async () => {
    const devices1 = [
      { id: 1, name: "D1", roomID: 1, type: "t", baseType: "b", enabled: true, visible: true },
    ];
    const devices2: any[] = [];

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .reply(200, devices1)
      .delete("/api/devices/1")
      .once()
      .reply(200, {})
      .get("/api/devices")
      .once()
      .reply(200, devices2);

    const client = makeClient();
    expect(await client.getDevices()).toEqual(devices1);
    await client.deleteDevice(1);
    expect(await client.getDevices()).toEqual(devices2);
    expect(scope.isDone()).toBe(true);
  });

  it("light control methods - turnOn, turnOff, setBrightness, setColor", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/devices/1/action/turnOn", { args: [] })
      .once()
      .reply(200, {})
      .post("/api/devices/1/action/turnOff", { args: [] })
      .once()
      .reply(200, {})
      .post("/api/devices/1/action/setValue", { args: [50] })
      .once()
      .reply(200, {})
      .post("/api/devices/1/action/setColor", { args: [255, 128, 64, 32] })
      .once()
      .reply(200, {});

    const client = makeClient();
    await client.turnOn(1);
    await client.turnOff(1);
    await client.setBrightness(1, 50);
    await client.setColor(1, 255, 128, 64, 32);
    expect(scope.isDone()).toBe(true);
  });

  it("scene lifecycle and actions", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/scenes", {
        name: "S1",
        roomID: 10,
        type: "com.fibaro.luaScene",
        isLua: true,
        lua: 'print("hi")',
      })
      .once()
      .reply(200, {
        id: 1,
        name: "S1",
        roomID: 10,
        type: "com.fibaro.luaScene",
        isLua: true,
        visible: true,
        lua: 'print("hi")',
      })
      .put("/api/scenes/1", { name: "S2" })
      .once()
      .reply(200, { id: 1, name: "S2" })
      .post("/api/scenes/1/action/start")
      .once()
      .reply(200, {})
      .post("/api/scenes/1/action/stop")
      .once()
      .reply(200, {})
      .delete("/api/scenes/1")
      .once()
      .reply(200, {});

    const client = makeClient();
    const created = await client.createScene({ name: "S1", roomID: 10, lua: 'print("hi")' });
    expect(created.id).toBe(1);
    const updated = await client.updateScene(1, { name: "S2" });
    expect(updated).toEqual({ id: 1, name: "S2" });
    await client.runScene(1);
    await client.stopScene(1);
    await client.deleteScene(1);
    expect(scope.isDone()).toBe(true);
  });

  it("createScene defaults and getSceneLua fallback", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/scenes", {
        name: "S1",
        roomID: 10,
        type: "com.fibaro.luaScene",
        isLua: true,
        lua: "",
      })
      .once()
      .reply(200, {
        id: 2,
        name: "S1",
        roomID: 10,
        type: "com.fibaro.luaScene",
        isLua: true,
        visible: true,
      })
      .get("/api/scenes/2")
      .once()
      .reply(200, {
        id: 2,
        name: "S1",
        roomID: 10,
        type: "com.fibaro.luaScene",
        isLua: true,
        visible: true,
      });

    const client = makeClient();
    const created = await client.createScene({ name: "S1", roomID: 10 });
    expect(created.id).toBe(2);
    expect(await client.getSceneLua(2)).toBe("");
    expect(scope.isDone()).toBe(true);
  });

  it("setTemperature delegates to callAction", async () => {
    const scope = nock("http://fibaro.test:80")
      .post("/api/devices/1/action/setTargetLevel", { args: [21] })
      .once()
      .reply(200, { ok: true });

    const client = makeClient();
    await client.setTemperature(1, 21);
    expect(scope.isDone()).toBe(true);
  });

  it("getQuickApp fetches device by id", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/devices/9")
      .once()
      .reply(200, { id: 9, name: "QA" });

    const client = makeClient();
    expect(await client.getQuickApp(9)).toEqual({ id: 9, name: "QA" });
    expect(scope.isDone()).toBe(true);
  });

  it("global variables CRUD", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/globalVariables")
      .once()
      .reply(200, [{ name: "x", value: "1" }])
      .get("/api/globalVariables/x")
      .once()
      .reply(200, { name: "x", value: "1" })
      .put("/api/globalVariables/x", { value: "2" })
      .once()
      .reply(200, {})
      .post("/api/globalVariables", { name: "y", value: "9" })
      .once()
      .reply(200, { name: "y", value: "9" })
      .delete("/api/globalVariables/y")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getGlobalVariables()).toEqual([{ name: "x", value: "1" }]);
    expect(await client.getGlobalVariable("x")).toEqual({ name: "x", value: "1" });
    await client.setGlobalVariable("x", "2");
    expect(await client.createGlobalVariable({ name: "y", value: "9" })).toEqual({
      name: "y",
      value: "9",
    });
    await client.deleteGlobalVariable("y");
    expect(scope.isDone()).toBe(true);
  });

  it("profiles and notifications", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/profiles")
      .once()
      .reply(200, [{ id: 1, name: "Home" }])
      .get("/api/profiles/active")
      .once()
      .reply(200, { id: 1, name: "Home" })
      .post("/api/profiles/1/activate")
      .once()
      .reply(200, {})
      .get("/api/notificationCenter")
      .once()
      .reply(200, [{ id: 9, text: "N" }])
      .post("/api/notificationCenter", { type: "info", text: "Hello", users: [1] })
      .once()
      .reply(200, {})
      .delete("/api/notificationCenter/9")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getProfiles()).toEqual([{ id: 1, name: "Home" }]);
    expect(await client.getActiveProfile()).toEqual({ id: 1, name: "Home" });
    await client.setActiveProfile(1);
    expect(await client.getNotifications()).toEqual([{ id: 9, text: "N" }]);
    await client.sendNotification({ type: "info", text: "Hello", users: [1] });
    await client.deleteNotification(9);
    expect(scope.isDone()).toBe(true);
  });

  it("alarms arm/disarm", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/alarms/v1/partitions")
      .once()
      .reply(200, [{ id: 1 }])
      .post("/api/alarms/v1/partitions/1/actions/arm")
      .once()
      .reply(200, {})
      .post("/api/alarms/v1/partitions/1/actions/disarm")
      .once()
      .reply(200, {});

    const client = makeClient();
    expect(await client.getAlarms()).toEqual([{ id: 1 }]);
    await client.armAlarm(1);
    await client.disarmAlarm(1);
    expect(scope.isDone()).toBe(true);
  });

  it("gets scenes", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/scenes")
      .once()
      .reply(200, [{ id: 1, name: "S", roomID: 10 }]);

    const client = makeClient();
    expect(await client.getScenes()).toEqual([{ id: 1, name: "S", roomID: 10 }]);
    expect(scope.isDone()).toBe(true);
  });

  it("gets climate zones", async () => {
    const scope = nock("http://fibaro.test:80")
      .get("/api/panels/heating")
      .once()
      .reply(200, [{ id: 1, mode: "auto" }]);

    const client = makeClient();
    expect(await client.getClimateZones()).toEqual([{ id: 1, mode: "auto" }]);
    expect(scope.isDone()).toBe(true);
  });

  it("quick app helpers filter devices and fetch lua payload", async () => {
    process.env.FIBARO_CACHE_TTL_MS = "0";

    const scope = nock("http://fibaro.test:80")
      .get("/api/devices")
      .once()
      .reply(200, [
        {
          id: 1,
          type: "com.fibaro.binarySwitch",
          name: "S",
          roomID: 1,
          baseType: "b",
          enabled: true,
          visible: true,
        },
        {
          id: 2,
          type: "com.fibaro.QuickApp",
          name: "QA",
          roomID: 1,
          baseType: "b",
          enabled: true,
          visible: true,
        },
      ])
      .get("/api/devices/2")
      .once()
      .reply(200, {
        id: 2,
        name: "QA",
        properties: { code: "print(1)", quickAppVariables: [{ name: "x", value: 1 }] },
      });

    const client = makeClient();
    const qas = await client.getQuickApps();
    expect(qas.map((d: any) => d.id)).toEqual([2]);

    const lua = await client.getDeviceLua(2);
    expect(lua.code).toContain("print");
    expect(lua.quickAppVariables.length).toBe(1);
    expect(scope.isDone()).toBe(true);
  });
});
