import React from 'react';
import { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface IconProps {
  color: string | ColorValue | any;
  size?: number;
  focused?: boolean;
}

export function HomeIcon({ color, size = 24, focused = false }: IconProps) {
  return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
}

export function TransactionsIcon({ color, size = 24, focused = false }: IconProps) {
  return <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />;
}

export function BudgetsIcon({ color, size = 24, focused = false }: IconProps) {
  return <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={size} color={color} />;
}

export function ReportsIcon({ color, size = 24, focused = false }: IconProps) {
  return <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} />;
}

export function PlusIcon({ color, size = 24 }: IconProps) {
  return <Ionicons name="add" size={size} color={color} />;
}

export function IncomeIcon({ color, size = 20 }: IconProps) {
  return <Ionicons name="arrow-down-circle" size={size} color={color} />;
}

export function ExpenseIcon({ color, size = 20 }: IconProps) {
  return <Ionicons name="arrow-up-circle" size={size} color={color} />;
}

export function WalletIcon({ color, size = 24 }: IconProps) {
  return <Ionicons name="wallet-outline" size={size} color={color} />;
}
