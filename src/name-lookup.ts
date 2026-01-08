export type LookupKind = "devices" | "rooms" | "all";

export interface LookupRoomResult {
  id: number;
  name: string;
  sectionID: number;
  sectionName?: string;
  visible: boolean;
  isDefault: boolean;
}

export interface LookupDeviceResult {
  id: number;
  name: string;
  roomID: number;
  roomName?: string;
  sectionID?: number;
  sectionName?: string;
  type: string;
  baseType: string;
  enabled: boolean;
  visible: boolean;
}

export const normalizeName = (str: string): string =>
  (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/đ/g, "d")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/þ/g, "th");

export const isPluralishQuery = (query: string): boolean => {
  const raw = (query || "").trim().toLowerCase();
  if (!raw) return false;

  if (raw.startsWith("all ")) return true;
  if (raw.startsWith("all\t")) return true;
  if (raw.startsWith("all\n")) return true;
  if (raw.startsWith("every ")) return true;

  const tokens = raw.split(/\s+/).filter(Boolean);
  const last = tokens[tokens.length - 1] || "";
  if (last.length < 3) return false;

  if (last.endsWith("s") && !last.endsWith("ss")) return true;
  return false;
};

export const makeNameMatcher = (
  query: string,
  exact: boolean,
): ((candidate: string) => boolean) => {
  const nq = normalizeName(query);
  const pluralish = !exact && isPluralishQuery(query);
  const nqSingular =
    pluralish && nq.endsWith("s") && !nq.endsWith("ss") ? nq.replace(/s$/, "") : undefined;
  return (candidate: string): boolean => {
    const nc = normalizeName(candidate || "");
    if (exact) return nc === nq;
    if (nc.includes(nq)) return true;
    if (nqSingular && nqSingular.length > 0 && nc.includes(nqSingular)) return true;
    return false;
  };
};

export function findMatches(params: {
  query: string;
  kind: LookupKind;
  exact: boolean;
  limit: number;
  rooms: any[];
  sections: any[];
  devices: any[];
}): { rooms: LookupRoomResult[]; devices: LookupDeviceResult[] } {
  const { query, kind, exact, limit, rooms, sections, devices } = params;
  const matches = makeNameMatcher(query, exact);

  const roomById = new Map<number, any>(rooms.map((r: any) => [r.id, r]));
  const sectionById = new Map<number, any>(sections.map((s: any) => [s.id, s]));

  const roomResults: LookupRoomResult[] =
    kind === "devices"
      ? []
      : rooms
          .filter((r: any) => matches(r.name || ""))
          .slice(0, limit)
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            sectionID: r.sectionID,
            sectionName: sectionById.get(r.sectionID)?.name,
            visible: r.visible,
            isDefault: r.isDefault,
          }));

  const deviceResults: LookupDeviceResult[] =
    kind === "rooms"
      ? []
      : devices
          .filter((d: any) => matches(d.name || ""))
          .slice(0, limit)
          .map((d: any) => {
            const room = roomById.get(d.roomID);
            const section = room ? sectionById.get(room.sectionID) : undefined;
            return {
              id: d.id,
              name: d.name,
              roomID: d.roomID,
              roomName: room?.name,
              sectionID: room?.sectionID,
              sectionName: section?.name,
              type: d.type,
              baseType: d.baseType,
              enabled: d.enabled,
              visible: d.visible,
            };
          });

  return { rooms: roomResults, devices: deviceResults };
}
