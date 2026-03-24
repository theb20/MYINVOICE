import type { ClientInfo } from '@/lib/invoice'

export const SERVICE_OPTIONS = [
  'Prestation (journée)',
  'Prestation (heure)',
  'Développement',
  'Design',
  'Conseil',
  'Maintenance',
  'Hébergement',
]

export const DEFAULT_CLIENTS: ClientInfo[] = [
  {
    name: 'Client Démo',
    contactName: '',
    siret: '',
    email: 'client@exemple.com',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'France',
    vatNumber: '',
  },
]
