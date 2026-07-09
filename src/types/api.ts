export type PropertyStatus = 'AVAILABLE' | 'NEGOTIATING' | 'SOLD'

export type UserRole = 'agent' | 'manager' | 'admin' | string

export interface PropertyMediaFile {
  fileName: string
  lastModified?: number
  mimeType: string
  size: number
  type: 'image' | 'video' | string
}

export interface Company {
  id: string
  name: string
  email: string
  phone?: string | null
  whatsapp?: string | null
  brandImageUrl?: string | null
  logoUrl?: string | null
  headquartersStreet?: string | null
  headquartersNumber?: string | null
  headquartersComplement?: string | null
  headquartersNeighborhood?: string | null
  headquartersCity?: string | null
  headquartersState?: string | null
  headquartersPostalCode?: string | null
  headquartersAddress?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  role: UserRole
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface Property {
  id: string
  title: string
  description?: string | null
  latitude: number
  longitude: number
  status: PropertyStatus
  type?: string | null
  propertyType?: string | null
  realEstateType?: string | null
  tipoImovel?: string | null
  bedrooms?: number | string | null
  rooms?: number | string | null
  quartos?: number | string | null
  bathrooms?: number | string | null
  banheiros?: number | string | null
  parkingSpots?: number | string | null
  garageSpots?: number | string | null
  vagas?: number | string | null
  price?: number | string | null
  rentPrice?: number | string | null
  salePrice?: number | string | null
  value?: number | string | null
  amount?: number | string | null
  preco?: number | string | null
  valorAluguel?: number | string | null
  valorVenda?: number | string | null
  city?: string | null
  cidade?: string | null
  neighborhood?: string | null
  district?: string | null
  bairro?: string | null
  address?: string | null
  endereco?: string | null
  street?: string | null
  streetName?: string | null
  addressNumber?: string | null
  number?: string | null
  buildingName?: string | null
  condominiumName?: string | null
  apartmentNumber?: string | null
  complement?: string | null
  state?: string | null
  stateCode?: string | null
  uf?: string | null
  postalCode?: string | null
  cep?: string | null
  listingType?: string | null
  transactionType?: string | null
  purpose?: string | null
  operation?: string | null
  agentId?: string | null
  agentName?: string | null
  responsibleAgentId?: string | null
  responsibleAgentName?: string | null
  images?: string[] | null
  imageUrls?: string[] | null
  photos?: string[] | null
  videos?: string[] | null
  videoUrls?: string[] | null
  media?: Array<{ type?: 'image' | 'video' | string; url?: string; src?: string }> | null
  mediaFiles?: PropertyMediaFile[] | null
  contactPhone?: string | null
  contactWhatsApp?: string | null
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface PublicProfessionalContact {
  email?: string | null
  instagram?: string | null
  phone?: string | null
  site?: string | null
  whatsapp?: string | null
}

export interface PublicProfessionalStats {
  activeProperties?: number | string | null
  averageRating?: number | string | null
  experienceYears?: number | string | null
  interestedCount?: number | string | null
  responseMinutes?: number | string | null
  responseRate?: number | string | null
  reviewCount?: number | string | null
}

export interface PublicProfessionalReview {
  id?: string
  author?: string | null
  comment?: string | null
  createdAt?: string | null
  date?: string | null
  name?: string | null
  photo?: string | null
  photoUrl?: string | null
  rating?: number | string | null
}

export interface PublicProfessionalArea {
  count?: number | string | null
  name: string
}

export interface PublicProfessionalPropertyType {
  count?: number | string | null
  name: string
  percent?: number | string | null
}

export interface PublicProfessionalProfile {
  id: string
  name: string
  slug: string
  role?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  bio?: string | null
  creci?: string | null
  city?: string | null
  state?: string | null
  createdAt?: string | null
  memberSince?: string | null
  photo?: string | null
  photoUrl?: string | null
  avatarUrl?: string | null
  logoUrl?: string | null
  contact?: PublicProfessionalContact | null
  company?: Partial<Company> | null
  specialties?: string[] | null
  achievements?: string[] | null
  stats?: PublicProfessionalStats | null
  reviews?: PublicProfessionalReview[] | null
  properties?: Property[] | null
  areas?: PublicProfessionalArea[] | null
  propertyTypes?: PublicProfessionalPropertyType[] | null
}

export interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface ApiFailure {
  success: false
  error: {
    message: string
    code?: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterCompanyInput extends LoginInput {
  name: string
  phone?: string
  whatsapp?: string
  brandImageUrl?: string
  logoUrl?: string
  headquartersStreet?: string
  headquartersNumber?: string
  headquartersComplement?: string
  headquartersNeighborhood?: string
  headquartersCity?: string
  headquartersState?: string
  headquartersPostalCode?: string
  headquartersAddress?: string
}

export interface LoginData {
  token: string
  company: Company
  user?: User | null
}

export type LeadStatus = 'NEW' | 'IN_SERVICE' | 'NEGOTIATING' | 'FINISHED' | 'LOST'

export interface Lead {
  id: string
  propertyId: string
  propertyTitle?: string
  agentId?: string | null
  agentName?: string | null
  interestedName?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  source: 'INTEREST' | 'CONTACT' | 'WHATSAPP' | 'PHONE' | string
  status: LeadStatus
  viewed?: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateLeadInput {
  propertyId: string
  propertyTitle?: string
  agentId?: string | null
  agentName?: string | null
  interestedName: string
  email: string
  phone?: string
  whatsapp: string
  source: 'INTEREST' | 'CONTACT' | 'WHATSAPP' | 'PHONE' | string
  message?: string
}

export type PartnershipType = 'imobiliaria' | 'corretor' | 'autonomo'

export interface CreatePartnershipInput {
  tipo: PartnershipType
  nome: string
  cpfCnpj: string
  telefone: string
  email: string
  cidade: string
  estado: string
  creci: string
  interesse: string
  origem: string
  motivacao: string
  acceptedPrivacyPolicy: boolean
  landingPage?: string
  referrerUrl?: string
}

export type NegotiationStatus = 'OPEN' | 'FOLLOW_UP' | 'PROPOSAL' | 'CLOSED' | 'LOST'

export interface Negotiation {
  id: string
  propertyId: string
  propertyTitle?: string
  agentId?: string | null
  agentName?: string | null
  leadId?: string | null
  status: NegotiationStatus
  value?: number | string | null
  startedAt: string
  updatedAt?: string
}

export interface PropertyPerformance {
  propertyId: string
  propertyTitle: string
  views: number
  leads: number
  negotiations: number
}

export interface PerformanceMetric {
  agentId: string
  agentName: string
  activeProperties: number
  leads: number
  negotiations: number
  closedDeals: number
  responseRate: number
}

export interface CreateUserInput {
  name: string
  email: string
  phone?: string
  role?: UserRole
}

export interface UpdateUserInput {
  name?: string
  phone?: string
  role?: UserRole
}

export interface ListUsersData {
  users: User[]
  total: number
  limit?: number
  offset?: number
  pages: number
  currentPage?: number
  itemsPerPage?: number
}

export interface CreatePropertyInput {
  title: string
  description?: string
  latitude: number
  longitude: number
  status?: PropertyStatus
  propertyType?: string
  listingType?: string
  bedrooms?: number | string
  bathrooms?: number | string
  parkingSpots?: number | string
  price?: number | string
  street?: string
  addressNumber?: string
  buildingName?: string
  apartmentNumber?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  postalCode?: string
  address?: string
  agentId?: string
  responsibleAgentId?: string
  images?: string[]
  imageUrls?: string[]
  videos?: string[]
  videoUrls?: string[]
  mediaFiles?: PropertyMediaFile[]
  contactPhone?: string
  contactWhatsApp?: string
}

export interface UpdateCompanyInput {
  name?: string
  email?: string
  phone?: string
  whatsapp?: string
  brandImageUrl?: string
  logoUrl?: string
  headquartersStreet?: string
  headquartersNumber?: string
  headquartersComplement?: string
  headquartersNeighborhood?: string
  headquartersCity?: string
  headquartersState?: string
  headquartersPostalCode?: string
  headquartersAddress?: string
}
