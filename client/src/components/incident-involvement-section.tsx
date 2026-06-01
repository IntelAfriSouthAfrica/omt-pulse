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
import { User, Car } from "lucide-react";

export const PERSON_FIELD_KEYS = [
  "personInvolved",
  "personRole",
  "personName",
  "personGender",
  "personApproxAge",
  "personDescription",
] as const;

export const VEHICLE_FIELD_KEYS = [
  "vehicleInvolved",
  "vehicleType",
  "vehicleColour",
  "vehicleRegistration",
  "vehicleDescription",
] as const;

export const INVOLVEMENT_FIELD_KEYS = new Set<string>([
  ...PERSON_FIELD_KEYS,
  ...VEHICLE_FIELD_KEYS,
]);

export type InvolvementValues = Record<string, string | number | null | undefined>;

export function readInvolvement(customFields: InvolvementValues | null | undefined) {
  const cf = customFields ?? {};
  return {
    personInvolved: cf.personInvolved === "yes" || cf.personInvolved === true,
    vehicleInvolved: cf.vehicleInvolved === "yes" || cf.vehicleInvolved === true,
    personRole: String(cf.personRole ?? ""),
    personName: String(cf.personName ?? ""),
    personGender: String(cf.personGender ?? ""),
    personApproxAge: String(cf.personApproxAge ?? ""),
    personDescription: String(cf.personDescription ?? ""),
    vehicleType: String(cf.vehicleType ?? ""),
    vehicleColour: String(cf.vehicleColour ?? ""),
    vehicleRegistration: String(cf.vehicleRegistration ?? ""),
    vehicleDescription: String(cf.vehicleDescription ?? ""),
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
  return map[value] ?? value.replace(/_/g, " ");
}

export function hasInvolvementData(customFields: InvolvementValues | null | undefined): boolean {
  const inv = readInvolvement(customFields);
  if (!inv.personInvolved && !inv.vehicleInvolved) return false;
  if (inv.personInvolved) {
    if (inv.personRole || inv.personName || inv.personGender || inv.personApproxAge || inv.personDescription) return true;
  }
  if (inv.vehicleInvolved) {
    if (inv.vehicleType || inv.vehicleColour || inv.vehicleRegistration || inv.vehicleDescription) return true;
  }
  return inv.personInvolved || inv.vehicleInvolved;
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

/** Read-only summary for occurrence book / incident detail views. */
export function IncidentInvolvementSummary({
  customFields,
  compact = false,
}: {
  customFields: InvolvementValues | null | undefined;
  compact?: boolean;
}) {
  const inv = readInvolvement(customFields);
  if (!hasInvolvementData(customFields)) return null;

  return (
    <div className={`space-y-3 ${compact ? "" : "pt-1"}`} data-testid="section-involvement-summary">
      {inv.personInvolved && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2" data-testid="summary-person-involved">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Person involved
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DetailRow label="Role" value={labelFor(ROLE_LABELS, inv.personRole)} />
            <DetailRow label="Gender" value={labelFor(GENDER_LABELS, inv.personGender)} />
            <DetailRow label="Name" value={inv.personName} />
            <DetailRow label="Approx. age" value={inv.personApproxAge} />
          </div>
          <DetailRow label="Appearance" value={inv.personDescription} />
        </div>
      )}
      {inv.vehicleInvolved && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2" data-testid="summary-vehicle-involved">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5" />
            Vehicle involved
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DetailRow label="Type" value={labelFor(VEHICLE_TYPE_LABELS, inv.vehicleType)} />
            <DetailRow label="Colour" value={inv.vehicleColour} />
            <DetailRow label="Registration" value={inv.vehicleRegistration} />
            <DetailRow label="Make / model" value={inv.vehicleDescription} />
          </div>
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
  const setField = (key: string, value: string) => {
    onChange(patchCustomFields(customFields, { [key]: value || null }));
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
              onChange(patchCustomFields(customFields, { personInvolved: "yes" }));
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
              onChange(patchCustomFields(customFields, { vehicleInvolved: "yes" }));
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

      {personInvolved && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3" data-testid="section-person-involved">
          <p className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Person details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={readInvolvement(customFields).personRole || ""} onValueChange={(v) => setField("personRole", v)}>
                <SelectTrigger data-testid="select-person-role">
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
              <Select value={readInvolvement(customFields).personGender || ""} onValueChange={(v) => setField("personGender", v)}>
                <SelectTrigger data-testid="select-person-gender">
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
                value={readInvolvement(customFields).personName}
                onChange={(e) => setField("personName", e.target.value)}
                placeholder="First name or alias"
                data-testid="input-person-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Approx. age</Label>
              <Input
                value={readInvolvement(customFields).personApproxAge}
                onChange={(e) => setField("personApproxAge", e.target.value)}
                placeholder="e.g. 30s, teenager"
                data-testid="input-person-age"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Clothing / appearance</Label>
            <Textarea
              value={readInvolvement(customFields).personDescription}
              onChange={(e) => setField("personDescription", e.target.value)}
              placeholder="Brief description — clothing, height, distinguishing marks…"
              className="min-h-[72px] resize-none text-sm"
              data-testid="input-person-description"
            />
          </div>
        </div>
      )}

      {vehicleInvolved && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3" data-testid="section-vehicle-involved">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={readInvolvement(customFields).vehicleType || ""} onValueChange={(v) => setField("vehicleType", v)}>
                <SelectTrigger data-testid="select-vehicle-type">
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
                value={readInvolvement(customFields).vehicleColour}
                onChange={(e) => setField("vehicleColour", e.target.value)}
                placeholder="e.g. White"
                data-testid="input-vehicle-colour"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Registration (if known)</Label>
              <Input
                value={readInvolvement(customFields).vehicleRegistration}
                onChange={(e) => setField("vehicleRegistration", e.target.value)}
                placeholder="Number plate"
                data-testid="input-vehicle-registration"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Make / model</Label>
              <Input
                value={readInvolvement(customFields).vehicleDescription}
                onChange={(e) => setField("vehicleDescription", e.target.value)}
                placeholder="e.g. White Toyota Hilux"
                data-testid="input-vehicle-description"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
