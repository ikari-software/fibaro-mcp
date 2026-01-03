import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getResources, getTools, handleResourceRead, handleToolCall } from './mcp-handlers.js';

function synthesizeArgFromSchema(schema: any): any {
    if (!schema) return undefined;
    if (schema.const !== undefined) return schema.const;
    if (schema.default !== undefined) return schema.default;

    const t = schema.type;
    if (t === 'number' || t === 'integer') return 1;
    if (t === 'string') return 'x';
    if (t === 'boolean') return true;
    if (t === 'array') {
        const item = schema.items ? synthesizeArgFromSchema(schema.items) : undefined;
        return item === undefined ? [] : [item];
    }
    if (t === 'object') {
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
        return synthesizeArgFromSchema({ type: 'object', properties: schema.properties, required: schema.required });
    }
    return undefined;
}

function makeClient(overrides: Partial<any> = {}) {
    return {
        getDevices: async () => [
            {
                id: 1,
                name: 'Kitchen Lamp',
                roomID: 10,
                type: 't',
                baseType: 'b',
                enabled: true,
                visible: true,
                interfaces: ['power'],
                parentId: 99,
                dead: false,
                properties: { value: 1 },
            },
            {
                id: 2,
                name: 'Bedroom Lamp',
                roomID: 11,
                type: 't2',
                baseType: 'b2',
                enabled: false,
                visible: true,
                interfaces: ['battery'],
                parentId: 100,
                dead: true,
                properties: { value: 2 },
            },
        ],
        getDevice: async (id: number) => ({ id, name: `Device ${id}` }),
        callAction: async () => ({ ok: true }),
        turnOn: async () => { },
        turnOff: async () => { },
        setBrightness: async () => { },
        setColor: async () => { },
        setTemperature: async () => { },
        getRooms: async () => [
            { id: 10, name: 'Kitchen', sectionID: 100, visible: true, isDefault: false },
            { id: 11, name: 'Bedroom', sectionID: 100, visible: true, isDefault: false },
        ],
        getSections: async () => [{ id: 100, name: 'Home' }],
        getScenes: async () => [{ id: 5, name: 'S', roomID: 10 }],
        getScene: async (id: number) => ({ id, name: 'S', roomID: 10 }),
        runScene: async () => { },
        stopScene: async () => { },
        getGlobalVariables: async () => [],
        getGlobalVariable: async () => ({ name: 'x', value: 'y' }),
        setGlobalVariable: async () => { },
        getSystemInfo: async () => ({ ok: true }),
        getWeather: async () => ({ ok: true }),
        getEnergyPanel: async () => ({ ok: true }),
        getSceneLua: async () => '',
        getQuickApps: async () => [],
        getDeviceLua: async () => ({ device: { id: 1, name: 'QA' }, code: '', quickAppVariables: [] }),
        createScene: async () => ({ id: 9, name: 'N' }),
        updateScene: async () => ({ id: 9, name: 'N' }),
        deleteScene: async () => { },
        createQuickApp: async () => ({ id: 8, name: 'QA' }),
        updateQuickAppCode: async () => { },
        updateQuickAppVariables: async () => { },
        deleteQuickApp: async () => { },
        deleteDevice: async () => { },
        createRoom: async () => ({ id: 12, name: 'New Room' }),
        updateRoom: async (id: number) => ({ id, name: 'Updated Room' }),
        deleteRoom: async () => { },
        createSection: async () => ({ id: 101, name: 'New Section' }),
        updateSection: async (id: number) => ({ id, name: 'Updated Section' }),
        deleteSection: async () => { },
        getPanels: async () => ({}),
        getClimateZones: async () => [],
        setClimateMode: async () => { },
        getUsers: async () => [],
        getUser: async () => ({}),
        getUserSettings: async () => ({}),
        getSystemSettings: async () => ({}),
        createUser: async () => ({ id: 55, name: 'User' }),
        updateUser: async () => ({}),
        deleteUser: async () => { },
        getProfiles: async () => [{ id: 1, name: 'Home' }],
        getActiveProfile: async () => ({ id: 1, name: 'Home' }),
        setActiveProfile: async () => { },
        getNotifications: async () => [{ id: 1, text: 'N' }],
        sendNotification: async () => ({}),
        getAlarms: async () => ({}),
        getAlarmPartitions: async () => ({}),
        getAlarmDevices: async () => ({}),
        armAlarm: async () => { },
        disarmAlarm: async () => { },
        getLastEvents: async () => ({}),
        getHistory: async () => ({}),
        getDeviceStats: async () => ({}),
        createGlobalVariable: async () => ({ name: 'x' }),
        deleteGlobalVariable: async () => { },
        createBackup: async () => ({ id: 'b' }),
        getBackups: async () => [{ id: 'b' }],
        restoreBackup: async () => { },
        getSettings: async () => ({ ok: true }),
        updateSettings: async () => { },
        restartSystem: async () => { },
        getEventLog: async () => [{ id: 1 }],
        getGeofences: async () => [{ id: 1, name: 'G' }],
        createGeofence: async () => ({ id: 1, name: 'G' }),
        updateGeofence: async () => ({}),
        deleteGeofence: async () => { },
        getPlugins: async () => [{ id: 'p' }],
        installPlugin: async () => ({}),
        uninstallPlugin: async () => ({}),
        restartPlugin: async () => ({}),
        triggerCustomEvent: async () => ({}),
        getZWaveNetwork: async () => ({ ok: true }),
        startZWaveInclusion: async () => { },
        stopZWaveInclusion: async () => { },
        startZWaveExclusion: async () => { },
        stopZWaveExclusion: async () => { },
        removeFailedZWaveNode: async () => { },
        healZWaveNetwork: async () => { },
        ...overrides,
    };
}

describe('mcp-handlers', () => {
    const prevEnvToolset = process.env.FIBARO_TOOLSET;

    afterEach(() => {
        process.env.FIBARO_TOOLSET = prevEnvToolset;
        vi.restoreAllMocks();
    });

    it('getTools returns a tools list containing find_by_name and resolve_by_name', () => {
        const res = getTools();
        expect(res.tools.some((t) => t.name === 'find_by_name')).toBe(true);
        expect(res.tools.some((t) => t.name === 'resolve_by_name')).toBe(true);
    });

    it('getTools respects FIBARO_TOOLSET=legacy and does not include intent tools', () => {
        process.env.FIBARO_TOOLSET = 'legacy';
        const res = getTools();
        expect(res.tools.some((t) => t.name === 'list_devices')).toBe(true);
        expect(res.tools.some((t) => t.name === 'fibaro_device')).toBe(false);
    });

    it('getTools respects FIBARO_TOOLSET=both and includes both intent and legacy tools', () => {
        process.env.FIBARO_TOOLSET = 'both';
        const res = getTools();
        expect(res.tools.some((t) => t.name === 'list_devices')).toBe(true);
        expect(res.tools.some((t) => t.name === 'fibaro_device')).toBe(true);
        expect(res.tools.some((t) => t.name === 'find_by_name')).toBe(true);
        expect(res.tools.some((t) => t.name === 'resolve_by_name')).toBe(true);
    });

    it('getResources includes fibaro://devices', () => {
        const res = getResources();
        expect(res.resources.some((r) => r.uri === 'fibaro://devices')).toBe(true);
    });

    it('handleResourceRead returns JSON text for known resource', async () => {
        const out = await handleResourceRead(makeClient(), 'fibaro://devices');
        expect(out.contents[0].mimeType).toBe('application/json');
        const text = (out.contents[0] as any).text as string;
        expect(text).toContain('Kitchen Lamp');
    });

    it('handleResourceRead supports all known resource uris', async () => {
        const client = makeClient();
        const resources = getResources().resources;
        expect(resources.length).toBeGreaterThan(0);

        for (const r of resources) {
            const out = await handleResourceRead(client, r.uri);
            expect(out.contents[0].mimeType).toBe('application/json');
            expect(typeof (out.contents[0] as any).text).toBe('string');
        }
    });

    it('handleResourceRead throws on unknown resource', async () => {
        await expect(handleResourceRead(makeClient(), 'fibaro://nope')).rejects.toBeInstanceOf(McpError);
    });

    it('handleToolCall list_devices filters by name', async () => {
        const out = await handleToolCall(makeClient(), 'list_devices', { name: 'kitchen' });
        const text = (out.content[0] as any).text as string;
        expect(text).toContain('Kitchen Lamp');
        expect(text).not.toContain('Bedroom Lamp');
    });

    it('intent routing: fibaro_device supports common ops', async () => {
        const turnOn = vi.fn(async () => { });
        const turnOff = vi.fn(async () => { });
        const callAction = vi.fn(async () => ({ ok: true }));
        const setBrightness = vi.fn(async () => { });
        const client = makeClient({ turnOn, turnOff, callAction, setBrightness });

        await handleToolCall(client, 'fibaro_device', { op: 'turn_on', device_id: 1 });
        expect(turnOn).toHaveBeenCalled();

        await handleToolCall(client, 'fibaro_device', { op: 'turn_off', device_id: 1 });
        expect(turnOff).toHaveBeenCalled();

        await handleToolCall(client, 'fibaro_device', { op: 'action', device_id: 1, action: 'x', args: [1] });
        expect(callAction).toHaveBeenCalled();

        await handleToolCall(client, 'fibaro_device', { op: 'set_brightness', device_id: 1, level: 50 });
        expect(setBrightness).toHaveBeenCalled();

        const unknown = await handleToolCall(client, 'fibaro_device', { op: 'nope' });
        expect((unknown.content[0] as any).text).toContain('unsupported op');
    });

    it('intent routing: fibaro_scene supports list/get/run/stop/create/update_lua/delete and unknown op', async () => {
        const runScene = vi.fn(async () => { });
        const stopScene = vi.fn(async () => { });
        const createScene = vi.fn(async () => ({ id: 9, name: 'N' }));
        const updateScene = vi.fn(async () => ({ id: 9, name: 'N' }));
        const deleteScene = vi.fn(async () => { });
        const client = makeClient({ runScene, stopScene, createScene, updateScene, deleteScene });

        await handleToolCall(client, 'fibaro_scene', { op: 'list' });
        await handleToolCall(client, 'fibaro_scene', { op: 'get', scene_id: 5 });
        await handleToolCall(client, 'fibaro_scene', { op: 'run', scene_id: 5 });
        expect(runScene).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_scene', { op: 'stop', scene_id: 5 });
        expect(stopScene).toHaveBeenCalled();

        await handleToolCall(client, 'fibaro_scene', { op: 'create', name: 'N', room_id: 10, lua: '' });
        expect(createScene).toHaveBeenCalled();

        await handleToolCall(client, 'fibaro_scene', { op: 'update_lua', scene_id: 5, lua: '--' });
        expect(updateScene).toHaveBeenCalled();

        await handleToolCall(client, 'fibaro_scene', { op: 'delete', scene_id: 5 });
        expect(deleteScene).toHaveBeenCalled();

        const unknown = await handleToolCall(client, 'fibaro_scene', { op: 'nope' });
        expect((unknown.content[0] as any).text).toContain('unsupported op');
    });

    it('intent routing: fibaro_variable supports list/get/set/create/delete and unknown op', async () => {
        const setGlobalVariable = vi.fn(async () => { });
        const createGlobalVariable = vi.fn(async () => ({ name: 'x' }));
        const deleteGlobalVariable = vi.fn(async () => { });
        const client = makeClient({ setGlobalVariable, createGlobalVariable, deleteGlobalVariable });

        await handleToolCall(client, 'fibaro_variable', { op: 'list' });
        await handleToolCall(client, 'fibaro_variable', { op: 'get', name: 'x' });
        await handleToolCall(client, 'fibaro_variable', { op: 'set', name: 'x', value: 'y' });
        expect(setGlobalVariable).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_variable', { op: 'create', name: 'x', value: 'y' });
        expect(createGlobalVariable).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_variable', { op: 'delete', name: 'x' });
        expect(deleteGlobalVariable).toHaveBeenCalled();

        const unknown = await handleToolCall(client, 'fibaro_variable', { op: 'nope' });
        expect((unknown.content[0] as any).text).toContain('unsupported op');
    });

    it('intent routing: fibaro_quick_app supports list/create/update_code/update_variables/get_lua/delete and unknown op', async () => {
        const getQuickApps = vi.fn(async () => []);
        const createQuickApp = vi.fn(async () => ({ id: 8, name: 'QA' }));
        const updateQuickAppCode = vi.fn(async () => { });
        const updateQuickAppVariables = vi.fn(async () => { });
        const getDeviceLua = vi.fn(async () => ({ device: { id: 1, name: 'QA' }, code: '', quickAppVariables: [] }));
        const deleteDevice = vi.fn(async () => { });
        const client = makeClient({
            getQuickApps,
            createQuickApp,
            updateQuickAppCode,
            updateQuickAppVariables,
            getDeviceLua,
            deleteDevice,
        });

        await handleToolCall(client, 'fibaro_quick_app', { op: 'list' });
        expect(getQuickApps).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_quick_app', { op: 'create', name: 'QA', type: 't', code: '' });
        expect(createQuickApp).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_quick_app', { op: 'update_code', device_id: 1, code: '' });
        expect(updateQuickAppCode).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_quick_app', {
            op: 'update_variables',
            device_id: 1,
            variables: [{ name: 'x', value: 'y' }],
        });
        expect(updateQuickAppVariables).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_quick_app', { op: 'get_lua', device_id: 1 });
        expect(getDeviceLua).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_quick_app', { op: 'delete', device_id: 1 });
        expect(deleteDevice).toHaveBeenCalled();

        const unknown = await handleToolCall(client, 'fibaro_quick_app', { op: 'nope' });
        expect((unknown.content[0] as any).text).toContain('unsupported op');
    });

    it('intent routing: fibaro_home supports representative ops and unknown op', async () => {
        const getSystemInfo = vi.fn(async () => ({ ok: true }));
        const getRooms = vi.fn(async () => [{ id: 10, name: 'Kitchen', sectionID: 100 }]);
        const createRoom = vi.fn(async () => ({ id: 12, name: 'New Room' }));
        const getZWaveNetwork = vi.fn(async () => ({ ok: true }));
        const installPlugin = vi.fn(async () => ({}));
        const triggerCustomEvent = vi.fn(async () => ({}));
        const getDeviceStats = vi.fn(async () => ({}));
        const client = makeClient({
            getSystemInfo,
            getRooms,
            createRoom,
            getZWaveNetwork,
            installPlugin,
            triggerCustomEvent,
            getDeviceStats,
        });

        await handleToolCall(client, 'fibaro_home', { op: 'system_info' });
        expect(getSystemInfo).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_home', { op: 'rooms' });
        expect(getRooms).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_home', { op: 'create_room', name: 'New Room', section_id: 100 });
        expect(createRoom).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_home', { op: 'zwave_network' });
        expect(getZWaveNetwork).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_home', { op: 'install_plugin', url: 'https://example.com/x' });
        expect(installPlugin).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_home', { op: 'trigger_custom_event', event_name: 'x', data: { a: 1 } });
        expect(triggerCustomEvent).toHaveBeenCalled();
        await handleToolCall(client, 'fibaro_home', { op: 'device_stats', device_id: 1, params: { x: 1 } });
        expect(getDeviceStats).toHaveBeenCalled();

        const unknown = await handleToolCall(client, 'fibaro_home', { op: 'nope' });
        expect((unknown.content[0] as any).text).toContain('unsupported op');
    });

    it('handleToolCall list_devices covers additional filter branches', async () => {
        const client = makeClient();

        const byRoom = await handleToolCall(client, 'list_devices', { room_id: 10 });
        expect((byRoom.content[0] as any).text).toContain('Kitchen Lamp');
        expect((byRoom.content[0] as any).text).not.toContain('Bedroom Lamp');

        const bySection = await handleToolCall(client, 'list_devices', { section_id: 100 });
        const bySectionText = (bySection.content[0] as any).text as string;
        expect(bySectionText).toContain('Kitchen Lamp');
        expect(bySectionText).toContain('Bedroom Lamp');

        const byType = await handleToolCall(client, 'list_devices', { type: 't2' });
        expect((byType.content[0] as any).text).toContain('Bedroom Lamp');
        expect((byType.content[0] as any).text).not.toContain('Kitchen Lamp');

        const byBaseType = await handleToolCall(client, 'list_devices', { base_type: 'b' });
        expect((byBaseType.content[0] as any).text).toContain('Kitchen Lamp');
        expect((byBaseType.content[0] as any).text).not.toContain('Bedroom Lamp');

        const byInterface = await handleToolCall(client, 'list_devices', { interface: 'battery' });
        expect((byInterface.content[0] as any).text).toContain('Bedroom Lamp');
        expect((byInterface.content[0] as any).text).not.toContain('Kitchen Lamp');

        const byParent = await handleToolCall(client, 'list_devices', { parent_id: 99 });
        expect((byParent.content[0] as any).text).toContain('Kitchen Lamp');
        expect((byParent.content[0] as any).text).not.toContain('Bedroom Lamp');

        const byEnabled = await handleToolCall(client, 'list_devices', { enabled: false });
        expect((byEnabled.content[0] as any).text).toContain('Bedroom Lamp');
        expect((byEnabled.content[0] as any).text).not.toContain('Kitchen Lamp');

        const byDead = await handleToolCall(client, 'list_devices', { dead: true });
        expect((byDead.content[0] as any).text).toContain('Bedroom Lamp');
        expect((byDead.content[0] as any).text).not.toContain('Kitchen Lamp');

        const filteredProps = await handleToolCall(client, 'list_devices', { properties: ['id', 'name', 'value'] });
        const parsed = JSON.parse((filteredProps.content[0] as any).text);
        expect(parsed[0]).toMatchObject({ id: 1, name: 'Kitchen Lamp', value: 1 });
    });

    it('handleToolCall resolve_by_name errors on ambiguity for singular query', async () => {
        await expect(handleToolCall(makeClient(), 'resolve_by_name', { query: 'lamp', kind: 'devices' }))
            .rejects.toMatchObject({ code: ErrorCode.InvalidRequest });
    });

    it('handleToolCall resolve_by_name allows multiple for plural query', async () => {
        const out = await handleToolCall(makeClient(), 'resolve_by_name', { query: 'lamps', kind: 'devices' });
        const parsed = JSON.parse((out.content[0] as any).text);
        expect(parsed.devices.length).toBe(2);
    });

    it('handleToolCall resolve_by_name returns single device for exact match', async () => {
        const out = await handleToolCall(makeClient(), 'resolve_by_name', {
            query: 'Kitchen Lamp',
            kind: 'devices',
            exact: true,
            allow_multiple: false,
        });
        const parsed = JSON.parse((out.content[0] as any).text);
        expect(parsed.devices.length).toBe(1);
        expect(parsed.devices[0].name).toBe('Kitchen Lamp');
    });

    it('all tool definitions are callable with minimal schema-derived args', async () => {
        const tools = getTools().tools;
        const client = makeClient();

        expect(tools.length).toBeGreaterThan(0);

        for (const tool of tools) {
            let args = synthesizeArgFromSchema(tool.inputSchema);
            if (!args || typeof args !== 'object') args = {};

            // Provide stable args for tools where generic synthesis would be ambiguous or cause intentional errors.
            if (tool.name === 'resolve_by_name') {
                args = { query: 'Kitchen Lamp', kind: 'devices', exact: true, allow_multiple: false };
            }
            if (tool.name === 'find_by_name') {
                args = { query: 'Kitchen', kind: 'rooms', exact: true, limit: 10 };
            }
            if (tool.name === 'list_devices') {
                args = {};
            }
            if (tool.name === 'control_device') {
                args = { device_id: 1, action: 'turnOn', args: [] };
            }
            if (tool.name === 'get_scene_lua') {
                args = { scene_id: 5 };
            }
            if (tool.name === 'get_device_lua') {
                args = { device_id: 1 };
            }

            const out = await handleToolCall(client, tool.name, args);
            expect(out.content.length).toBeGreaterThan(0);
            expect((out.content[0] as any).type).toBe('text');
            expect(typeof (out.content[0] as any).text).toBe('string');
        }
    });

    it('handleToolCall errors on unknown tool', async () => {
        await expect(handleToolCall(makeClient(), 'nope', {})).rejects.toBeInstanceOf(McpError);
    });

    it('smoke: newly migrated scene/user/system tools execute and return text', async () => {
        const client = makeClient();

        const out1 = await handleToolCall(client, 'list_scenes', {});
        expect((out1.content[0] as any).text).toContain('"id"');

        const out2 = await handleToolCall(client, 'get_scene', { scene_id: 5 });
        expect((out2.content[0] as any).text).toContain('"id"');

        const out3 = await handleToolCall(client, 'create_room', { name: 'R', section_id: 100 });
        expect((out3.content[0] as any).text).toContain('Room');

        const out4 = await handleToolCall(client, 'list_profiles', {});
        expect((out4.content[0] as any).text).toContain('Home');

        const out5 = await handleToolCall(client, 'get_settings', {});
        expect((out5.content[0] as any).text).toContain('ok');
    });
});
