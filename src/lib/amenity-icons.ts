// src/lib/amenity-icons.ts
import {
  AirVent,
  Bath,
  BedDouble,
  BellRing,
  Car,
  Coffee,
  Dumbbell,
  Key,
  Sparkles,
  Sun,
  Tv,
  Waves,
  Wifi,
  Wine,
  type LucideIcon,
} from 'lucide-react';

/** Keyword -> icon, checked in order against the lowercased amenity label. */
const RULES: [RegExp, LucideIcon][] = [
  [/wi[- ]?fi|internet/, Wifi],
  [/air|a\/?c|conditioning/, AirVent],
  [/tv|television/, Tv],
  [/mini ?bar|wine|drink/, Wine],
  [/bath|tub/, Bath],
  [/breakfast|coffee|tea/, Coffee],
  [/room service|service/, BellRing],
  [/terrace|balcony|garden|sun/, Sun],
  [/bed|cot/, BedDouble],
  [/park/, Car],
  [/pool|swim/, Waves],
  [/gym|fitness/, Dumbbell],
  [/key|lock|safe/, Key],
];

/** Best-guess icon for a free-text amenity label (admin-entered). */
export function amenityIcon(label: string): LucideIcon {
  const lower = label.toLowerCase();
  for (const [pattern, icon] of RULES) {
    if (pattern.test(lower)) return icon;
  }
  return Sparkles;
}

/**
 * The canonical amenity checklist offered in the room form. Every label
 * here keyword-matches a RULES entry, so checked amenities always render
 * with a proper icon. Custom (advanced) amenities still go through
 * amenityIcon - best keyword match, generic sparkle otherwise.
 */
export const AMENITY_OPTIONS: string[] = [
  'Wi-Fi',
  'Air conditioning',
  'Smart TV',
  'Mini bar',
  'Bathtub',
  'Breakfast included',
  'Room service',
  'Coffee & tea station',
  'Terrace',
  'Garden view',
  'Extra beds on request',
  'In-room safe',
  'Parking',
  'Swimming pool access',
  'Gym access',
];
