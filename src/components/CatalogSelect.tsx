/* CatalogSelect — dropdown fed by the Technical Catalogs (CRUD-managed),
   with a static fallback, rendered through SearchSelect so it becomes
   searchable past the program-wide threshold. */

import { useMemo } from "react";
import { useStore } from "../state/store";
import { optionsOf, itemsOf, type CatalogKey } from "../data/catalogs";
import { SearchSelect } from "./SearchSelect";

export function CatalogSelect({ group, fallback = [], value, onChange, placeholder = "— select —", invalid = false, withCodes = false }: {
  group: CatalogKey;
  fallback?: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  withCodes?: boolean;
}) {
  const { catalogItems } = useStore();

  const options = useMemo(() => {
    if (withCodes) {
      const items = itemsOf(catalogItems, group);
      if (items.length) return items.map((c) => ({ value: c.value, label: c.value, sub: c.code }));
      return fallback.map((v) => ({ value: v, label: v }));
    }
    const vals = optionsOf(catalogItems, group);
    const list = vals.length ? vals : fallback;
    return list.map((v) => ({ value: v, label: v }));
  }, [catalogItems, group, fallback, withCodes]);

  return (
    <SearchSelect
      value={value}
      onChange={(v) => onChange(v as string)}
      options={options}
      placeholder={placeholder}
      invalid={invalid}
    />
  );
}
