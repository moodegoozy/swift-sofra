/**
 * ⚠️ DEPRECATED: This file is kept only for backwards compatibility during migration.
 * Please use hooks/useCart.ts instead.
 * 
 * This context was replaced with useCart hook that uses localStorage,
 * providing better persistence and simpler state management.
 */

import React, { createContext } from "react";

const CartContext = createContext<any>(undefined);

// This provider is now a no-op since CartProvider is not needed
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
