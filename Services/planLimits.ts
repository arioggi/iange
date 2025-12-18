import { MOCK_PLANS } from '../constants';
import { User } from '../types';

export const canAddMore = (user: User, type: 'usuarios' | 'propiedades', currentCount: number) => {
  if (user.role === 'superadmin') return true;
  
  const plan = MOCK_PLANS.find(p => p.id === Number(user.planId));
  if (!plan) return false; // Si no hay plan, no puede agregar nada

  const limite = type === 'usuarios' ? plan.limiteUsuarios : plan.limitePropiedades;
  
  if (limite === 'Ilimitado') return true;
  return currentCount < Number(limite);
};