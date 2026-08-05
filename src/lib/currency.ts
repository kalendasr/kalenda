import { useSyncExternalStore } from 'react'

/**
 * Weergavevaluta voor de publieke storefront. Uitsluitend cosmetisch — de
 * keuze beïnvloedt nooit checkout, orders of betalingen (die blijven altijd
 * in SRD-centen, zie money.ts). De voorkeur wordt in localStorage bewaard
 * zodat de header en de kaarten op elke publieke pagina synchroon lopen.
 */

export type DisplayCurrency = 'SRD' | 'EUR'

const STORAGE_KEY = 'kalenda:display-currency'

let currency: DisplayCurrency = 'SRD'
const listeners = new Set<() => void>()

function isBrowser() {
  return typeof window !== 'undefined'
}

function readStored(): DisplayCurrency {
  if (!isBrowser()) return 'SRD'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'EUR' ? 'EUR' : 'SRD'
}

if (isBrowser()) {
  currency = readStored()
}

function setCurrency(next: DisplayCurrency) {
  currency = next
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, next)
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): DisplayCurrency {
  return currency
}

function getServerSnapshot(): DisplayCurrency {
  return 'SRD'
}

/** Leest en zet de gedeelde weergavevaluta (SRD/USD) van de storefront. */
export function useCurrency() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { currency: value, setCurrency }
}
