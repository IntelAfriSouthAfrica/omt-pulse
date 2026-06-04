import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Car, ChevronDown, ChevronUp, Loader2, Plus, Upload, User, X } from "lucide-react";
import { prepareAndUploadFile, UploadValidationError } from "@/lib/upload-media";
import { useToast } from "@/hooks/use-toast";
import { AttachmentPreview } from "@/components/attachment-preview";

export const MAX_INVOLVEMENT_PERSONS = 3;
export const MAX_INVOLVEMENT_VEHICLES = 3;

export const PERSON_FIELD_KEYS = [
  "personInvolved",
  "personRole",
  "personName",
  "personGender",
  "personApproxAge",
  "personDescription",
  "personPhotoUrls",
  "personsJson",
] as const;

export const VEHICLE_FIELD_KEYS = [
  "vehicleInvolved",
  "vehicleType",
  "vehicleColour",
  "vehicleRegistration",
  "vehicleDescription",
  "vehiclePhotoUrls",
  "vehiclesJson",
] as const;

export const INVOLVEMENT_FIELD_KEYS = new Set<string>([
  ...PERSON_FIELD_KEYS,
  ...VEHICLE_FIELD_KEYS,
]);

export type InvolvementValues = Record<string, string | number | null | undefined>;

export type PersonEntry = {
  role: string;
  name: string;
  gender: string;
  approxAge: string;
  description: string;
  photoUrls: string[];
};

export type VehicleEntry = {
  type: string;
  colour: string;
  registration: string;
  description: string;
  photoUrls: string[];
};

const MAX_INVOLVEMENT_PHOTOS = 5;

export function parsePhotoUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      if (trimmed.startsWith("http") || trimmed.startsWith("/")) return [trimmed];
    }
  }
  return [];
}

function serializePhotoUrls(urls: string[]): string | null {
  return urls.length > 0 ? JSON.stringify(urls) : null;
}

function emptyPerson(): PersonEntry {
  return { role: "", name: "", gender: "", approxAge: "", description: "", photoUrls: [] };
}

function emptyVehicle(): VehicleEntry {
  return { type: "", colour: "", registration: "", description: "", photoUrls: [] };
}

function normalizePerson(raw: unknown): PersonEntry {
  if (!raw || typeof raw !== "object") return emptyPerson();
  const o = raw as Record<string, unknown>;
  return {
    role: String(o.role ?? ""),
    name: String(o.name ?? ""),
    gender: String(o.gender ?? ""),
    approxAge: String(o.approxAge ?? ""),
    description: String(o.description ?? ""),
    photoUrls: parsePhotoUrls(o.photoUrls),
  };
}

function normalizeVehicle(raw: unknown): VehicleEntry {
  if (!raw || typeof raw !== "object") return emptyVehicle();
  const o = raw as Record<string, unknown>;
  return {
    type: String(o.type ?? ""),
    colour: String(o.colour ?? ""),
    registration: String(o.registration ?? ""),
    description: String(o.description ?? ""),
    photoUrls: parsePhotoUrls(o.photoUrls),
  };
}

function parseJsonEntries<T>(raw: unknown, normalize: (v: unknown) => T): T[] | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return null;
    return parsed.map(normalize);
  } catch {
    return null;
  }
}

function legacyPersonFromFields(cf: InvolvementValues): PersonEntry {
  return {
    role: String(cf.personRole ?? ""),
    name: String(cf.personName ?? ""),
    gender: String(cf.personGender ?? ""),
    approxAge: String(cf.personApproxAge ?? ""),
    description: String(cf.personDescription ?? ""),
    photoUrls: parsePhotoUrls(cf.personPhotoUrls),
  };
}

function legacyVehicleFromFields(cf: InvolvementValues): VehicleEntry {
  return {
    type: String(cf.vehicleType ?? ""),
    colour: String(cf.vehicleColour ?? ""),
    registration: String(cf.vehicleRegistration ?? ""),
    description: String(cf.vehicleDescription ?? ""),
    photoUrls: parsePhotoUrls(cf.vehiclePhotoUrls),
  };
}

export function parsePersons(cf: InvolvementValues | null | undefined): PersonEntry[] {
  const data = cf ?? {};
  const fromJson = parseJsonEntries(data.personsJson, normalizePerson);
  if (fromJson && fromJson.length > 0) return fromJson;

  const flag = data.personInvolved === "yes" || data.personInvolved === true;
  const legacy = legacyPersonFromFields(data);
  if (flag || personEntryHasData(legacy)) return [legacy];
  return [];
}

export function parseVehicles(cf: InvolvementValues | null | undefined): VehicleEntry[] {
  const data = cf ?? {};
  const fromJson = parseJsonEntries(data.vehiclesJson, normalizeVehicle);
  if (fromJson && fromJson.length > 0) return fromJson;

  const flag = data.vehicleInvolved === "yes" || data.vehicleInvolved === true;
  const legacy = legacyVehicleFromFields(data);
  if (flag || vehicleEntryHasData(legacy)) return [legacy];
  return [];
}

function serializePersons(persons: PersonEntry[]): string | null {
  return persons.length > 0 ? JSON.stringify(persons) : null;
}

function serializeVehicles(vehicles: VehicleEntry[]): string | null {
  return vehicles.length > 0 ? JSON.stringify(vehicles) : null;
}

function personEntryHasData(p: PersonEntry): boolean {
  return Boolean(
    p.role || p.name || p.gender || p.approxAge || p.description || p.photoUrls.length > 0,
  );
}

function vehicleEntryHasData(v: VehicleEntry): boolean {
  return Boolean(
    v.type || v.colour || v.registration || v.description || v.photoUrls.length > 0,
  );
}

/** Sync first person/vehicle into legacy single-field keys for older readers/exports. */
function legacyPersonPatch(persons: PersonEntry[]): Partial<InvolvementValues> {
  const first = persons[0];
  if (!first) {
    return {
      personRole: null,
      personName: null,
      personGender: null,
      personApproxAge: null,
      personDescription: null,
      personPhotoUrls: null,
    };
  }
  return {
    personRole: first.role || null,
    personName: first.name || null,
    personGender: first.gender || null,
    personApproxAge: first.approxAge || null,
    personDescription: first.description || null,
    personPhotoUrls: serializePhotoUrls(first.photoUrls),
  };
}

function legacyVehiclePatch(vehicles: VehicleEntry[]): Partial<InvolvementValues> {
  const first = vehicles[0];
  if (!first) {
    return {
      vehicleType: null,
      vehicleColour: null,
      vehicleRegistration: null,
      vehicleDescription: null,
      vehiclePhotoUrls: null,
    };
  }
  return {
    vehicleType: first.type || null,
    vehicleColour: first.colour || null,
    vehicleRegistration: first.registration || null,
    vehicleDescription: first.description || null,
    vehiclePhotoUrls: serializePhotoUrls(first.photoUrls),
  };
}

export function readInvolvement(customFields: InvolvementValues | null | undefined) {
  const persons = parsePersons(customFields);
  const vehicles = parseVehicles(customFields);
  const firstPerson = persons[0] ?? emptyPerson();
  const firstVehicle = vehicles[0] ?? emptyVehicle();
  return {
    personInvolved: persons.length > 0,
    vehicleInvolved: vehicles.length > 0,
    persons,
    vehicles,
    personRole: firstPerson.role,
    personName: firstPerson.name,
    personGender: firstPerson.gender,
    personApproxAge: firstPerson.approxAge,
    personDescription: firstPerson.description,
    personPhotoUrls: firstPerson.photoUrls,
    vehicleType: firstVehicle.type,
    vehicleColour: firstVehicle.colour,
    vehicleRegistration: firstVehicle.registration,
    vehicleDescription: firstVehicle.description,
    vehiclePhotoUrls: firstVehicle.photoUrls,
  };
}

const ROLE_LABELS: Record<string, string> = {
  suspect: "Suspect",
  witness: "Witness",
  victim: "Victim",
  other: "Other",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  unknown: "Unknown",
  prefer_not_to_say: "Prefer not to say",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: "Car",
  bakkie: "Bakkie / LDV",
  motorcycle: "Motorcycle",
  truck: "Truck",
  other: "Other",
};

function labelFor(map: Record<string, string>, value: string) {
  return value ? (map[value] ?? value.replace(/_/g, " ")) : "";
}

export function hasInvolvementData(customFields: InvolvementValues | null | undefined): boolean {
  const persons = parsePersons(customFields);
  const vehicles = parseVehicles(customFields);
  if (persons.some(personEntryHasData)) return true;
  if (vehicles.some(vehicleEntryHasData)) return true;
  return persons.length > 0 || vehicles.length > 0;
}

function personSummaryLine(p: PersonEntry): string {
  const parts: string[] = [];
  const role = labelFor(ROLE_LABELS, p.role);
  if (role) parts.push(role);
  const gender = labelFor(GENDER_LABELS, p.gender);
  if (gender) parts.push(gender);
  if (p.name.trim()) parts.push(p.name.trim());
  else if (p.approxAge.trim()) parts.push(p.approxAge.trim());
  if (parts.length === 0) return "Details not filled in yet";
  return parts.join(" · ");
}

function vehicleSummaryLine(v: VehicleEntry): string {
  const parts: string[] = [];
  const type = labelFor(VEHICLE_TYPE_LABELS, v.type);
  if (type) parts.push(type);
  if (v.colour.trim()) parts.push(v.colour.trim());
  if (v.registration.trim()) parts.push(v.registration.trim());
  else if (v.description.trim()) parts.push(v.description.trim());
  if (parts.length === 0) return "Details not filled in yet";
  return parts.join(" · ");
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}

function PersonSummaryBlock({ person, index }: { person: PersonEntry; index: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2" data-testid={`summary-person-${index}`}>
      <p className="text-xs font-semibold flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" />
        Person {index + 1}
        {person.role && (
          <span className="font-normal text-muted-foreground">
            — {labelFor(ROLE_LABELS, person.role)}
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <DetailRow label="Role" value={labelFor(ROLE_LABELS, person.role)} />
        <DetailRow label="Gender" value={labelFor(GENDER_LABELS, person.gender)} />
        <DetailRow label="Name" value={person.name} />
        <DetailRow label="Approx. age" value={person.approxAge} />
      </div>
      <DetailRow label="Appearance" value={person.description} />
      {person.photoUrls.length > 0 && (
        <InvolvementPhotoGrid urls={person.photoUrls} readOnly testIdPrefix={`summary-person-${index}`} />
      )}
    </div>
  );
}

function VehicleSummaryBlock({ vehicle, index }: { vehicle: VehicleEntry; index: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2" data-testid={`summary-vehicle-${index}`}>
      <p className="text-xs font-semibold flex items-center gap-1.5">
        <Car className="h-3.5 w-3.5" />
        Vehicle {index + 1}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <DetailRow label="Type" value={labelFor(VEHICLE_TYPE_LABELS, vehicle.type)} />
        <DetailRow label="Colour" value={vehicle.colour} />
        <DetailRow label="Registration" value={vehicle.registration} />
        <DetailRow label="Make / model" value={vehicle.description} />
      </div>
      {vehicle.photoUrls.length > 0 && (
        <InvolvementPhotoGrid urls={vehicle.photoUrls} readOnly testIdPrefix={`summary-vehicle-${index}`} />
      )}
    </div>
  );
}

/** Read-only summary for occurrence book / incident detail views. */
export function IncidentInvolvementSummary({
  customFields,
  compact = false,
}: {
  customFields: InvolvementValues | null | undefined;
  compact?: boolean;
}) {
  const persons = parsePersons(customFields);
  const vehicles = parseVehicles(customFields);
  if (!hasInvolvementData(customFields)) return null;

  return (
    <div className={`space-y-3 ${compact ? "" : "pt-1"}`} data-testid="section-involvement-summary">
      {persons.length > 0 && (
        <div className="space-y-2" data-testid="summary-person-involved">
          {persons.length > 1 && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              People ({persons.length})
            </p>
          )}
          {persons.map((p, i) => (
            <PersonSummaryBlock key={i} person={p} index={i} />
          ))}
        </div>
      )}
      {vehicles.length > 0 && (
        <div className="space-y-2" data-testid="summary-vehicle-involved">
          {vehicles.length > 1 && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Vehicles ({vehicles.length})
            </p>
          )}
          {vehicles.map((v, i) => (
            <VehicleSummaryBlock key={i} vehicle={v} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function patchCustomFields(
  current: InvolvementValues,
  patch: InvolvementValues,
): InvolvementValues {
  return { ...current, ...patch };
}

function clearPersonFields(current: InvolvementValues): InvolvementValues {
  const next = { ...current };
  for (const key of PERSON_FIELD_KEYS) delete next[key];
  return next;
}

function clearVehicleFields(current: InvolvementValues): InvolvementValues {
  const next = { ...current };
  for (const key of VEHICLE_FIELD_KEYS) delete next[key];
  return next;
}

function InvolvementPhotoGrid({
  urls,
  readOnly = false,
  onRemove,
  testIdPrefix,
}: {
  urls: string[];
  readOnly?: boolean;
  onRemove?: (index: number) => void;
  testIdPrefix: string;
}) {
  if (urls.length === 0) return null;
  return (
    <div className={`grid gap-2 ${readOnly ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3"}`}>
      {urls.map((url, i) => (
        <div key={`${url}-${i}`} className="relative aspect-square rounded-md border overflow-hidden bg-muted">
          {readOnly ? (
            <div className="h-full [&_button]:h-full [&_img]:!h-full [&_img]:object-cover [&_img]:rounded-none">
              <AttachmentPreview url={url} alt={`Photo ${i + 1}`} mimeType="image/jpeg" />
            </div>
          ) : (
            <img src={url} alt="" className="w-full h-full object-cover" />
          )}
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
              data-testid={`${testIdPrefix}-photo-remove-${i}`}
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function InvolvementPhotoPicker({
  urls,
  onChange,
  testIdPrefix,
  label,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  testIdPrefix: string;
  label: string;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const remaining = MAX_INVOLVEMENT_PHOTOS - urls.length;
    if (remaining <= 0) {
      toast({ title: "Photo limit reached", description: `Maximum ${MAX_INVOLVEMENT_PHOTOS} photos per section.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const next = [...urls];
      for (const file of Array.from(files).slice(0, remaining)) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Images only", description: "Please choose a photo file.", variant: "destructive" });
          continue;
        }
        const { objectUrl } = await prepareAndUploadFile(file, { preset: "evidence" });
        next.push(objectUrl);
      }
      onChange(next);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof UploadValidationError ? err.message : err instanceof Error ? err.message : "Could not upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2 pt-1">
      <Label className="text-xs">{label}</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid={`${testIdPrefix}-photo-file`}
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid={`${testIdPrefix}-photo-camera`}
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          disabled={uploading || urls.length >= MAX_INVOLVEMENT_PHOTOS}
          onClick={() => cameraInputRef.current?.click()}
          data-testid={`${testIdPrefix}-take-photo`}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          Take photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          disabled={uploading || urls.length >= MAX_INVOLVEMENT_PHOTOS}
          onClick={() => fileInputRef.current?.click()}
          data-testid={`${testIdPrefix}-upload-photo`}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload photo
        </Button>
      </div>
      <InvolvementPhotoGrid
        urls={urls}
        testIdPrefix={testIdPrefix}
        onRemove={(index) => onChange(urls.filter((_, i) => i !== index))}
      />
    </div>
  );
}

function CollapsibleEntryHeader({
  title,
  summary,
  expanded,
  onToggle,
  onRemove,
  canRemove,
  testIdPrefix,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  canRemove: boolean;
  testIdPrefix: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 min-w-0 text-left rounded-lg border border-border/60 bg-background px-3 py-2.5 hover:bg-muted/30 transition-colors touch-manipulation"
        data-testid={`${testIdPrefix}-toggle`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
        {!expanded && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{summary}</p>
        )}
      </button>
      {canRemove && onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          data-testid={`${testIdPrefix}-remove`}
          aria-label={`Remove ${title}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function PersonEntryForm({
  person,
  index,
  multi,
  expanded,
  onToggle,
  onRemove,
  canRemove,
  onChange,
}: {
  person: PersonEntry;
  index: number;
  multi: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
  onChange: (next: PersonEntry) => void;
}) {
  const title = multi ? `Person ${index + 1}` : "Person details";
  const prefix = `person-${index}`;

  return (
    <div className="space-y-3" data-testid={`section-person-${index}`}>
      {multi ? (
        <CollapsibleEntryHeader
          title={title}
          summary={personSummaryLine(person)}
          expanded={expanded}
          onToggle={onToggle}
          onRemove={onRemove}
          canRemove={canRemove}
          testIdPrefix={prefix}
        />
      ) : null}

      {(!multi || expanded) && (
        <div className={multi ? "pl-0 space-y-3" : "space-y-3"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={person.role || ""} onValueChange={(v) => onChange({ ...person, role: v })}>
                <SelectTrigger data-testid={`${prefix}-role`}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspect">Suspect</SelectItem>
                  <SelectItem value="witness">Witness</SelectItem>
                  <SelectItem value="victim">Victim</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <Select value={person.gender || ""} onValueChange={(v) => onChange({ ...person, gender: v })}>
                <SelectTrigger data-testid={`${prefix}-gender`}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name (if known)</Label>
              <Input
                value={person.name}
                onChange={(e) => onChange({ ...person, name: e.target.value })}
                placeholder="First name or alias"
                data-testid={`${prefix}-name`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Approx. age</Label>
              <Input
                value={person.approxAge}
                onChange={(e) => onChange({ ...person, approxAge: e.target.value })}
                placeholder="e.g. 30s, teenager"
                data-testid={`${prefix}-age`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Clothing / appearance</Label>
            <Textarea
              value={person.description}
              onChange={(e) => onChange({ ...person, description: e.target.value })}
              placeholder="Brief description — clothing, height, distinguishing marks…"
              className="min-h-[72px] resize-none text-sm"
              data-testid={`${prefix}-description`}
            />
          </div>
          <InvolvementPhotoPicker
            label="Photos"
            testIdPrefix={prefix}
            urls={person.photoUrls}
            onChange={(urls) => onChange({ ...person, photoUrls: urls })}
          />
        </div>
      )}
    </div>
  );
}

function VehicleEntryForm({
  vehicle,
  index,
  multi,
  expanded,
  onToggle,
  onRemove,
  canRemove,
  onChange,
}: {
  vehicle: VehicleEntry;
  index: number;
  multi: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
  onChange: (next: VehicleEntry) => void;
}) {
  const title = multi ? `Vehicle ${index + 1}` : "Vehicle details";
  const prefix = `vehicle-${index}`;

  return (
    <div className="space-y-3" data-testid={`section-vehicle-${index}`}>
      {multi ? (
        <CollapsibleEntryHeader
          title={title}
          summary={vehicleSummaryLine(vehicle)}
          expanded={expanded}
          onToggle={onToggle}
          onRemove={onRemove}
          canRemove={canRemove}
          testIdPrefix={prefix}
        />
      ) : null}

      {(!multi || expanded) && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={vehicle.type || ""} onValueChange={(v) => onChange({ ...vehicle, type: v })}>
                <SelectTrigger data-testid={`${prefix}-type`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bakkie">Bakkie / LDV</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Colour</Label>
              <Input
                value={vehicle.colour}
                onChange={(e) => onChange({ ...vehicle, colour: e.target.value })}
                placeholder="e.g. White"
                data-testid={`${prefix}-colour`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Registration (if known)</Label>
              <Input
                value={vehicle.registration}
                onChange={(e) => onChange({ ...vehicle, registration: e.target.value })}
                placeholder="Number plate"
                data-testid={`${prefix}-registration`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Make / model</Label>
              <Input
                value={vehicle.description}
                onChange={(e) => onChange({ ...vehicle, description: e.target.value })}
                placeholder="e.g. White Toyota Hilux"
                data-testid={`${prefix}-description`}
              />
            </div>
          </div>
          <InvolvementPhotoPicker
            label="Photos"
            testIdPrefix={prefix}
            urls={vehicle.photoUrls}
            onChange={(urls) => onChange({ ...vehicle, photoUrls: urls })}
          />
        </div>
      )}
    </div>
  );
}

type Props = {
  customFields: InvolvementValues;
  onChange: (next: InvolvementValues) => void;
  personInvolved: boolean;
  vehicleInvolved: boolean;
  onPersonInvolvedChange: (on: boolean) => void;
  onVehicleInvolvedChange: (on: boolean) => void;
};

export function IncidentInvolvementSection({
  customFields,
  onChange,
  personInvolved,
  vehicleInvolved,
  onPersonInvolvedChange,
  onVehicleInvolvedChange,
}: Props) {
  const persons = parsePersons(customFields);
  const vehicles = parseVehicles(customFields);
  const multiPerson = persons.length > 1;
  const multiVehicle = vehicles.length > 1;

  const [expandedPerson, setExpandedPerson] = useState(0);
  const [expandedVehicle, setExpandedVehicle] = useState(0);

  useEffect(() => {
    if (expandedPerson >= persons.length) setExpandedPerson(Math.max(0, persons.length - 1));
  }, [persons.length, expandedPerson]);

  useEffect(() => {
    if (expandedVehicle >= vehicles.length) setExpandedVehicle(Math.max(0, vehicles.length - 1));
  }, [vehicles.length, expandedVehicle]);

  const writePersons = (next: PersonEntry[]) => {
    onChange(
      patchCustomFields(customFields, {
        personInvolved: next.length > 0 ? "yes" : null,
        personsJson: serializePersons(next),
        ...legacyPersonPatch(next),
      }),
    );
  };

  const writeVehicles = (next: VehicleEntry[]) => {
    onChange(
      patchCustomFields(customFields, {
        vehicleInvolved: next.length > 0 ? "yes" : null,
        vehiclesJson: serializeVehicles(next),
        ...legacyVehiclePatch(next),
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !personInvolved;
            onPersonInvolvedChange(next);
            if (next) {
              writePersons([emptyPerson()]);
              setExpandedPerson(0);
            } else {
              onChange(clearPersonFields(customFields));
            }
          }}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors touch-manipulation ${
            personInvolved
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted/40"
          }`}
          data-testid="toggle-person-involved"
        >
          <User className="h-4 w-4 shrink-0" />
          Person involved
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !vehicleInvolved;
            onVehicleInvolvedChange(next);
            if (next) {
              writeVehicles([emptyVehicle()]);
              setExpandedVehicle(0);
            } else {
              onChange(clearVehicleFields(customFields));
            }
          }}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors touch-manipulation ${
            vehicleInvolved
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted/40"
          }`}
          data-testid="toggle-vehicle-involved"
        >
          <Car className="h-4 w-4 shrink-0" />
          Vehicle involved
        </button>
      </div>

      {personInvolved && persons.length > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-4" data-testid="section-person-involved">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 shrink-0" />
              {persons.length === 1 ? "Person details" : `People (${persons.length})`}
            </p>
            {persons.length < MAX_INVOLVEMENT_PERSONS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  const next = [...persons, emptyPerson()];
                  writePersons(next);
                  setExpandedPerson(next.length - 1);
                }}
                data-testid="button-add-person-top"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another
              </Button>
            )}
          </div>
          {persons.map((person, index) => (
            <PersonEntryForm
              key={index}
              person={person}
              index={index}
              multi={multiPerson}
              expanded={!multiPerson || expandedPerson === index}
              onToggle={() => setExpandedPerson(expandedPerson === index ? -1 : index)}
              canRemove={persons.length > 1}
              onRemove={() => {
                const next = persons.filter((_, i) => i !== index);
                if (next.length === 0) {
                  onPersonInvolvedChange(false);
                  onChange(clearPersonFields(customFields));
                } else {
                  writePersons(next);
                  setExpandedPerson(Math.min(expandedPerson, next.length - 1));
                }
              }}
              onChange={(entry) => {
                const next = [...persons];
                next[index] = entry;
                writePersons(next);
              }}
            />
          ))}
        </div>
      )}

      {vehicleInvolved && vehicles.length > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-4" data-testid="section-vehicle-involved">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold flex items-center gap-2 min-w-0">
              <Car className="h-4 w-4 shrink-0" />
              {vehicles.length === 1 ? "Vehicle details" : `Vehicles (${vehicles.length})`}
            </p>
            {vehicles.length < MAX_INVOLVEMENT_VEHICLES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  const next = [...vehicles, emptyVehicle()];
                  writeVehicles(next);
                  setExpandedVehicle(next.length - 1);
                }}
                data-testid="button-add-vehicle-top"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another
              </Button>
            )}
          </div>
          {vehicles.map((vehicle, index) => (
            <VehicleEntryForm
              key={index}
              vehicle={vehicle}
              index={index}
              multi={multiVehicle}
              expanded={!multiVehicle || expandedVehicle === index}
              onToggle={() => setExpandedVehicle(expandedVehicle === index ? -1 : index)}
              canRemove={vehicles.length > 1}
              onRemove={() => {
                const next = vehicles.filter((_, i) => i !== index);
                if (next.length === 0) {
                  onVehicleInvolvedChange(false);
                  onChange(clearVehicleFields(customFields));
                } else {
                  writeVehicles(next);
                  setExpandedVehicle(Math.min(expandedVehicle, next.length - 1));
                }
              }}
              onChange={(entry) => {
                const next = [...vehicles];
                next[index] = entry;
                writeVehicles(next);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
